import {
  calculateBestFitPlanCash,
  calculatePremiumBaseline,
  BestFitCashRangeError,
  type BestFitCashTaskInput,
  type BestFitSubscriptionCashSource,
} from "@/lib/planning/best-fit-cash";
import {
  compareBestFitPlans,
  sortBestFitReliefOrder,
  sortBestFitReservationOrder,
  sortBestFitRoutes,
  tierRank,
  type BestFitPlanOrderingCandidate,
  type BestFitPlanTaskOrderingCandidate,
  type BestFitRouteOrderingCandidate,
} from "@/lib/planning/best-fit-ordering";
import {
  isResolvedBestFitTaskCandidateSet,
  isResolvedBestFitTaskCandidateSetFor,
  type ResolvedBestFitTaskCandidateSet,
} from "@/lib/planning/best-fit-candidates";
import { deriveAppliedUpgradeTriggers } from "@/lib/planning/workload-requirements";
import {
  compareRouteIdentities,
  normalizeConditionalReasonCodes,
  routeIdentityToCanonicalKey,
  sortConditionalAlternatives,
} from "@/lib/offerings/route-identity";
import type {
  AllocateNormalizedBestFitPlanInput,
  BestFitActiveTaskResult,
  BestFitAllocationPlan,
  BestFitApiRouteCandidate,
  BestFitConfirmedRouteCandidate,
  BestFitScenarioMicroUsd,
  BestFitSubscriptionResourceProfile,
  BestFitSubscriptionRouteCandidate,
  BestFitSubscriptionScenarioUsage,
  BestFitSubscriptionUsageLedger,
  BestFitTaskResult,
  NormalizedBestFitTask,
} from "@/types/best-fit";
import type { CostScenario, PlanningStrategy } from "@/types/domain";
import type {
  ConditionalAlternative,
  RouteIdentity,
  SubscriptionRouteIdentity,
} from "@/types/offerings";
import type { ApiCatalogOverride } from "@/types/pricing";
import { CONDITIONAL_REASON_CODES } from "@/types/offerings";
import {
  APPLIED_UPGRADE_TRIGGER_CODES,
  PLANNING_QUALITY_TIERS,
  type AppliedUpgradeTrigger,
  type PlanningQualityTier,
} from "@/types/workload";
import { z } from "zod";

const COST_SCENARIOS = ["low", "expected", "high"] as const satisfies readonly CostScenario[];
const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);
const STABLE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

interface ScenarioQuotaLedger {
  remainingMicrounits: bigint;
  overageMicrounitsUsed: bigint;
  overageCostMicroUsd: bigint;
}

type ResourceQuotaLedger = Record<CostScenario, ScenarioQuotaLedger>;
type QuotaLedgerMap = Map<string, ResourceQuotaLedger>;

interface TaskPolicy {
  appliedUpgradeTriggers: readonly AppliedUpgradeTrigger[];
  strategyTargetTier: PlanningQualityTier;
  routes: readonly BestFitConfirmedRouteCandidate[];
}

interface EvaluatedRoute extends BestFitRouteOrderingCandidate {
  candidate: BestFitConfirmedRouteCandidate;
  variableCashMicroUsd: BestFitScenarioMicroUsd;
  nextLedgers: QuotaLedgerMap;
}

interface InternalPlan {
  output: BestFitAllocationPlan;
  ordering: BestFitPlanOrderingCandidate;
  cashOverflow: boolean;
  exactCashMicroUsd: Record<CostScenario, bigint>;
}

export interface AllocateResolvedBestFitPlanInput {
  tasks: readonly ResolvedBestFitTaskCandidateSet[];
  strategy: PlanningStrategy;
  planningAsOf: string;
  pricingAsOf: string;
  incrementalCashBudgetMicroUsd: number;
  apiOverrides: readonly ApiCatalogOverride[];
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function routeKey(identity: RouteIdentity): string {
  return JSON.stringify(routeIdentityToCanonicalKey(identity));
}

function copyRouteIdentity(identity: RouteIdentity): RouteIdentity {
  return {
    providerId: identity.providerId,
    offeringId: identity.offeringId,
    resourceId: identity.resourceId,
  } as RouteIdentity;
}

function copyConditionalAlternatives(
  alternatives: readonly ConditionalAlternative[],
): ConditionalAlternative[] {
  return sortConditionalAlternatives(alternatives).map((alternative) => ({
    routeIdentity: {
      ...alternative.routeIdentity,
    },
    reasonCodes: [...normalizeConditionalReasonCodes(alternative.reasonCodes)] as [
      (typeof alternative.reasonCodes)[number],
      ...(typeof alternative.reasonCodes)[number][],
    ],
    fallbackRouteIdentity: {
      ...alternative.fallbackRouteIdentity,
    },
  }));
}

function safeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
}

function safeNumber(value: bigint, label: string): number {
  if (value < BigInt(0) || value > MAX_SAFE_INTEGER) {
    throw new Error(`${label} exceeds the safe integer range.`);
  }
  return Number(value);
}

interface ExactPlanCash {
  api: Record<CostScenario, bigint>;
  subscriptionFee: bigint;
  paidOverage: Record<CostScenario, bigint>;
  total: Record<CostScenario, bigint>;
}

function exactPlanCash(
  tasks: readonly BestFitCashTaskInput[],
  subscriptionCashSources: readonly BestFitSubscriptionCashSource[],
): ExactPlanCash {
  const api = { low: BigInt(0), expected: BigInt(0), high: BigInt(0) };
  const paidOverage = {
    low: BigInt(0),
    expected: BigInt(0),
    high: BigInt(0),
  };
  let subscriptionFee = BigInt(0);
  for (const task of tasks) {
    if (task.status !== "active" || task.apiCashMicroUsd === null) continue;
    const apiCash = task.apiCashMicroUsd;
    COST_SCENARIOS.forEach((scenario) => {
      api[scenario] += BigInt(apiCash[scenario]);
    });
  }
  for (const source of subscriptionCashSources) {
    if (source.ownership === "candidate-new") {
      subscriptionFee += BigInt(source.fullPlanPeriodFeeMicroUsd);
    }
    if (source.paidOverage.kind === "source-backed") {
      const overageCash = source.paidOverage.cashMicroUsd;
      COST_SCENARIOS.forEach((scenario) => {
        paidOverage[scenario] += BigInt(overageCash[scenario]);
      });
    }
  }
  const total = {
    low: api.low + subscriptionFee + paidOverage.low,
    expected: api.expected + subscriptionFee + paidOverage.expected,
    high: api.high + subscriptionFee + paidOverage.high,
  };
  return { api, subscriptionFee, paidOverage, total };
}

function boundedCashNumber(value: bigint): number {
  if (value < BigInt(0)) {
    throw new Error("Exact Best-fit cash cannot be negative.");
  }
  return value > MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : Number(value);
}

function boundedScenarioCash(
  value: Record<CostScenario, bigint>,
): BestFitScenarioMicroUsd {
  return {
    low: boundedCashNumber(value.low),
    expected: boundedCashNumber(value.expected),
    high: boundedCashNumber(value.high),
  };
}

function validIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1];
}

function assertRouteIdentity(identity: RouteIdentity): void {
  if (
    typeof identity !== "object" ||
    identity === null ||
    typeof identity.providerId !== "string" ||
    !STABLE_ID_PATTERN.test(identity.providerId) ||
    typeof identity.offeringId !== "string" ||
    !STABLE_ID_PATTERN.test(identity.offeringId) ||
    (identity.resourceId !== null &&
      (typeof identity.resourceId !== "string" ||
        !STABLE_ID_PATTERN.test(identity.resourceId)))
  ) {
    throw new Error("Best-fit route identities must use stable canonical IDs.");
  }
}

function assertScenarioRange(
  values: BestFitScenarioMicroUsd,
  label: string,
): void {
  COST_SCENARIOS.forEach((scenario) =>
    safeInteger(values[scenario], `${label} ${scenario}`),
  );
  if (values.low > values.expected || values.expected > values.high) {
    throw new Error(`${label} must be ordered Low <= Expected <= High.`);
  }
}

function canonicalResourceProfile(
  resource: BestFitSubscriptionResourceProfile,
): string {
  return JSON.stringify({
    routeIdentity: routeIdentityToCanonicalKey(resource.routeIdentity),
    ownership: resource.ownership,
    quotaUnit: resource.quotaUnit,
    availableMicrounits: resource.availableMicrounits,
    fullPlanPeriodFeeMicroUsd: resource.fullPlanPeriodFeeMicroUsd,
    overage: resource.overage,
  });
}

function assertNormalizedInput(input: AllocateNormalizedBestFitPlanInput): void {
  if (!z.iso.datetime().safeParse(input.planningAsOf).success) {
    throw new Error("Best-fit planningAsOf must be an ISO UTC date-time.");
  }
  if (!validIsoDate(input.pricingAsOf)) {
    throw new Error("Best-fit pricingAsOf must be a valid YYYY-MM-DD date.");
  }
  if (!["cost-saver", "balanced", "quality-first"].includes(input.strategy)) {
    throw new Error("Best-fit strategy is not supported.");
  }
  safeInteger(input.incrementalCashBudgetMicroUsd, "Incremental cash budget");

  const taskIds = new Set<string>();
  const indexes = new Set<number>();
  const resources = new Map<string, string>();
  for (const normalized of input.tasks) {
    if (
      normalized.task.id !== normalized.analysis.taskId ||
      normalized.task.id.length === 0
    ) {
      throw new Error("Best-fit task and analysis identities must match.");
    }
    safeInteger(normalized.originalIndex, "Original task index");
    if (taskIds.has(normalized.task.id) || indexes.has(normalized.originalIndex)) {
      throw new Error("Best-fit task IDs and original indexes must be unique.");
    }
    taskIds.add(normalized.task.id);
    indexes.add(normalized.originalIndex);

    const routeKeys = new Set<string>();
    const confirmedApiKeys = new Set<string>();
    for (const route of normalized.confirmedRoutes) {
      assertRouteIdentity(route.routeIdentity);
      const key = routeKey(route.routeIdentity);
      if (routeKeys.has(key)) {
        throw new Error("Confirmed route identities must be unique per task.");
      }
      routeKeys.add(key);
      if (!PLANNING_QUALITY_TIERS.includes(route.qualityTier)) {
        throw new Error("Confirmed route quality tier is invalid.");
      }
      if (route.mode === "api") {
        if (route.routeIdentity.resourceId !== null || route.modelId.length === 0) {
          throw new Error("Confirmed API routes require an API identity and model ID.");
        }
        assertScenarioRange(route.variableCashMicroUsd, "API route cash");
        confirmedApiKeys.add(key);
        continue;
      }
      if (
        route.routeIdentity.resourceId === null ||
        routeKey(route.resource.routeIdentity) !== key ||
        route.demandMicrounits.unit !== route.resource.quotaUnit
      ) {
        throw new Error("Subscription route, resource, and quota units must agree.");
      }
      safeInteger(route.resource.availableMicrounits, "Available quota");
      safeInteger(route.resource.fullPlanPeriodFeeMicroUsd, "Subscription fee");
      assertScenarioRange(route.demandMicrounits, "Subscription quota demand");
      if (route.demandMicrounits.low <= 0) {
        throw new Error("Confirmed subscription quota demand must be positive.");
      }
      if (route.resource.overage !== null) {
        const { coefficient, decimalScale } = route.resource.overage.rateUsdPerUnit;
        if (
          !/^[1-9]\d*$/.test(coefficient) ||
          !Number.isSafeInteger(decimalScale) ||
          decimalScale < 0 ||
          decimalScale > 400
        ) {
          throw new Error("Subscription overage rate must be an exact positive decimal.");
        }
        if (route.resource.overage.maxOverageMicrounits !== null) {
          safeInteger(
            route.resource.overage.maxOverageMicrounits,
            "Subscription overage cap",
          );
        }
      }
      const canonical = canonicalResourceProfile(route.resource);
      const previous = resources.get(key);
      if (previous !== undefined && previous !== canonical) {
        throw new Error("A subscription resource profile must be identical across tasks.");
      }
      resources.set(key, canonical);
    }

    copyConditionalAlternatives(normalized.conditionalAlternatives).forEach(
      (alternative) => {
        assertRouteIdentity(alternative.routeIdentity);
        assertRouteIdentity(alternative.fallbackRouteIdentity);
        if (
          alternative.routeIdentity.resourceId === null ||
          alternative.fallbackRouteIdentity.resourceId !== null ||
          !confirmedApiKeys.has(routeKey(alternative.fallbackRouteIdentity)) ||
          alternative.reasonCodes.length === 0 ||
          alternative.reasonCodes.some(
            (reason) => !CONDITIONAL_REASON_CODES.includes(reason),
          )
        ) {
          throw new Error(
            "Conditional routes require closed reasons and an exact confirmed API fallback.",
          );
        }
      },
    );
  }
  const sortedIndexes = [...indexes].sort((left, right) => left - right);
  sortedIndexes.forEach((value, index) => {
    if (value !== index) {
      throw new Error("Best-fit original task indexes must be contiguous from zero.");
    }
  });
}

function initialResourceLedger(
  resource: BestFitSubscriptionResourceProfile,
): ResourceQuotaLedger {
  const initial = () => ({
    remainingMicrounits: BigInt(resource.availableMicrounits),
    overageMicrounitsUsed: BigInt(0),
    overageCostMicroUsd: BigInt(0),
  });
  return { low: initial(), expected: initial(), high: initial() };
}

function copyQuotaLedgers(source: QuotaLedgerMap): QuotaLedgerMap {
  return new Map(
    [...source.entries()].map(([key, ledger]) => [
      key,
      {
        low: { ...ledger.low },
        expected: { ...ledger.expected },
        high: { ...ledger.high },
      },
    ]),
  );
}

function cumulativeOverageCost(
  overageMicrounits: bigint,
  resource: BestFitSubscriptionResourceProfile,
): bigint | null {
  const profile = resource.overage;
  if (profile === null) return overageMicrounits === BigInt(0) ? BigInt(0) : null;
  const coefficient = BigInt(profile.rateUsdPerUnit.coefficient);
  const denominator = BigInt(10) ** BigInt(profile.rateUsdPerUnit.decimalScale);
  const numerator = overageMicrounits * coefficient;
  const rounded = (numerator + denominator / BigInt(2)) / denominator;
  return rounded <= MAX_SAFE_INTEGER ? rounded : null;
}

function reserveSubscriptionCandidate(
  candidate: BestFitSubscriptionRouteCandidate,
  ledgers: QuotaLedgerMap,
): {
  ledgers: QuotaLedgerMap;
  overageDeltaMicroUsd: BestFitScenarioMicroUsd;
  overageDeltaMicrounits: BestFitScenarioMicroUsd;
} | null {
  const key = routeKey(candidate.routeIdentity);
  const current = ledgers.get(key) ?? initialResourceLedger(candidate.resource);
  const next = copyQuotaLedgers(ledgers);
  const nextResource: ResourceQuotaLedger = {
    low: { ...current.low },
    expected: { ...current.expected },
    high: { ...current.high },
  };
  const deltas = { low: 0, expected: 0, high: 0 };
  const overageMicrounitDeltas = { low: 0, expected: 0, high: 0 };

  for (const scenario of COST_SCENARIOS) {
    const state = current[scenario];
    const demand = BigInt(candidate.demandMicrounits[scenario]);
    const fromIncluded = demand < state.remainingMicrounits
      ? demand
      : state.remainingMicrounits;
    const deficit = demand - fromIncluded;
    const used = state.overageMicrounitsUsed + deficit;
    const nextRemaining = state.remainingMicrounits - fromIncluded;
    const includedUsed =
      BigInt(candidate.resource.availableMicrounits) - nextRemaining;
    const cap = candidate.resource.overage?.maxOverageMicrounits;
    if (
      (deficit > BigInt(0) && candidate.resource.overage === null) ||
      includedUsed < BigInt(0) ||
      used > MAX_SAFE_INTEGER ||
      includedUsed + used > MAX_SAFE_INTEGER ||
      (cap !== null && cap !== undefined && used > BigInt(cap))
    ) {
      return null;
    }
    const cost = cumulativeOverageCost(used, candidate.resource);
    if (cost === null || cost < state.overageCostMicroUsd) return null;
    const delta = cost - state.overageCostMicroUsd;
    deltas[scenario] = safeNumber(delta, `Subscription ${scenario} overage delta`);
    overageMicrounitDeltas[scenario] = safeNumber(
      deficit,
      `Subscription ${scenario} overage quota delta`,
    );
    nextResource[scenario] = {
      remainingMicrounits: nextRemaining,
      overageMicrounitsUsed: used,
      overageCostMicroUsd: cost,
    };
  }
  next.set(key, nextResource);
  return {
    ledgers: next,
    overageDeltaMicroUsd: deltas,
    overageDeltaMicrounits: overageMicrounitDeltas,
  };
}

function withOrderedTrigger(
  triggers: readonly AppliedUpgradeTrigger[],
  trigger: AppliedUpgradeTrigger,
): AppliedUpgradeTrigger[] {
  const set = new Set([...triggers, trigger]);
  return APPLIED_UPGRADE_TRIGGER_CODES.filter((value) => set.has(value));
}

function nextTier(tier: PlanningQualityTier): PlanningQualityTier {
  const index = tierRank(tier);
  return PLANNING_QUALITY_TIERS[Math.min(index + 1, PLANNING_QUALITY_TIERS.length - 1)];
}

function taskPolicy(
  normalized: NormalizedBestFitTask,
  strategy: PlanningStrategy,
  activatedCandidateResources: ReadonlySet<string>,
): TaskPolicy {
  const minimumRank = tierRank(normalized.analysis.requiredQualityTier);
  const aboveFloor = normalized.confirmedRoutes.filter(
    (route) => tierRank(route.qualityTier) >= minimumRank,
  );
  const activatedRoutes = aboveFloor.filter(
    (route) =>
      route.mode === "api" ||
      route.resource.ownership === "owned" ||
      activatedCandidateResources.has(routeKey(route.routeIdentity)),
  );
  const triggers = deriveAppliedUpgradeTriggers(normalized.task, normalized.analysis);
  const hasHeadroomTrigger = triggers.some(
    (trigger) => trigger !== "minimum-quality-requires-premium",
  );
  const strategyTargetTier =
    strategy === "quality-first" && hasHeadroomTrigger
      ? nextTier(normalized.analysis.requiredQualityTier)
      : normalized.analysis.requiredQualityTier;
  return {
    appliedUpgradeTriggers: triggers,
    strategyTargetTier,
    routes: activatedRoutes,
  };
}

function evaluateRoute(
  candidate: BestFitConfirmedRouteCandidate,
  ledgers: QuotaLedgerMap,
): EvaluatedRoute | null {
  if (candidate.mode === "api") {
    return {
      candidate,
      routeIdentity: candidate.routeIdentity,
      routeKind: "api",
      qualityTier: candidate.qualityTier,
      expectedVariableCashMicroUsd: candidate.variableCashMicroUsd.expected,
      variableCashMicroUsd: { ...candidate.variableCashMicroUsd },
      nextLedgers: ledgers,
    };
  }
  const reservation = reserveSubscriptionCandidate(candidate, ledgers);
  if (reservation === null) return null;
  const expectedOverageMicrounits =
    reservation.overageDeltaMicrounits.expected;
  return {
    candidate,
    routeIdentity: candidate.routeIdentity,
    routeKind:
      candidate.resource.ownership === "candidate-new"
        ? "new-subscription"
        : expectedOverageMicrounits > 0
          ? "owned-paid-overage"
          : "owned-within-included-quota",
    qualityTier: candidate.qualityTier,
    expectedVariableCashMicroUsd:
      reservation.overageDeltaMicroUsd.expected,
    variableCashMicroUsd: reservation.overageDeltaMicroUsd,
    nextLedgers: reservation.ledgers,
  };
}

function resultWhyEnough(
  normalized: NormalizedBestFitTask,
  selected: EvaluatedRoute,
  policy: TaskPolicy,
  strategy: PlanningStrategy,
): BestFitActiveTaskResult["whyEnough"] {
  if (policy.appliedUpgradeTriggers.includes("minimum-quality-requires-premium")) {
    return "minimum-quality-requires-premium";
  }
  if (
    strategy === "quality-first" &&
    tierRank(selected.qualityTier) >
      tierRank(normalized.analysis.requiredQualityTier) &&
    tierRank(policy.strategyTargetTier) > tierRank(normalized.analysis.requiredQualityTier)
  ) {
    return "quality-headroom-triggered";
  }
  if (
    strategy === "cost-saver" &&
    tierRank(selected.qualityTier) > tierRank(normalized.analysis.requiredQualityTier)
  ) {
    return "higher-tier-saved-cash";
  }
  return "minimum-quality-met";
}

function resultWhyNotPremium(
  normalized: NormalizedBestFitTask,
  selected: EvaluatedRoute,
  policy: TaskPolicy,
): BestFitActiveTaskResult["whyNotPremium"] {
  if (selected.qualityTier === "premium") return "premium-selected";
  if (
    !normalized.confirmedRoutes.some(
      (route) => route.mode === "api" && route.qualityTier === "premium",
    )
  ) {
    return "no-compatible-premium-api";
  }
  return policy.appliedUpgradeTriggers.length === 0
    ? "premium-not-triggered"
    : "lower-tier-sufficient";
}

function statusVectorEqual(left: InternalPlan, right: InternalPlan): boolean {
  return left.output.tasks.every(
    (task, index) => task.status === right.output.tasks[index]?.status,
  );
}

function buildPlan(
  input: AllocateNormalizedBestFitPlanInput,
  activatedCandidateResources: ReadonlySet<string>,
  forcedHeld: ReadonlySet<string>,
  forbiddenRoutes: ReadonlyMap<string, ReadonlySet<string>>,
): InternalPlan {
  const ordered = sortBestFitReservationOrder(
    input.tasks.map((normalized) => ({
      normalized,
      taskId: normalized.task.id,
      priority: normalized.task.priority,
      deadlineDate: normalized.task.deadlineDate,
      failureImpact: normalized.task.failureImpact,
      failureRisk: normalized.analysis.failureRisk,
      originalIndex: normalized.originalIndex,
    })),
  );
  const reservationOrderTaskIds = ordered.map(({ taskId }) => taskId);
  const reliefOrderTaskIds = sortBestFitReliefOrder(ordered).map(({ taskId }) => taskId);
  let ledgers: QuotaLedgerMap = new Map();
  const results = new Map<string, BestFitTaskResult>();
  const resources = new Map<string, BestFitSubscriptionResourceProfile>();

  input.tasks.forEach(({ confirmedRoutes }) =>
    confirmedRoutes.forEach((route) => {
      if (route.mode === "subscription") {
        resources.set(routeKey(route.routeIdentity), route.resource);
      }
    }),
  );

  for (const { normalized } of ordered) {
    const basePolicy = taskPolicy(
      normalized,
      input.strategy,
      activatedCandidateResources,
    );
    const alternatives = copyConditionalAlternatives(normalized.conditionalAlternatives);
    const forbidden = forbiddenRoutes.get(normalized.task.id) ?? new Set<string>();
    const allFeasible = basePolicy.routes
      .map((route) => evaluateRoute(route, ledgers))
      .filter((route): route is EvaluatedRoute => route !== null);
    const feasibleSubPremium = allFeasible.some(
      ({ qualityTier }) => qualityTier !== "premium",
    );
    const feasiblePremium = allFeasible.some(
      ({ qualityTier }) => qualityTier === "premium",
    );
    const compatibilityFallbackRequired =
      normalized.analysis.requiredQualityTier !== "premium" &&
      !feasibleSubPremium &&
      feasiblePremium;
    const policy: TaskPolicy = {
      ...basePolicy,
      appliedUpgradeTriggers:
        compatibilityFallbackRequired
          ? withOrderedTrigger(
              basePolicy.appliedUpgradeTriggers,
              "minimum-quality-requires-premium",
            )
          : basePolicy.appliedUpgradeTriggers,
    };
    if (forcedHeld.has(normalized.task.id)) {
      results.set(normalized.task.id, {
        status: "held",
        taskId: normalized.task.id,
        originalIndex: normalized.originalIndex,
        routeIdentity: null,
        strategyTargetTier: policy.strategyTargetTier,
        holdReason: "incremental-cash-budget-exhausted",
        appliedUpgradeTriggers: policy.appliedUpgradeTriggers,
        conditionalAlternatives: alternatives,
      });
      continue;
    }

    const premiumAllowed =
      normalized.analysis.requiredQualityTier === "premium" ||
      policy.appliedUpgradeTriggers.length > 0;
    const evaluated = allFeasible.filter(
      (route) =>
        !forbidden.has(routeKey(route.routeIdentity)) &&
        (route.qualityTier !== "premium" || premiumAllowed),
    );
    const sorted = sortBestFitRoutes(
      evaluated,
      input.strategy,
      policy.strategyTargetTier,
    );
    const selected = sorted[0];
    if (!selected) {
      results.set(normalized.task.id, {
        status: "infeasible",
        taskId: normalized.task.id,
        originalIndex: normalized.originalIndex,
        routeIdentity: null,
        strategyTargetTier: policy.strategyTargetTier,
        infeasibleReason: "no-compatible-confirmed-route",
        appliedUpgradeTriggers: policy.appliedUpgradeTriggers,
        conditionalAlternatives: alternatives,
      });
      continue;
    }
    ledgers = selected.nextLedgers;
    results.set(normalized.task.id, {
      status: "active",
      taskId: normalized.task.id,
      originalIndex: normalized.originalIndex,
      routeIdentity: copyRouteIdentity(selected.routeIdentity),
      modelId: selected.candidate.modelId,
      routeKind: selected.routeKind,
      qualityTier: selected.qualityTier,
      strategyTargetTier: policy.strategyTargetTier,
      variableCashMicroUsd: { ...selected.variableCashMicroUsd },
      appliedUpgradeTriggers: policy.appliedUpgradeTriggers,
      whyEnough: resultWhyEnough(normalized, selected, policy, input.strategy),
      whyNotPremium: resultWhyNotPremium(normalized, selected, policy),
      alternativeRouteIdentity:
        sorted[1] === undefined ? null : copyRouteIdentity(sorted[1].routeIdentity),
      conditionalAlternatives: alternatives,
    });
  }

  const orderedResults = [...results.values()].sort(
    (left, right) => left.originalIndex - right.originalIndex,
  );
  const activeSubscriptionKeys = new Set(
    orderedResults.flatMap((result) =>
      result.status === "active" && result.routeIdentity.resourceId !== null
        ? [routeKey(result.routeIdentity)]
        : [],
    ),
  );
  const taskIdsBySubscriptionKey = new Map<string, string[]>();
  orderedResults.forEach((result) => {
    if (result.status !== "active" || result.routeIdentity.resourceId === null) {
      return;
    }
    const key = routeKey(result.routeIdentity);
    const taskIds = taskIdsBySubscriptionKey.get(key) ?? [];
    taskIds.push(result.taskId);
    taskIdsBySubscriptionKey.set(key, taskIds);
  });
  const activeSubscriptionResources = [...activeSubscriptionKeys]
    .map((key) => {
      const resource = resources.get(key);
      if (!resource) {
        throw new Error("Every active subscription must retain its resource profile.");
      }
      return resource;
    })
    .sort((left, right) =>
      compareRouteIdentities(left.routeIdentity, right.routeIdentity),
    );
  const subscriptionUsageLedgers: BestFitSubscriptionUsageLedger[] =
    activeSubscriptionResources.map((resource) => {
      const key = routeKey(resource.routeIdentity);
      const ledger = ledgers.get(key);
      if (!ledger) {
        throw new Error("Every active subscription must retain its resource ledger.");
      }
      const usageFor = (scenario: CostScenario): BestFitSubscriptionScenarioUsage => {
        const state = ledger[scenario];
        const includedUsed =
          BigInt(resource.availableMicrounits) - state.remainingMicrounits;
        const totalDemand = includedUsed + state.overageMicrounitsUsed;
        if (includedUsed < BigInt(0)) {
          throw new Error("Subscription included quota usage cannot be negative.");
        }
        return {
          includedUsedMicrounits: safeNumber(
            includedUsed,
            `Subscription ${scenario} included quota usage`,
          ),
          remainingIncludedMicrounits: safeNumber(
            state.remainingMicrounits,
            `Subscription ${scenario} remaining included quota`,
          ),
          overageUsedMicrounits: safeNumber(
            state.overageMicrounitsUsed,
            `Subscription ${scenario} overage quota usage`,
          ),
          totalDemandMicrounits: safeNumber(
            totalDemand,
            `Subscription ${scenario} total quota demand`,
          ),
        };
      };
      return {
        routeIdentity: {
          ...resource.routeIdentity,
        },
        ownership: resource.ownership,
        quotaUnit: resource.quotaUnit,
        taskIds: [...(taskIdsBySubscriptionKey.get(key) ?? [])].sort(),
        availableMicrounits: resource.availableMicrounits,
        scenarios: {
          low: usageFor("low"),
          expected: usageFor("expected"),
          high: usageFor("high"),
        },
      };
    });
  const cashTasks: BestFitCashTaskInput[] = orderedResults.map((result) => {
    if (result.status !== "active") {
      return {
        taskId: result.taskId,
        status: result.status,
        routeIdentity: null,
        apiCashMicroUsd: null,
      };
    }
    return result.routeIdentity.resourceId === null
      ? {
          taskId: result.taskId,
          status: "active",
          routeIdentity: result.routeIdentity,
          apiCashMicroUsd: result.variableCashMicroUsd,
        }
      : {
          taskId: result.taskId,
          status: "active",
          routeIdentity: result.routeIdentity,
          apiCashMicroUsd: null,
        };
  });
  const subscriptionCashSources: BestFitSubscriptionCashSource[] =
    activeSubscriptionResources.map((activeResource) => {
      const key = routeKey(activeResource.routeIdentity);
      const resource = resources.get(key);
      const ledger = ledgers.get(key);
      if (!resource || !ledger) {
        throw new Error("Every active subscription must retain its resource ledger.");
      }
      const paidOverage =
        resource.overage === null
          ? ({ kind: "none" } as const)
          : ({
              kind: "source-backed" as const,
              cashMicroUsd: {
                low: safeNumber(ledger.low.overageCostMicroUsd, "Low overage cash"),
                expected: safeNumber(
                  ledger.expected.overageCostMicroUsd,
                  "Expected overage cash",
                ),
                high: safeNumber(ledger.high.overageCostMicroUsd, "High overage cash"),
              },
            } as const);
      return resource.ownership === "candidate-new"
        ? {
            routeIdentity: resource.routeIdentity,
            ownership: "candidate-new" as const,
            fullPlanPeriodFeeMicroUsd: resource.fullPlanPeriodFeeMicroUsd,
            paidOverage,
          }
        : {
            routeIdentity: resource.routeIdentity,
            ownership: "owned" as const,
            existingPlanPeriodFeeMicroUsd: 0,
            paidOverage,
          };
    });
  const exactCash = exactPlanCash(cashTasks, subscriptionCashSources);
  const scenarioOverflow = {
    low: exactCash.total.low > MAX_SAFE_INTEGER,
    expected: exactCash.total.expected > MAX_SAFE_INTEGER,
    high: exactCash.total.high > MAX_SAFE_INTEGER,
  };
  let cash: ReturnType<typeof calculateBestFitPlanCash> | null = null;
  if (!COST_SCENARIOS.some((scenario) => scenarioOverflow[scenario])) {
    try {
      cash = calculateBestFitPlanCash({
        tasks: cashTasks,
        subscriptionCashSources,
        incrementalCashBudgetMicroUsd: input.incrementalCashBudgetMicroUsd,
      });
    } catch (error) {
      if (!(error instanceof BestFitCashRangeError)) throw error;
    }
  }
  const activatedCandidateSubscriptions = orderedResults
    .flatMap((result) =>
      result.status === "active" && result.routeIdentity.resourceId !== null
        ? [result.routeIdentity]
        : [],
    )
    .filter(
      (route) =>
        resources.get(routeKey(route))?.ownership === "candidate-new",
    )
    .filter(
      (route, index, all) =>
        all.findIndex((candidate) => routeKey(candidate) === routeKey(route)) === index,
    )
    .sort(compareRouteIdentities) as SubscriptionRouteIdentity[];
  const premiumInputTasks = [...input.tasks]
    .sort((left, right) => left.originalIndex - right.originalIndex)
    .map((normalized) => {
      const result = results.get(normalized.task.id);
      if (!result) throw new Error("Best-fit result is missing a task.");
      return {
        taskId: normalized.task.id,
        status: result.status,
        candidates: normalized.confirmedRoutes
          .filter(
            (route): route is BestFitApiRouteCandidate =>
              route.mode === "api" && route.qualityTier === "premium",
          )
          .map((route) => ({
            compatibility: "compatible" as const,
            qualityTier: "premium" as const,
            routeIdentity: route.routeIdentity,
            expectedCashMicroUsd: route.variableCashMicroUsd.expected,
          })),
      };
    });
  let premium: ReturnType<typeof calculatePremiumBaseline> | null = null;
  if (!scenarioOverflow.expected) {
    try {
      premium = calculatePremiumBaseline({
        tasks: premiumInputTasks,
        selectedExpectedIncrementalCashMicroUsd: Number(
          exactCash.total.expected,
        ),
      });
    } catch (error) {
      if (!(error instanceof BestFitCashRangeError)) throw error;
    }
  }
  const totalCash = boundedScenarioCash(exactCash.total);
  const apiCash = cash?.apiCashMicroUsd ?? boundedScenarioCash(exactCash.api);
  const paidOverageCash =
    cash?.paidOverageCashMicroUsd ??
    boundedScenarioCash(exactCash.paidOverage);
  const budget = BigInt(input.incrementalCashBudgetMicroUsd);
  const output: BestFitAllocationPlan = {
    contractVersion: "best-fit-plan-v1",
    strategy: input.strategy,
    planningAsOf: input.planningAsOf,
    pricingAsOf: input.pricingAsOf,
    incrementalCashBudgetMicroUsd: input.incrementalCashBudgetMicroUsd,
    tasks: orderedResults,
    reservationOrderTaskIds,
    reliefOrderTaskIds,
    activatedSubscriptionRoutes: activatedCandidateSubscriptions,
    subscriptionUsageLedgers,
    cash: {
      lowMicroUsd: totalCash.low,
      expectedMicroUsd: totalCash.expected,
      highMicroUsd: totalCash.high,
      apiMicroUsd: apiCash,
      subscriptionFeeMicroUsd:
        cash?.newSubscriptionCommitmentMicroUsd ??
        boundedCashNumber(exactCash.subscriptionFee),
      paidOverageMicroUsd: paidOverageCash,
      scenarioOverflow,
    },
    expectedWithinBudget: exactCash.total.expected <= budget,
    highExceedsBudget: exactCash.total.high > budget,
    activeTaskCount: orderedResults.filter(({ status }) => status === "active").length,
    heldTaskCount: orderedResults.filter(({ status }) => status === "held").length,
    infeasibleTaskCount: orderedResults.filter(({ status }) => status === "infeasible").length,
    premiumBaseline: premium?.premiumBaseline?.tasks ?? null,
    spendComparison:
      premium === null ||
      premium.premiumBaseline === null ||
      premium.differenceMicroUsd === null ||
      premium.avoidedSpendMicroUsd === null ||
      premium.additionalSpendMicroUsd === null
        ? null
        : {
            premiumBaselineExpectedMicroUsd:
              premium.premiumBaseline.totalExpectedCashMicroUsd,
            selectedExpectedIncrementalCashMicroUsd:
              totalCash.expected,
            differenceMicroUsd: premium.differenceMicroUsd,
            avoidedSpendMicroUsd: premium.avoidedSpendMicroUsd,
            additionalSpendMicroUsd: premium.additionalSpendMicroUsd,
          },
    allocationMethod: "deterministic-add-one-subscription-heuristic",
  };

  const orderingTasks: BestFitPlanTaskOrderingCandidate[] = input.tasks.map(
    (normalized) => {
      const result = results.get(normalized.task.id);
      if (!result) throw new Error("Best-fit ordering result is missing a task.");
      return {
        taskId: normalized.task.id,
        priority: normalized.task.priority,
        deadlineDate: normalized.task.deadlineDate,
        failureImpact: normalized.task.failureImpact,
        failureRisk: normalized.analysis.failureRisk,
        originalIndex: normalized.originalIndex,
        status: result.status,
        targetQualityTier: result.strategyTargetTier,
        route:
          result.status === "active"
            ? {
                routeIdentity: result.routeIdentity,
                qualityTier: result.qualityTier,
                routeKind: result.routeKind,
                expectedVariableCashMicroUsd:
                  result.variableCashMicroUsd.expected,
              }
            : null,
      };
    },
  );
  return {
    output,
    ordering: {
      expectedWithinBudget: output.expectedWithinBudget,
      expectedIncrementalCashMicroUsd: output.cash.expectedMicroUsd,
      highIncrementalCashMicroUsd: output.cash.highMicroUsd,
      exactIncrementalCashMicroUsd: {
        expected: exactCash.total.expected,
        high: exactCash.total.high,
      },
      tasks: orderingTasks,
      activatedSubscriptionRoutes: output.activatedSubscriptionRoutes,
    },
    cashOverflow: scenarioOverflow.expected,
    exactCashMicroUsd: exactCash.total,
  };
}

function cloneForbidden(
  source: ReadonlyMap<string, ReadonlySet<string>>,
): Map<string, Set<string>> {
  return new Map(
    [...source.entries()].map(([taskId, routes]) => [taskId, new Set(routes)]),
  );
}

function buildBudgetAwarePlan(
  input: AllocateNormalizedBestFitPlanInput,
  activatedCandidateResources: ReadonlySet<string>,
): InternalPlan {
  const held = new Set<string>();
  let forbidden = new Map<string, Set<string>>();
  let current = buildPlan(input, activatedCandidateResources, held, forbidden);
  const maximumSteps =
    (input.tasks.length + 1) *
    input.tasks.reduce(
      (sum, task) => sum + task.confirmedRoutes.length + 1,
      0,
    );

  for (let step = 0; step < maximumSteps && !current.output.expectedWithinBudget; step += 1) {
    let reassigned = false;
    const reliefTasks = sortBestFitReliefOrder(
      input.tasks.map((normalized) => ({
        normalized,
        taskId: normalized.task.id,
        priority: normalized.task.priority,
        deadlineDate: normalized.task.deadlineDate,
        failureImpact: normalized.task.failureImpact,
        failureRisk: normalized.analysis.failureRisk,
        originalIndex: normalized.originalIndex,
      })),
    );
    for (const { normalized } of reliefTasks) {
      const candidateForbidden = cloneForbidden(forbidden);
      const routes = candidateForbidden.get(normalized.task.id) ?? new Set<string>();
      candidateForbidden.set(normalized.task.id, routes);

      let trial = current;
      for (
        let routeAttempt = 0;
        routeAttempt < normalized.confirmedRoutes.length;
        routeAttempt += 1
      ) {
        const trialResult = trial.output.tasks.find(
          ({ taskId }) => taskId === normalized.task.id,
        );
        if (!trialResult || trialResult.status !== "active") break;
        const selectedRouteKey = routeKey(trialResult.routeIdentity);
        if (routes.has(selectedRouteKey)) break;
        routes.add(selectedRouteKey);

        const candidate = buildPlan(
          input,
          activatedCandidateResources,
          held,
          candidateForbidden,
        );
        if (
          statusVectorEqual(candidate, current) &&
          candidate.exactCashMicroUsd.expected <
            current.exactCashMicroUsd.expected
        ) {
          current = candidate;
          forbidden = candidateForbidden;
          reassigned = true;
          break;
        }
        trial = candidate;
      }
      if (reassigned) break;
    }
    if (reassigned) continue;

    const toHold = reliefTasks.find(({ normalized }) =>
      current.output.tasks.some(
        (result) =>
          result.taskId === normalized.task.id && result.status === "active",
      ),
    );
    if (!toHold) break;
    held.add(toHold.normalized.task.id);
    forbidden = new Map();
    current = buildPlan(input, activatedCandidateResources, held, forbidden);
  }
  if (current.cashOverflow) {
    throw new BestFitCashRangeError(
      "Best-fit relief could not reduce aggregate cash to the safe range.",
    );
  }
  return current;
}

function candidateNewResourceKeys(
  tasks: readonly NormalizedBestFitTask[],
): string[] {
  return [
    ...new Set(
      tasks.flatMap(({ confirmedRoutes }) =>
        confirmedRoutes.flatMap((route) =>
          route.mode === "subscription" &&
          route.resource.ownership === "candidate-new"
            ? [routeKey(route.routeIdentity)]
            : [],
        ),
      ),
    ),
  ].sort();
}

function usedCandidateResourceKeys(
  plan: BestFitAllocationPlan,
  tasks: readonly NormalizedBestFitTask[],
): Set<string> {
  const candidateKeys = new Set(candidateNewResourceKeys(tasks));
  return new Set(
    plan.activatedSubscriptionRoutes
      .map(routeKey)
      .filter((key) => candidateKeys.has(key)),
  );
}

function pruneInactiveCandidateAlternatives(
  plan: InternalPlan,
  tasks: readonly NormalizedBestFitTask[],
  activeCandidateResources: ReadonlySet<string>,
): InternalPlan {
  const allCandidateResources = new Set(candidateNewResourceKeys(tasks));
  const nextTasks = plan.output.tasks.map((task) => {
    if (
      task.status !== "active" ||
      task.alternativeRouteIdentity === null
    ) {
      return task;
    }
    const alternativeKey = routeKey(task.alternativeRouteIdentity);
    return allCandidateResources.has(alternativeKey) &&
      !activeCandidateResources.has(alternativeKey)
      ? { ...task, alternativeRouteIdentity: null }
      : task;
  });
  return {
    output: { ...plan.output, tasks: nextTasks },
    ordering: plan.ordering,
    cashOverflow: plan.cashOverflow,
    exactCashMicroUsd: plan.exactCashMicroUsd,
  };
}

export function allocateNormalizedBestFitPlan(
  input: AllocateNormalizedBestFitPlanInput,
): BestFitAllocationPlan {
  assertNormalizedInput(input);
  const allCandidateResources = candidateNewResourceKeys(input.tasks);
  let activated = new Set<string>();
  let current = buildBudgetAwarePlan(input, activated);

  while (true) {
    let best: { plan: InternalPlan; activated: Set<string> } | null = null;
    for (const resourceKey of allCandidateResources) {
      if (activated.has(resourceKey)) continue;
      const proposed = new Set([...activated, resourceKey]);
      let plan: InternalPlan;
      try {
        plan = buildBudgetAwarePlan(input, proposed);
      } catch (error) {
        if (error instanceof BestFitCashRangeError) continue;
        throw error;
      }
      if (compareBestFitPlans(plan.ordering, current.ordering, input.strategy) >= 0) {
        continue;
      }
      const used = usedCandidateResourceKeys(plan.output, input.tasks);
      const rebuilt = buildBudgetAwarePlan(input, used);
      const normalizedPlan =
        compareBestFitPlans(rebuilt.ordering, current.ordering, input.strategy) < 0
          ? rebuilt
          : pruneInactiveCandidateAlternatives(plan, input.tasks, used);
      if (
        compareBestFitPlans(
          normalizedPlan.ordering,
          current.ordering,
          input.strategy,
        ) >= 0
      ) {
        continue;
      }
      if (
        best === null ||
        compareBestFitPlans(
          normalizedPlan.ordering,
          best.plan.ordering,
          input.strategy,
        ) < 0
      ) {
        best = { plan: normalizedPlan, activated: used };
      }
    }
    if (best === null) break;
    current = best.plan;
    activated = best.activated;
  }
  return deepFreeze(current.output);
}

export function allocateResolvedBestFitPlan(
  input: AllocateResolvedBestFitPlanInput,
): BestFitAllocationPlan {
  if (!Array.isArray(input.apiOverrides)) {
    throw new Error(
      "Best-fit allocation requires an explicit API catalog override array.",
    );
  }
  if (
    input.tasks.some(
      (task) =>
        !isResolvedBestFitTaskCandidateSet(task) ||
        !isResolvedBestFitTaskCandidateSetFor(task, {
          task: task.task,
          analysis: task.analysis,
          originalIndex: task.originalIndex,
          planningAsOf: input.planningAsOf,
          pricingAsOf: input.pricingAsOf,
          apiOverrides: input.apiOverrides,
        }),
    )
  ) {
    throw new Error("Best-fit allocation requires exact resolver-issued candidate sets.");
  }
  return allocateNormalizedBestFitPlan({
    tasks: input.tasks,
    strategy: input.strategy,
    planningAsOf: input.planningAsOf,
    pricingAsOf: input.pricingAsOf,
    incrementalCashBudgetMicroUsd: input.incrementalCashBudgetMicroUsd,
  });
}

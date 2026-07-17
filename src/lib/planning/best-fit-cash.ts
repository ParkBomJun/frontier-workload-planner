import {
  compareRouteIdentities,
  routeIdentityToCanonicalKey,
} from "@/lib/offerings/route-identity";
import type { CostScenario } from "@/types/domain";
import type {
  ApiRouteIdentity,
  RouteIdentity,
  SubscriptionRouteIdentity,
} from "@/types/offerings";

const COST_SCENARIOS = ["low", "expected", "high"] as const satisfies readonly CostScenario[];
const MAX_SAFE_MICRO_USD = BigInt(Number.MAX_SAFE_INTEGER);

export class BestFitCashRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BestFitCashRangeError";
  }
}

export type ScenarioCashMicroUsd = Readonly<Record<CostScenario, number>>;

export type BestFitCashTaskInput =
  | {
      taskId: string;
      status: "active";
      routeIdentity: ApiRouteIdentity;
      apiCashMicroUsd: ScenarioCashMicroUsd;
    }
  | {
      taskId: string;
      status: "active";
      routeIdentity: SubscriptionRouteIdentity;
      apiCashMicroUsd: null;
    }
  | {
      taskId: string;
      status: "held" | "infeasible";
      routeIdentity: null;
      apiCashMicroUsd: null;
    };

export type SourceBackedPaidOverageCash =
  | { kind: "none" }
  | {
      kind: "source-backed";
      cashMicroUsd: ScenarioCashMicroUsd;
    };

interface SubscriptionCashSourceBase {
  routeIdentity: SubscriptionRouteIdentity;
  paidOverage: SourceBackedPaidOverageCash;
}

export type BestFitSubscriptionCashSource =
  | (SubscriptionCashSourceBase & {
      ownership: "owned";
      existingPlanPeriodFeeMicroUsd: number;
    })
  | (SubscriptionCashSourceBase & {
      ownership: "candidate-new";
      fullPlanPeriodFeeMicroUsd: number;
    });

export interface CalculateBestFitPlanCashInput {
  tasks: readonly BestFitCashTaskInput[];
  subscriptionCashSources: readonly BestFitSubscriptionCashSource[];
  incrementalCashBudgetMicroUsd: number;
}

export interface BestFitPlanCash {
  apiCashMicroUsd: ScenarioCashMicroUsd;
  newSubscriptionCommitmentMicroUsd: number;
  paidOverageCashMicroUsd: ScenarioCashMicroUsd;
  totalIncrementalCashMicroUsd: ScenarioCashMicroUsd;
  activatedCandidateSubscriptionRoutes: readonly SubscriptionRouteIdentity[];
  expectedWithinBudget: boolean;
  highExceedsBudget: boolean;
}

export type PremiumApiBaselineCandidate =
  | {
      compatibility: "compatible";
      qualityTier: "premium";
      routeIdentity: ApiRouteIdentity;
      expectedCashMicroUsd: number;
    }
  | {
      compatibility: "incompatible";
      qualityTier: "premium";
      routeIdentity: ApiRouteIdentity;
      expectedCashMicroUsd: null;
    };

export interface PremiumBaselineTaskInput {
  taskId: string;
  status: "active" | "held" | "infeasible";
  candidates: readonly PremiumApiBaselineCandidate[];
}

export interface CalculatePremiumBaselineInput {
  tasks: readonly PremiumBaselineTaskInput[];
  selectedExpectedIncrementalCashMicroUsd: number;
}

export interface PremiumBaselineTaskSelection {
  taskId: string;
  routeIdentity: ApiRouteIdentity;
  expectedCashMicroUsd: number;
}

export interface PremiumBaselineResult {
  activeTaskIds: readonly string[];
  premiumBaseline: {
    tasks: readonly PremiumBaselineTaskSelection[];
    totalExpectedCashMicroUsd: number;
  } | null;
  differenceMicroUsd: number | null;
  avoidedSpendMicroUsd: number | null;
  additionalSpendMicroUsd: number | null;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function assertTaskId(value: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Best-fit cash task IDs must be non-empty strings.");
  }
}

function microUsd(value: number, label: string): bigint {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer micro-USD value.`);
  }
  return BigInt(value);
}

function safeMicroUsd(value: bigint, label: string): number {
  if (value < BigInt(0) || value > MAX_SAFE_MICRO_USD) {
    throw new BestFitCashRangeError(
      `${label} exceeds the safe micro-USD range.`,
    );
  }
  return Number(value);
}

function zeroScenarioBigInt(): Record<CostScenario, bigint> {
  return { low: BigInt(0), expected: BigInt(0), high: BigInt(0) };
}

function addScenarioCash(
  target: Record<CostScenario, bigint>,
  source: ScenarioCashMicroUsd,
  label: string,
): void {
  COST_SCENARIOS.forEach((scenario) => {
    target[scenario] += microUsd(source[scenario], `${label} ${scenario}`);
  });
}

function finalizeScenarioCash(
  source: Record<CostScenario, bigint>,
  label: string,
): ScenarioCashMicroUsd {
  return {
    low: safeMicroUsd(source.low, `${label} Low`),
    expected: safeMicroUsd(source.expected, `${label} Expected`),
    high: safeMicroUsd(source.high, `${label} High`),
  };
}

function isApiRoute(route: RouteIdentity): route is ApiRouteIdentity {
  return route.resourceId === null;
}

function isSubscriptionRoute(
  route: RouteIdentity,
): route is SubscriptionRouteIdentity {
  return typeof route.resourceId === "string" && route.resourceId.length > 0;
}

function routeKey(route: RouteIdentity): string {
  return JSON.stringify(routeIdentityToCanonicalKey(route));
}

function copySubscriptionRoute(
  route: SubscriptionRouteIdentity,
): SubscriptionRouteIdentity {
  return {
    providerId: route.providerId,
    offeringId: route.offeringId,
    resourceId: route.resourceId,
  };
}

export function calculateBestFitPlanCash(
  input: CalculateBestFitPlanCashInput,
): BestFitPlanCash {
  const budget = microUsd(
    input.incrementalCashBudgetMicroUsd,
    "Incremental cash budget",
  );
  const taskIds = new Set<string>();
  const activeSubscriptionKeys = new Set<string>();
  const apiCash = zeroScenarioBigInt();

  for (const task of input.tasks) {
    assertTaskId(task.taskId);
    if (taskIds.has(task.taskId)) {
      throw new Error("Best-fit cash task IDs must be unique.");
    }
    taskIds.add(task.taskId);

    if (task.status !== "active") {
      if (task.routeIdentity !== null || task.apiCashMicroUsd !== null) {
        throw new Error("Held and infeasible work cannot contribute plan cash.");
      }
      continue;
    }

    if (isApiRoute(task.routeIdentity)) {
      if (task.apiCashMicroUsd === null) {
        throw new Error("An active API route requires scenario API cash.");
      }
      addScenarioCash(apiCash, task.apiCashMicroUsd, `Task ${task.taskId} API cash`);
      continue;
    }
    if (!isSubscriptionRoute(task.routeIdentity) || task.apiCashMicroUsd !== null) {
      throw new Error("An active subscription route cannot carry API cash.");
    }
    activeSubscriptionKeys.add(routeKey(task.routeIdentity));
  }

  const sourcesByRoute = new Map<string, BestFitSubscriptionCashSource>();
  for (const source of input.subscriptionCashSources) {
    if (!isSubscriptionRoute(source.routeIdentity)) {
      throw new Error("Subscription cash sources require subscription route identities.");
    }
    const key = routeKey(source.routeIdentity);
    if (sourcesByRoute.has(key)) {
      throw new Error("Subscription cash source route identities must be unique.");
    }
    if (source.ownership === "candidate-new") {
      microUsd(source.fullPlanPeriodFeeMicroUsd, "New subscription fee");
    } else {
      microUsd(source.existingPlanPeriodFeeMicroUsd, "Existing subscription fee");
    }
    if (source.paidOverage.kind === "source-backed") {
      const overageCash = source.paidOverage.cashMicroUsd;
      COST_SCENARIOS.forEach((scenario) => {
        microUsd(
          overageCash[scenario],
          `Paid overage ${scenario}`,
        );
      });
    }
    sourcesByRoute.set(key, source);
  }

  const fee = { value: BigInt(0) };
  const paidOverage = zeroScenarioBigInt();
  const activatedCandidateSubscriptionRoutes: SubscriptionRouteIdentity[] = [];
  for (const key of activeSubscriptionKeys) {
    const source = sourcesByRoute.get(key);
    if (!source) {
      throw new Error("Every active subscription route requires one cash source.");
    }
    if (source.ownership === "candidate-new") {
      fee.value += microUsd(
        source.fullPlanPeriodFeeMicroUsd,
        "New subscription fee",
      );
      activatedCandidateSubscriptionRoutes.push(
        copySubscriptionRoute(source.routeIdentity),
      );
    }
    if (source.paidOverage.kind === "source-backed") {
      addScenarioCash(
        paidOverage,
        source.paidOverage.cashMicroUsd,
        "Paid overage cash",
      );
    }
  }

  activatedCandidateSubscriptionRoutes.sort(compareRouteIdentities);
  const total = zeroScenarioBigInt();
  COST_SCENARIOS.forEach((scenario) => {
    total[scenario] = apiCash[scenario] + fee.value + paidOverage[scenario];
  });

  const finalizedApiCash = finalizeScenarioCash(apiCash, "API cash");
  const finalizedPaidOverage = finalizeScenarioCash(
    paidOverage,
    "Paid overage cash",
  );
  const finalizedTotal = finalizeScenarioCash(total, "Incremental cash");
  const finalizedFee = safeMicroUsd(
    fee.value,
    "New subscription commitment",
  );

  return deepFreeze({
    apiCashMicroUsd: finalizedApiCash,
    newSubscriptionCommitmentMicroUsd: finalizedFee,
    paidOverageCashMicroUsd: finalizedPaidOverage,
    totalIncrementalCashMicroUsd: finalizedTotal,
    activatedCandidateSubscriptionRoutes,
    expectedWithinBudget: BigInt(finalizedTotal.expected) <= budget,
    highExceedsBudget: BigInt(finalizedTotal.high) > budget,
  });
}

function copyApiRoute(route: ApiRouteIdentity): ApiRouteIdentity {
  return {
    providerId: route.providerId,
    offeringId: route.offeringId,
    resourceId: null,
  };
}

function comparePremiumCandidates(
  left: Extract<PremiumApiBaselineCandidate, { compatibility: "compatible" }>,
  right: Extract<PremiumApiBaselineCandidate, { compatibility: "compatible" }>,
): number {
  if (left.expectedCashMicroUsd !== right.expectedCashMicroUsd) {
    return left.expectedCashMicroUsd < right.expectedCashMicroUsd ? -1 : 1;
  }
  return compareRouteIdentities(left.routeIdentity, right.routeIdentity);
}

export function calculatePremiumBaseline(
  input: CalculatePremiumBaselineInput,
): PremiumBaselineResult {
  const selectedExpected = microUsd(
    input.selectedExpectedIncrementalCashMicroUsd,
    "Selected Expected incremental cash",
  );
  const taskIds = new Set<string>();
  const activeTaskIds: string[] = [];
  for (const task of input.tasks) {
    assertTaskId(task.taskId);
    if (taskIds.has(task.taskId)) {
      throw new Error("Premium baseline task IDs must be unique.");
    }
    taskIds.add(task.taskId);
    if (task.status === "active") activeTaskIds.push(task.taskId);
  }
  const selections: PremiumBaselineTaskSelection[] = [];
  let baselineTotal = BigInt(0);

  for (const task of input.tasks) {
    if (task.status !== "active") continue;

    const compatible = task.candidates.filter(
      (
        candidate,
      ): candidate is Extract<
        PremiumApiBaselineCandidate,
        { compatibility: "compatible" }
      > => candidate.compatibility === "compatible",
    );
    const candidateKeys = new Set<string>();
    for (const candidate of compatible) {
      if (!isApiRoute(candidate.routeIdentity)) {
        throw new Error("Premium baseline candidates must be API routes.");
      }
      microUsd(candidate.expectedCashMicroUsd, "Premium baseline candidate cash");
      const key = routeKey(candidate.routeIdentity);
      if (candidateKeys.has(key)) {
        throw new Error("Premium baseline candidate routes must be unique per task.");
      }
      candidateKeys.add(key);
    }
    compatible.sort(comparePremiumCandidates);
    const selected = compatible[0];
    if (!selected) {
      return deepFreeze({
        activeTaskIds,
        premiumBaseline: null,
        differenceMicroUsd: null,
        avoidedSpendMicroUsd: null,
        additionalSpendMicroUsd: null,
      });
    }
    baselineTotal += microUsd(
      selected.expectedCashMicroUsd,
      "Premium baseline task cash",
    );
    selections.push({
      taskId: task.taskId,
      routeIdentity: copyApiRoute(selected.routeIdentity),
      expectedCashMicroUsd: selected.expectedCashMicroUsd,
    });
  }

  if (activeTaskIds.length === 0) {
    return deepFreeze({
      activeTaskIds,
      premiumBaseline: null,
      differenceMicroUsd: null,
      avoidedSpendMicroUsd: null,
      additionalSpendMicroUsd: null,
    });
  }

  const finalizedBaseline = safeMicroUsd(
    baselineTotal,
    "Premium baseline Expected cash",
  );
  const difference = baselineTotal - selectedExpected;
  const magnitude = difference < BigInt(0) ? -difference : difference;
  const differenceNumber = Number(difference);
  const magnitudeNumber = safeMicroUsd(magnitude, "Premium baseline difference");

  return deepFreeze({
    activeTaskIds,
    premiumBaseline: {
      tasks: selections,
      totalExpectedCashMicroUsd: finalizedBaseline,
    },
    differenceMicroUsd: differenceNumber,
    avoidedSpendMicroUsd: difference >= BigInt(0) ? magnitudeNumber : 0,
    additionalSpendMicroUsd: difference < BigInt(0) ? magnitudeNumber : 0,
  });
}

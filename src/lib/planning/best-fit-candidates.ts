import { resolveAllApiCatalogEntries } from "@/lib/offerings/provider-catalog-adapter";
import {
  isResolverIssuedOfferingEligibilityResultFor,
  resolveOfferingEligibility,
} from "@/lib/offerings/eligibility";
import {
  compareRouteIdentities,
  normalizeConditionalReasonCodes,
} from "@/lib/offerings/route-identity";
import { evaluateApiOfferingCost } from "@/lib/calculation/evaluate-api-offering";
import {
  COST_SCENARIOS,
  invocationTokensForScenario,
} from "@/lib/calculation/invocation-feasibility";
import {
  issuedQuotaDemandMicrounitsFor,
  estimateQuotaDemand,
} from "@/lib/subscriptions/quota-demand";
import { toSourceSubscriptionMicrounits } from "@/lib/subscriptions/fixed-decimal";
import { resolvePaidOverage } from "@/lib/subscriptions/overage-resolver";
import {
  upsertApiCatalogOverride,
  validateApiCatalogOverride,
} from "@/lib/offerings/catalog-overrides";
import {
  isResolverIssuedSubscriptionResourceForPlanningAsOf,
  isResolverIssuedSubscriptionResourceResolution,
} from "@/lib/subscriptions/resource-resolver";
import { toOfferingEligibilityRequirement } from "@/lib/planning/workload-requirements";
import type { TaskAnalysis, TaskInput } from "@/types/domain";
import type {
  BestFitConfirmedRouteCandidate,
  BestFitSubscriptionRouteCandidate,
  NormalizedBestFitTask,
} from "@/types/best-fit";
import type {
  ConditionalReasonCode,
  OfferingEligibilityResult,
  RouteIdentity,
} from "@/types/offerings";
import type { ResolvedSubscriptionResource } from "@/types/subscriptions";
import type { SubscriptionResourceResolution } from "@/types/subscriptions";
import type { ApiCatalogOverride } from "@/types/pricing";
import { z } from "zod";

const issuedTaskCandidateSets = new WeakSet<object>();
const candidateSetKeys = new WeakMap<object, string>();
const issuedTaskOverrideKeys = new WeakMap<object, string>();
const emptyApiOverrideKey = JSON.stringify([]);
const planningQualityRank = { economy: 0, balanced: 1, premium: 2 } as const;

export interface BestFitExcludedRoute {
  routeIdentity: RouteIdentity;
  status: "conditional" | "ineligible" | "invalid";
  reasonCodes: readonly string[];
}

export interface BestFitSubscriptionCandidateInput {
  resource: ResolvedSubscriptionResource;
  resolution: Exclude<SubscriptionResourceResolution, { status: "invalid" }>;
  eligibility: OfferingEligibilityResult;
}

export interface ResolvedBestFitTaskCandidateSet extends NormalizedBestFitTask {
  excludedRoutes: readonly BestFitExcludedRoute[];
}

export interface ResolveBestFitTaskCandidatesInput {
  task: TaskInput;
  analysis: TaskAnalysis;
  originalIndex: number;
  planningAsOf: string;
  pricingAsOf: string;
  subscriptions?: readonly BestFitSubscriptionCandidateInput[];
  apiOverrides?: readonly ApiCatalogOverride[];
}

interface NormalizedApiOverrides {
  byTarget: ReadonlyMap<string, ApiCatalogOverride>;
  key: string;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function overrideTargetKey(target: ApiCatalogOverride["target"]): string {
  return JSON.stringify([
    target.registryId,
    target.registryVersion,
    target.entryId,
  ]);
}

function normalizeApiOverrides(
  values: readonly ApiCatalogOverride[] | undefined,
): NormalizedApiOverrides {
  let normalized: readonly ApiCatalogOverride[] = [];
  const targets = new Set<string>();

  for (const value of values ?? []) {
    const validated = validateApiCatalogOverride(value);
    if (!validated.ok) {
      throw new Error(
        `Best-fit API catalog override is invalid: ${validated.reasonCode}.`,
      );
    }
    const targetKey = overrideTargetKey(validated.override.target);
    if (targets.has(targetKey)) {
      throw new Error(
        "Best-fit API catalog overrides require one value per catalog target.",
      );
    }
    targets.add(targetKey);
    const mutation = upsertApiCatalogOverride(normalized, validated.override);
    if (!mutation.ok) {
      throw new Error(
        `Best-fit API catalog override is invalid: ${mutation.reasonCode}.`,
      );
    }
    normalized = mutation.overrides;
  }

  const byTarget = new Map(
    normalized.map((override) => [
      overrideTargetKey(override.target),
      override,
    ]),
  );
  return {
    byTarget,
    key: JSON.stringify(normalized),
  };
}

function baseInputKey(input: ResolveBestFitTaskCandidatesInput): string {
  return JSON.stringify({
    taskId: input.task.id,
    analysisTaskId: input.analysis.taskId,
    originalIndex: input.originalIndex,
    planningAsOf: input.planningAsOf,
    pricingAsOf: input.pricingAsOf,
  });
}

function inputKey(
  input: ResolveBestFitTaskCandidatesInput,
  overrideKey: string,
): string {
  return JSON.stringify([baseInputKey(input), overrideKey]);
}

function issueTaskCandidateSet(
  value: ResolvedBestFitTaskCandidateSet,
  input: ResolveBestFitTaskCandidatesInput,
  overrideKey: string,
): ResolvedBestFitTaskCandidateSet {
  const frozen = deepFreeze(value);
  issuedTaskCandidateSets.add(frozen);
  candidateSetKeys.set(frozen, inputKey(input, overrideKey));
  issuedTaskOverrideKeys.set(frozen.task, overrideKey);
  return frozen;
}

export function isResolvedBestFitTaskCandidateSet(
  value: unknown,
): value is ResolvedBestFitTaskCandidateSet {
  return (
    typeof value === "object" &&
    value !== null &&
    issuedTaskCandidateSets.has(value)
  );
}

export function isResolvedBestFitTaskCandidateSetFor(
  value: unknown,
  input: ResolveBestFitTaskCandidatesInput,
): value is ResolvedBestFitTaskCandidateSet {
  if (!isResolvedBestFitTaskCandidateSet(value)) return false;
  try {
    const overrideKey =
      input.apiOverrides === undefined
        ? (issuedTaskOverrideKeys.get(input.task) ?? emptyApiOverrideKey)
        : normalizeApiOverrides(input.apiOverrides).key;
    return candidateSetKeys.get(value) === inputKey(input, overrideKey);
  } catch {
    return false;
  }
}

function safeScenarioValues(values: readonly number[]): boolean {
  return values.every(
    (value) => Number.isSafeInteger(value) && value >= 0,
  );
}

function routeKey(identity: RouteIdentity): string {
  return JSON.stringify([
    identity.providerId,
    identity.offeringId,
    identity.resourceId,
  ]);
}

function apiCandidates(
  analysis: TaskAnalysis,
  pricingAsOf: string,
  overridesByTarget: ReadonlyMap<string, ApiCatalogOverride>,
): {
  confirmed: BestFitConfirmedRouteCandidate[];
  excluded: BestFitExcludedRoute[];
} {
  const requirement = toOfferingEligibilityRequirement(
    analysis,
    COST_SCENARIOS.map((scenario) => ({
      scenario,
      ...invocationTokensForScenario(analysis, scenario),
    })),
  );
  const confirmed: BestFitConfirmedRouteCandidate[] = [];
  const excluded: BestFitExcludedRoute[] = [];

  for (const entry of resolveAllApiCatalogEntries()) {
    const override = overridesByTarget.get(
      overrideTargetKey(entry.model.registryReference),
    );
    const pricing = evaluateApiOfferingCost({
      providerId: entry.legacyReference.providerId,
      tier: entry.legacyReference.tier,
      analysis,
      pricingAsOf,
      ...(override === undefined ? {} : { override }),
    });
    const effectivePlanningTier =
      pricing.pricing.status === "resolved"
        ? pricing.pricing.effectiveValue.planningTier
        : entry.planningTier;
    const eligibilityRequirement = {
      ...requirement,
      minimumQualityTier: "economy" as const,
    };
    const eligibility = resolveOfferingEligibility(
      entry.offering,
      new Map([[entry.model.id, entry.model]]),
      eligibilityRequirement,
    );
    const belowMinimumQuality =
      planningQualityRank[effectivePlanningTier] <
      planningQualityRank[requirement.minimumQualityTier];

    if (
      !belowMinimumQuality &&
      eligibility.status === "eligible" &&
      pricing.status === "priced"
    ) {
      if (
        eligibility.providerId !== pricing.routeIdentity.providerId ||
        eligibility.offeringId !== pricing.routeIdentity.offeringId ||
        eligibility.modelId !== pricing.modelId ||
        !safeScenarioValues(Object.values(pricing.scenarioCostMicroUsd))
      ) {
        throw new Error("Eligible API route identity and priced workload must match.");
      }
      confirmed.push({
        mode: "api",
        routeIdentity: pricing.routeIdentity,
        qualityTier: effectivePlanningTier,
        modelId: pricing.modelId,
        variableCashMicroUsd: { ...pricing.scenarioCostMicroUsd },
      });
      continue;
    }

    const reasonCodes = belowMinimumQuality
      ? (["below-minimum-quality"] as const)
      : eligibility.status === "conditional"
        ? eligibility.reasonCodes
        : eligibility.status === "ineligible"
          ? eligibility.reasonCodes
          : pricing.status === "conditional"
            ? [pricing.pricing.reasonCode]
            : pricing.status === "ineligible"
              ? [pricing.reasonCode]
              : pricing.status === "invalid"
                ? [pricing.reasonCode]
                : ["api-route-not-confirmed"];
    excluded.push({
      routeIdentity: entry.routeIdentity,
      status:
        belowMinimumQuality
          ? "ineligible"
          : eligibility.status === "conditional" || pricing.status === "conditional"
          ? "conditional"
          : eligibility.status === "ineligible" || pricing.status === "ineligible"
            ? "ineligible"
            : "invalid",
      reasonCodes: [...reasonCodes],
    });
  }
  return { confirmed, excluded };
}

function quotaAvailableUnits(resource: ResolvedSubscriptionResource): number | null {
  if (resource.quota.kind === "metered") return resource.quota.remaining.value;
  if (resource.quota.kind === "initial-capacity") {
    return resource.quota.availableOnActivation.value;
  }
  return null;
}

function exactDecimalRate(value: number): {
  coefficient: string;
  decimalScale: number;
} | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const match = value
    .toString()
    .toLowerCase()
    .match(/^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/);
  if (!match) return null;
  const fractional = match[2] ?? "";
  const exponent = Number(match[3] ?? "0");
  if (!Number.isSafeInteger(exponent)) return null;
  let coefficient = BigInt(`${match[1]}${fractional}`);
  let decimalScale = fractional.length - exponent;
  if (decimalScale < 0) {
    coefficient *= BigInt(10) ** BigInt(-decimalScale);
    decimalScale = 0;
  }
  if (coefficient <= BigInt(0) || decimalScale > 400) return null;
  return { coefficient: coefficient.toString(), decimalScale };
}

function subscriptionCandidate(
  input: BestFitSubscriptionCandidateInput,
  analysis: TaskAnalysis,
  planningAsOf: string,
): { candidate: BestFitSubscriptionRouteCandidate | null; exclusion: BestFitExcludedRoute | null } {
  const { resource, eligibility } = input;
  const routeIdentity = {
    providerId: resource.offeringRef.providerId,
    offeringId: resource.offeringRef.offeringId,
    resourceId: resource.id,
  } as const;
  const requirement = toOfferingEligibilityRequirement(
    analysis,
    COST_SCENARIOS.map((scenario) => ({
      scenario,
      ...invocationTokensForScenario(analysis, scenario),
    })),
  );
  if (
    !isResolverIssuedSubscriptionResourceForPlanningAsOf(
      resource,
      planningAsOf,
    ) ||
    !isResolverIssuedSubscriptionResourceResolution(input.resolution) ||
    input.resolution.resource !== resource ||
    !isResolverIssuedOfferingEligibilityResultFor(
      eligibility,
      resource.offeringRef.providerId,
      resource.offeringRef.offeringId,
      requirement,
    )
  ) {
    throw new Error(
      "Subscription candidates require a resolver-issued resource and matching eligibility.",
    );
  }
  if (resource.availability.status === "unavailable") {
    return {
      candidate: null,
      exclusion: {
        routeIdentity,
        status: "ineligible",
        reasonCodes: ["resource-unavailable"],
      },
    };
  }
  if (eligibility.status === "ineligible") {
    return {
      candidate: null,
      exclusion: {
        routeIdentity,
        status: "ineligible",
        reasonCodes: [...eligibility.reasonCodes],
      },
    };
  }
  const conditionalReasons: ConditionalReasonCode[] = [
    ...(input.resolution.status === "conditional"
      ? input.resolution.reasonCodes
      : []),
    ...(eligibility.status === "conditional" ? eligibility.reasonCodes : []),
    ...(resource.availability.status === "uncertain"
      ? (["availability-uncertain"] as const)
      : []),
  ];
  if (conditionalReasons.length > 0) {
    return {
      candidate: null,
      exclusion: {
        routeIdentity,
        status: "conditional",
        reasonCodes: [...normalizeConditionalReasonCodes(conditionalReasons)],
      },
    };
  }
  if (eligibility.status !== "eligible") {
    throw new Error("Resolved subscription eligibility did not close to eligible.");
  }

  const demand = estimateQuotaDemand({
    quota: resource.quota,
    analysis,
    evidenceSubject: {
      providerId: resource.offeringRef.providerId,
      subjectId: resource.id,
    },
  });
  const exactDemand = issuedQuotaDemandMicrounitsFor(
    demand,
    resource.quota,
    analysis,
    {
      providerId: resource.offeringRef.providerId,
      subjectId: resource.id,
    },
  );
  const availableUnits = quotaAvailableUnits(resource);
  if (
    demand.status !== "known" ||
    demand.confidence !== "provider-published" ||
    exactDemand === null ||
    availableUnits === null ||
    resource.quota.kind === "calibrated" ||
    resource.quota.kind === "opaque"
  ) {
    const reasons: ConditionalReasonCode[] =
      demand.status === "known" && demand.confidence === "user-observed"
        ? ["consumption-user-observed"]
        : ["profile-unverified"];
    return {
      candidate: null,
      exclusion: {
        routeIdentity,
        status: "conditional",
        reasonCodes: reasons,
      },
    };
  }

  const availableMicrounits = toSourceSubscriptionMicrounits(availableUnits);
  const fullPlanPeriodFeeMicroUsd =
    resource.ownership === "candidate-new"
      ? toSourceSubscriptionMicrounits(resource.commitment.feeUsd)
      : 0;
  const overageProbe =
    resource.overage.kind === "paid" &&
    (resource.overage.maxOverageUnits === undefined ||
      resource.overage.maxOverageUnits > 0)
      ? resolvePaidOverage({
          policy: resource.overage,
          quotaKind: resource.quota.kind,
          quotaUnit: resource.quota.unit,
          routeIdentity,
          planningAsOf,
          deficitUnits: 0.000001,
          overageUnitsAlreadyUsed: 0,
          exactMicrounits: { deficit: 1, alreadyUsed: 0 },
        })
      : null;
  const verifiedPaidOverage =
    resource.overage.kind === "paid" && overageProbe?.status === "covered"
      ? resource.overage
      : null;
  const rateUsdPerUnit =
    verifiedPaidOverage === null
      ? null
      : exactDecimalRate(verifiedPaidOverage.usdPerUnit);
  const maxOverageMicrounits =
    verifiedPaidOverage !== null &&
    verifiedPaidOverage.maxOverageUnits !== undefined
      ? toSourceSubscriptionMicrounits(verifiedPaidOverage.maxOverageUnits)
      : null;
  if (
    availableMicrounits === null ||
    fullPlanPeriodFeeMicroUsd === null ||
    (verifiedPaidOverage !== null && rateUsdPerUnit === null) ||
    (verifiedPaidOverage !== null &&
      verifiedPaidOverage.maxOverageUnits !== undefined &&
      maxOverageMicrounits === null)
  ) {
    throw new Error("Resolved subscription cash or quota exceeds fixed-decimal bounds.");
  }

  return {
    candidate: {
      mode: "subscription",
      routeIdentity,
      qualityTier: eligibility.qualityTier,
      modelId: eligibility.modelId,
      resource: {
        routeIdentity,
        ownership: resource.ownership,
        quotaUnit: resource.quota.unit,
        availableMicrounits,
        fullPlanPeriodFeeMicroUsd,
        overage:
          verifiedPaidOverage !== null
            ? {
                rateUsdPerUnit: rateUsdPerUnit!,
                maxOverageMicrounits,
              }
            : null,
      },
      demandMicrounits: {
        unit: resource.quota.unit,
        low: exactDemand.low,
        expected: exactDemand.expected,
        high: exactDemand.high,
      },
    },
    exclusion: null,
  };
}

export function resolveBestFitTaskCandidates(
  input: ResolveBestFitTaskCandidatesInput,
): ResolvedBestFitTaskCandidateSet {
  if (!z.iso.datetime().safeParse(input.planningAsOf).success) {
    throw new Error("Best-fit candidate planningAsOf must be an ISO UTC date-time.");
  }
  if (
    input.task.id !== input.analysis.taskId ||
    !Number.isSafeInteger(input.originalIndex) ||
    input.originalIndex < 0
  ) {
    throw new Error("Best-fit candidate resolution requires matching task identity and index.");
  }
  const apiOverrides = normalizeApiOverrides(input.apiOverrides);
  const api = apiCandidates(
    input.analysis,
    input.pricingAsOf,
    apiOverrides.byTarget,
  );
  const subscription = (input.subscriptions ?? []).map((candidateInput) =>
    subscriptionCandidate(candidateInput, input.analysis, input.planningAsOf),
  );
  const confirmedRoutes = [
    ...api.confirmed,
    ...subscription.flatMap(({ candidate }) =>
      candidate === null ? [] : [candidate],
    ),
  ].sort((left, right) =>
    compareRouteIdentities(left.routeIdentity, right.routeIdentity),
  );
  const keys = new Set<string>();
  confirmedRoutes.forEach(({ routeIdentity }) => {
    const key = routeKey(routeIdentity);
    if (keys.has(key)) throw new Error("Best-fit confirmed route identities must be unique.");
    keys.add(key);
  });

  return issueTaskCandidateSet(
    {
      task: { ...input.task },
      analysis: {
        ...input.analysis,
        requiredCapabilities: [...input.analysis.requiredCapabilities],
        upgradeConditions: [...input.analysis.upgradeConditions],
        riskFactors: [...input.analysis.riskFactors],
      },
      originalIndex: input.originalIndex,
      confirmedRoutes,
      conditionalAlternatives: [],
      excludedRoutes: [
        ...api.excluded,
        ...subscription.flatMap(({ exclusion }) =>
          exclusion === null ? [] : [exclusion],
        ),
      ].sort((left, right) =>
        compareRouteIdentities(left.routeIdentity, right.routeIdentity),
      ),
    },
    input,
    apiOverrides.key,
  );
}

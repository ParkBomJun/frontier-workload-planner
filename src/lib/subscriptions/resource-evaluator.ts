import { normalizeConditionalReasonCodes } from "@/lib/offerings/route-identity";
import { isResolverIssuedOfferingEligibilityResultFor } from "@/lib/offerings/eligibility";
import {
  COST_SCENARIOS,
  invocationTokensForScenario,
} from "@/lib/calculation/invocation-feasibility";
import { toOfferingEligibilityRequirement } from "@/lib/planning/workload-requirements";
import type { TaskAnalysis } from "@/types/domain";
import type {
  ConditionalReasonCode,
  OfferingEligibilityResult,
  SubscriptionRouteIdentity,
} from "@/types/offerings";
import type { ApiOfferingCostEvaluation } from "@/types/pricing";
import type {
  DerivedSubscriptionQuotaLedger,
  ResolvedSubscriptionResource,
  SubscriptionResourceEvaluation,
  SubscriptionResourceResolution,
} from "@/types/subscriptions";

import {
  buildSubscriptionCommitmentLedger,
} from "./commitment-ledger";
import { resolveConditionalApiFallback } from "./fallback-resolver";
import { estimateQuotaDemand } from "./quota-demand";
import { reserveSubscriptionQuota } from "./quota-ledger";
import {
  isResolverIssuedSubscriptionResource,
  isResolverIssuedSubscriptionResourceResolution,
} from "./resource-resolver";

const issuedResourceEvaluations = new WeakSet<object>();

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function issueResourceEvaluation<T extends SubscriptionResourceEvaluation>(
  evaluation: T,
): T {
  const frozen = deepFreeze(evaluation);
  issuedResourceEvaluations.add(frozen);
  return frozen;
}

export function isEvaluatedSubscriptionResource(
  value: unknown,
): value is SubscriptionResourceEvaluation {
  return (
    typeof value === "object" &&
    value !== null &&
    issuedResourceEvaluations.has(value)
  );
}

type EvaluatableResourceResolution =
  | Extract<SubscriptionResourceResolution, { status: "resolved" }>
  | (Extract<SubscriptionResourceResolution, { status: "conditional" }> & {
      resource: ResolvedSubscriptionResource;
    });

export interface EvaluateSubscriptionResourceInput {
  resolution: EvaluatableResourceResolution;
  eligibility: OfferingEligibilityResult;
  ledger: DerivedSubscriptionQuotaLedger;
  taskId: string;
  analysis: TaskAnalysis;
  planningAsOf: string;
  pricingAsOf: string;
  fallbackEligibility: OfferingEligibilityResult | null;
  fallbackPricing: ApiOfferingCostEvaluation | null;
  remainingIncrementalCashBudgetMicroUsd: number;
}

function routeFor(
  resource: ResolvedSubscriptionResource,
): SubscriptionRouteIdentity {
  return {
    providerId: resource.offeringRef.providerId,
    offeringId: resource.offeringRef.offeringId,
    resourceId: resource.id,
  };
}

function eligibilityMatchesResource(
  eligibility: OfferingEligibilityResult,
  resource: ResolvedSubscriptionResource,
): boolean {
  return (
    eligibility.providerId === resource.offeringRef.providerId &&
    eligibility.offeringId === resource.offeringRef.offeringId
  );
}

function conditionalReasons(
  resolution: EvaluatableResourceResolution,
  eligibility: Exclude<OfferingEligibilityResult, { status: "ineligible" }>,
  reservation: ReturnType<typeof reserveSubscriptionQuota>,
): readonly [ConditionalReasonCode, ...ConditionalReasonCode[]] {
  const reasons: ConditionalReasonCode[] = [
    ...(resolution.status === "conditional" ? resolution.reasonCodes : []),
    ...(eligibility.status === "conditional" ? eligibility.reasonCodes : []),
    ...(reservation.status === "conditional" ? reservation.reasonCodes : []),
  ];
  return normalizeConditionalReasonCodes(reasons);
}

/**
 * Evaluates one already-resolved subscription resource without selecting a
 * final plan. Conditional capacity always carries a separately compatible,
 * budgeted API fallback; this function never emits active/all-active state.
 */
export function evaluateSubscriptionResource(
  input: EvaluateSubscriptionResourceInput,
): SubscriptionResourceEvaluation {
  const { resolution, eligibility, ledger, taskId, analysis, planningAsOf } = input;
  const resource = resolution.resource;
  const requirement = toOfferingEligibilityRequirement(
    analysis,
    COST_SCENARIOS.map((scenario) => ({
      scenario,
      ...invocationTokensForScenario(analysis, scenario),
    })),
  );
  if (
    !isResolverIssuedSubscriptionResource(resource) ||
    !isResolverIssuedSubscriptionResourceResolution(resolution) ||
    !isResolverIssuedOfferingEligibilityResultFor(
      eligibility,
      resource.offeringRef.providerId,
      resource.offeringRef.offeringId,
      requirement,
    ) ||
    !eligibilityMatchesResource(eligibility, resource)
  ) {
    throw new Error(
      "Subscription evaluation requires a resolver-issued resource and matching Offering eligibility.",
    );
  }

  const routeIdentity = routeFor(resource);
  if (eligibility.status === "ineligible") {
    return issueResourceEvaluation({ status: "ineligible", routeIdentity, eligibility });
  }

  const demand = estimateQuotaDemand({
    quota: resource.quota,
    analysis,
    evidenceSubject: {
      providerId: resource.offeringRef.providerId,
      subjectId: resource.id,
    },
  });
  const reservation = reserveSubscriptionQuota({
    resource,
    ledger,
    taskId,
    analysis,
    demand,
    planningAsOf,
  });

  if (reservation.status === "unavailable") {
    return issueResourceEvaluation({
      status: "unavailable",
      routeIdentity,
      eligibility,
      demand,
      reservation,
      reasonCode: reservation.reasonCode,
    });
  }

  if (
    resolution.status === "conditional" ||
    eligibility.status === "conditional" ||
    demand.status === "unknown" ||
    demand.confidence === "user-observed" ||
    reservation.status === "conditional"
  ) {
    return issueResourceEvaluation({
      status: "conditional",
      routeIdentity,
      eligibility,
      demand,
      reservation,
      reasonCodes: conditionalReasons(resolution, eligibility, reservation),
      fallbackRequired: true,
      fallback: resolveConditionalApiFallback({
        eligibility: input.fallbackEligibility,
        pricing: input.fallbackPricing,
        analysis,
        pricingAsOf: input.pricingAsOf,
        incrementalCashBudgetMicroUsd:
          input.remainingIncrementalCashBudgetMicroUsd,
      }),
    });
  }

  const commitmentLedger = buildSubscriptionCommitmentLedger([
    { resource, routeIdentity },
  ]);
  const commitmentCash = commitmentLedger.components[0];
  if (commitmentCash === undefined) {
    throw new Error("Confirmed subscription route must have a commitment component.");
  }
  return issueResourceEvaluation({
    status: "confirmed",
    routeIdentity,
    eligibility,
    demand,
    reservation,
    commitmentCash,
  });
}

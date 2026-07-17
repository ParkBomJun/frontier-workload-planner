import type { TaskAnalysis } from "@/types/domain";
import type { ApiOfferingCostEvaluation } from "@/types/pricing";
import type { OfferingEligibilityResult } from "@/types/offerings";
import { isResolverIssuedOfferingEligibilityResultFor } from "@/lib/offerings/eligibility";
import { isEvaluatedApiOfferingCostFor } from "@/lib/calculation/evaluate-api-offering";
import {
  COST_SCENARIOS,
  invocationTokensForScenario,
} from "@/lib/calculation/invocation-feasibility";
import { toOfferingEligibilityRequirement } from "@/lib/planning/workload-requirements";
import type {
  ApiFallbackCandidate,
  ConditionalFallbackResolution,
} from "@/types/subscriptions";

const issuedFallbackResolutions = new WeakSet<object>();

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function issueFallbackResolution<T extends ConditionalFallbackResolution>(
  resolution: T,
): T {
  const frozen = deepFreeze(resolution);
  issuedFallbackResolutions.add(frozen);
  return frozen;
}

export function isResolvedConditionalApiFallback(
  value: unknown,
): value is ConditionalFallbackResolution {
  return (
    typeof value === "object" &&
    value !== null &&
    issuedFallbackResolutions.has(value)
  );
}

export interface ResolveConditionalFallbackInput {
  eligibility: OfferingEligibilityResult | null;
  pricing: ApiOfferingCostEvaluation | null;
  analysis: TaskAnalysis;
  pricingAsOf: string;
  incrementalCashBudgetMicroUsd: number;
}

function validMicroUsd(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function classifyApiFallbackBudget(
  expectedCashMicroUsd: number,
  incrementalCashBudgetMicroUsd: number,
): "ready" | "held" {
  if (
    !validMicroUsd(expectedCashMicroUsd) ||
    !validMicroUsd(incrementalCashBudgetMicroUsd)
  ) {
    throw new Error(
      "Fallback cash and budget must use non-negative safe micro-USD integers.",
    );
  }
  return expectedCashMicroUsd <= incrementalCashBudgetMicroUsd ? "ready" : "held";
}

export function resolveConditionalApiFallback(
  input: ResolveConditionalFallbackInput,
): ConditionalFallbackResolution {
  if (!validMicroUsd(input.incrementalCashBudgetMicroUsd)) {
    throw new Error("Fallback budget must be a non-negative safe micro-USD integer.");
  }

  const { eligibility, pricing } = input;
  const requirement = toOfferingEligibilityRequirement(
    input.analysis,
    COST_SCENARIOS.map((scenario) => ({
      scenario,
      ...invocationTokensForScenario(input.analysis, scenario),
    })),
  );
  if (
    eligibility?.status !== "eligible" ||
    pricing?.status !== "priced" ||
    !isResolverIssuedOfferingEligibilityResultFor(
      eligibility,
      eligibility.providerId,
      eligibility.offeringId,
      requirement,
    ) ||
    !isEvaluatedApiOfferingCostFor(
      pricing,
      input.analysis,
      input.pricingAsOf,
    ) ||
    eligibility.providerId !== pricing.providerId ||
    eligibility.providerId !== pricing.routeIdentity.providerId ||
    eligibility.offeringId !== pricing.routeIdentity.offeringId ||
    eligibility.modelId !== pricing.modelId
  ) {
    return issueFallbackResolution({
      status: "infeasible",
      reasonCode: "no-compatible-api-fallback",
      fallback: null,
    });
  }

  const cashMicroUsd = { ...pricing.scenarioCostMicroUsd };
  if (Object.values(cashMicroUsd).some((value) => !validMicroUsd(value))) {
    throw new Error("Fallback cash must use non-negative safe micro-USD integers.");
  }
  const fallback: ApiFallbackCandidate = {
    routeIdentity: pricing.routeIdentity,
    cashMicroUsd: Object.freeze(cashMicroUsd),
  };

  return issueFallbackResolution(classifyApiFallbackBudget(
    cashMicroUsd.expected,
    input.incrementalCashBudgetMicroUsd,
  ) === "ready"
    ? { status: "ready", fallback }
    : {
        status: "held",
        reasonCode: "fallback-over-incremental-cash-budget",
        fallback,
      });
}

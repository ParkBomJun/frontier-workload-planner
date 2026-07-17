import {
  COST_SCENARIOS,
  invocationTokensForScenario,
  validateInvocationLimits,
} from "@/lib/calculation/invocation-feasibility";
import {
  inputTokensByScenario,
  resolveApiStandardTextPrice,
} from "@/lib/offerings/api-price-resolver";
import { resolveApiCatalogEntry } from "@/lib/offerings/provider-catalog-adapter";
import type { ModelTier, PlannerTaskAnalysis, ProviderId } from "@/types/domain";
import type {
  ApiCatalogOverride,
  ApiOfferingCostEvaluation,
  InvalidApiStandardTextPrice,
} from "@/types/pricing";

import { estimateTaskCostFromResolvedRate } from "./estimate-cost";

const issuedApiOfferingCostEvaluations = new WeakSet<object>();
const apiOfferingCostInputKeys = new WeakMap<object, string>();

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function issueApiOfferingCostEvaluation<T extends ApiOfferingCostEvaluation>(
  evaluation: T,
  input: EvaluateApiOfferingCostInput,
): T {
  const frozen = deepFreeze(evaluation);
  issuedApiOfferingCostEvaluations.add(frozen);
  apiOfferingCostInputKeys.set(
    frozen,
    apiOfferingCostWorkloadKey(input.analysis, input.pricingAsOf),
  );
  return frozen;
}

function apiOfferingCostWorkloadKey(
  analysis: PlannerTaskAnalysis,
  pricingAsOf: string,
): string {
  return JSON.stringify({
    pricingAsOf,
    taskId: analysis.taskId,
    expectedIterations: analysis.expectedIterations,
    estimatedInputSize: analysis.estimatedInputSize,
    estimatedOutputSize: analysis.estimatedOutputSize,
  });
}

export function isEvaluatedApiOfferingCost(
  value: unknown,
): value is ApiOfferingCostEvaluation {
  return (
    typeof value === "object" &&
    value !== null &&
    issuedApiOfferingCostEvaluations.has(value)
  );
}

export function isEvaluatedApiOfferingCostFor(
  value: unknown,
  analysis: PlannerTaskAnalysis,
  pricingAsOf: string,
): value is ApiOfferingCostEvaluation {
  return (
    isEvaluatedApiOfferingCost(value) &&
    apiOfferingCostInputKeys.get(value) ===
      apiOfferingCostWorkloadKey(analysis, pricingAsOf)
  );
}

export interface EvaluateApiOfferingCostInput {
  providerId: ProviderId;
  tier: ModelTier;
  analysis: PlannerTaskAnalysis;
  pricingAsOf: string;
  override?: ApiCatalogOverride;
}

export function evaluateApiOfferingCost(
  input: EvaluateApiOfferingCostInput,
): ApiOfferingCostEvaluation {
  const pricing = resolveApiStandardTextPrice({
    providerId: input.providerId,
    tier: input.tier,
    pricingAsOf: input.pricingAsOf,
    perInvocationInputTokens: inputTokensByScenario(input.analysis),
    ...(input.override === undefined ? {} : { override: input.override }),
  });
  if (pricing.status === "invalid") {
    return issueApiOfferingCostEvaluation({
      status: "invalid",
      providerId: input.providerId,
      tier: input.tier,
      modelId: pricing.modelId,
      reasonCode: pricing.reasonCode,
      pricing,
      cost: null,
      offeringEligibilityApplied: false,
    }, input);
  }

  const entry = resolveApiCatalogEntry(input.providerId, input.tier);
  const invocationLimits = entry.model.invocationLimits;
  if (invocationLimits.knowledge !== "complete") {
    const invalidPricing: InvalidApiStandardTextPrice = {
      status: "invalid",
      providerId: input.providerId,
      tier: input.tier,
      modelId: entry.model.id,
      pricingAsOf: input.pricingAsOf,
      catalogReference: entry.model.registryReference,
      routeIdentity: entry.routeIdentity,
      reasonCode: "catalog-invocation-limits-unresolved",
    };
    return issueApiOfferingCostEvaluation({
      status: "invalid",
      providerId: input.providerId,
      tier: input.tier,
      modelId: entry.model.id,
      reasonCode: invalidPricing.reasonCode,
      pricing: invalidPricing,
      cost: null,
      offeringEligibilityApplied: false,
    }, input);
  }

  const invocationScenarios = COST_SCENARIOS.map((scenario) => ({
    scenario,
    ...validateInvocationLimits(
      invocationLimits.limits,
      invocationTokensForScenario(input.analysis, scenario),
    ),
  }));
  if (invocationScenarios.some((scenario) => !scenario.feasible)) {
    return issueApiOfferingCostEvaluation({
      status: "ineligible",
      providerId: input.providerId,
      tier: input.tier,
      modelId: entry.model.id,
      routeIdentity: entry.routeIdentity,
      reasonCode: "invocation-limit-exceeded",
      pricing,
      invocationScenarios,
      cost: null,
      offeringEligibilityApplied: false,
    }, input);
  }
  if (pricing.status === "conditional") {
    return issueApiOfferingCostEvaluation({
      status: "conditional",
      providerId: input.providerId,
      tier: input.tier,
      modelId: entry.model.id,
      routeIdentity: entry.routeIdentity,
      pricing,
      invocationScenarios,
      cost: null,
      offeringEligibilityApplied: false,
    }, input);
  }

  const estimated = estimateTaskCostFromResolvedRate(
    input.analysis,
    pricing.effectiveValue.standardTextPrice,
  );
  return issueApiOfferingCostEvaluation({
    status: "priced",
    providerId: input.providerId,
    tier: input.tier,
    modelId: entry.model.id,
    routeIdentity: entry.routeIdentity,
    pricing,
    invocationScenarios,
    cost: estimated.estimate,
    scenarioCostMicroUsd: estimated.scenarioCostMicroUsd,
    offeringEligibilityApplied: false,
  }, input);
}

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
    return {
      status: "invalid",
      providerId: input.providerId,
      tier: input.tier,
      modelId: pricing.modelId,
      reasonCode: pricing.reasonCode,
      pricing,
      cost: null,
      offeringEligibilityApplied: false,
    };
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
    return {
      status: "invalid",
      providerId: input.providerId,
      tier: input.tier,
      modelId: entry.model.id,
      reasonCode: invalidPricing.reasonCode,
      pricing: invalidPricing,
      cost: null,
      offeringEligibilityApplied: false,
    };
  }

  const invocationScenarios = COST_SCENARIOS.map((scenario) => ({
    scenario,
    ...validateInvocationLimits(
      invocationLimits.limits,
      invocationTokensForScenario(input.analysis, scenario),
    ),
  }));
  if (invocationScenarios.some((scenario) => !scenario.feasible)) {
    return {
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
    };
  }
  if (pricing.status === "conditional") {
    return {
      status: "conditional",
      providerId: input.providerId,
      tier: input.tier,
      modelId: entry.model.id,
      routeIdentity: entry.routeIdentity,
      pricing,
      invocationScenarios,
      cost: null,
      offeringEligibilityApplied: false,
    };
  }

  const estimated = estimateTaskCostFromResolvedRate(
    input.analysis,
    pricing.effectiveValue.standardTextPrice,
  );
  return {
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
  };
}

import { describe, expect, it } from "vitest";

import { resolveApiCatalogEntry } from "@/lib/offerings/provider-catalog-adapter";
import {
  isResolverIssuedOfferingEligibilityResultFor,
  resolveOfferingEligibility,
} from "@/lib/offerings/eligibility";
import { evaluateApiOfferingCost } from "@/lib/calculation/evaluate-api-offering";
import {
  COST_SCENARIOS,
  invocationTokensForScenario,
} from "@/lib/calculation/invocation-feasibility";
import { toOfferingEligibilityRequirement } from "@/lib/planning/workload-requirements";
import {
  classifyApiFallbackBudget,
  isResolvedConditionalApiFallback,
  resolveConditionalApiFallback,
} from "@/lib/subscriptions/fallback-resolver";
import type { OfferingEligibilityResult } from "@/types/offerings";
import type { TaskAnalysis } from "@/types/domain";

const PRICING_AS_OF = "2026-07-18";

const analysis: TaskAnalysis = {
  taskId: "task-1",
  taskType: "software-development",
  complexity: "medium",
  reasoningDepth: "moderate",
  expectedIterations: 2,
  estimatedInputSize: "m",
  estimatedOutputSize: "m",
  uncertainty: "medium",
  recommendedModelTier: "balanced",
  workMode: "interactive",
  requiredQualityTier: "economy",
  requiredCapabilities: [],
  upgradeConditions: [],
  failureRisk: "medium",
  riskFactors: [],
  rationale: "Fallback fixture",
};

function requirementFor(targetAnalysis: TaskAnalysis = analysis) {
  return toOfferingEligibilityRequirement(
    targetAnalysis,
    COST_SCENARIOS.map((scenario) => ({
      scenario,
      ...invocationTokensForScenario(targetAnalysis, scenario),
    })),
  );
}

function pricedFallback(
  targetAnalysis: TaskAnalysis = analysis,
  pricingAsOf = PRICING_AS_OF,
) {
  return evaluateApiOfferingCost({
    providerId: "openai",
    tier: "economy",
    analysis: targetAnalysis,
    pricingAsOf,
  });
}

function eligibleForPricedRoute(): Extract<
  OfferingEligibilityResult,
  { status: "eligible" }
> {
  const priced = pricedFallback();
  if (priced.status !== "priced") throw new Error("Fixture must be priced.");
  return {
    status: "eligible",
    providerId: priced.routeIdentity.providerId,
    offeringId: priced.routeIdentity.offeringId,
    modelId: priced.modelId,
    qualityTier: "economy",
    effectiveLimits: {},
    effectiveCapabilities: [],
  };
}

describe("conditional subscription API fallback", () => {
  it("rejects a resolver-issued conditional result", () => {
    const entry = resolveApiCatalogEntry("openai", "economy");
    const currentEligibility = resolveOfferingEligibility(
      { ...entry.offering, supportedSurfaces: ["chat"] },
      new Map([[entry.model.id, entry.model]]),
      requirementFor(),
    );
    expect(currentEligibility.status).toBe("conditional");
    expect(
      isResolverIssuedOfferingEligibilityResultFor(
        currentEligibility,
        entry.offering.providerId,
        entry.offering.id,
        requirementFor(),
      ),
    ).toBe(true);
    expect(
      isResolverIssuedOfferingEligibilityResultFor(
        currentEligibility,
        entry.offering.providerId,
        entry.offering.id,
        requirementFor({ ...analysis, requiredQualityTier: "balanced" }),
      ),
    ).toBe(false);
    const resolution = resolveConditionalApiFallback({
      eligibility: currentEligibility,
      pricing: pricedFallback(),
      analysis,
      pricingAsOf: PRICING_AS_OF,
      incrementalCashBudgetMicroUsd: 1_000_000,
    });
    expect(resolution).toEqual({
      status: "infeasible",
      reasonCode: "no-compatible-api-fallback",
      fallback: null,
    });
    expect(isResolvedConditionalApiFallback(resolution)).toBe(true);
    expect(isResolvedConditionalApiFallback({ ...resolution })).toBe(false);
    expect(Object.isFrozen(resolution)).toBe(true);
  });

  it("keeps exact Expected budget boundary math independent from authority", () => {
    const pricing = pricedFallback();
    if (pricing.status !== "priced") throw new Error("Fixture must be priced.");
    const expected = pricing.scenarioCostMicroUsd.expected;

    expect(classifyApiFallbackBudget(expected, expected)).toBe("ready");
    expect(classifyApiFallbackBudget(expected, expected - 1)).toBe("held");
    expect(() => classifyApiFallbackBudget(Number.NaN, expected)).toThrow(/cash/);
  });

  it("rejects fabricated and cloned eligible results", () => {
    const pricing = pricedFallback();
    if (pricing.status !== "priced") throw new Error("Fixture must be priced.");
    const fabricated = eligibleForPricedRoute();
    const cloned = {
      ...fabricated,
      effectiveLimits: { ...fabricated.effectiveLimits },
      effectiveCapabilities: [...fabricated.effectiveCapabilities],
    };

    for (const eligibility of [fabricated, cloned]) {
      expect(
        resolveConditionalApiFallback({
          eligibility,
          pricing,
          analysis,
          pricingAsOf: PRICING_AS_OF,
          incrementalCashBudgetMicroUsd: pricing.scenarioCostMicroUsd.expected,
        }),
      ).toEqual({
        status: "infeasible",
        reasonCode: "no-compatible-api-fallback",
        fallback: null,
      });
    }

    expect(
      resolveConditionalApiFallback({
        eligibility: fabricated,
        pricing: {
          ...pricing,
          scenarioCostMicroUsd: { ...pricing.scenarioCostMicroUsd },
        },
        analysis,
        pricingAsOf: PRICING_AS_OF,
        incrementalCashBudgetMicroUsd: pricing.scenarioCostMicroUsd.expected,
      }),
    ).toEqual({
      status: "infeasible",
      reasonCode: "no-compatible-api-fallback",
      fallback: null,
    });
  });

  it("rejects a mismatched route, missing fallback, and invalid budget", () => {
    const pricing = pricedFallback();
    if (pricing.status !== "priced") throw new Error("Fixture must be priced.");
    const eligibility = eligibleForPricedRoute();
    expect(
      resolveConditionalApiFallback({
        eligibility: { ...eligibility, offeringId: "api.openai.other" },
        pricing,
        analysis,
        pricingAsOf: PRICING_AS_OF,
        incrementalCashBudgetMicroUsd: 1_000_000,
      }),
    ).toMatchObject({ status: "infeasible" });
    expect(
      resolveConditionalApiFallback({
        eligibility: null,
        pricing: null,
        analysis,
        pricingAsOf: PRICING_AS_OF,
        incrementalCashBudgetMicroUsd: 1_000_000,
      }),
    ).toMatchObject({ status: "infeasible" });
    expect(() =>
      resolveConditionalApiFallback({
        eligibility,
        pricing,
        analysis,
        pricingAsOf: PRICING_AS_OF,
        incrementalCashBudgetMicroUsd: Number.NaN,
      }),
    ).toThrow(/budget/);
  });

  it("rejects issued cost and eligibility artifacts from another workload context", () => {
    const entry = resolveApiCatalogEntry("openai", "economy");
    const exactEligibility = resolveOfferingEligibility(
      entry.offering,
      new Map([[entry.model.id, entry.model]]),
      requirementFor(),
    );
    const otherAnalysis = { ...analysis, expectedIterations: 3 };
    const otherPricing = pricedFallback(otherAnalysis);

    expect(
      resolveConditionalApiFallback({
        eligibility: exactEligibility,
        pricing: otherPricing,
        analysis,
        pricingAsOf: PRICING_AS_OF,
        incrementalCashBudgetMicroUsd: 1_000_000,
      }),
    ).toEqual({
      status: "infeasible",
      reasonCode: "no-compatible-api-fallback",
      fallback: null,
    });

    const mismatchedEligibility = resolveOfferingEligibility(
      entry.offering,
      new Map([[entry.model.id, entry.model]]),
      requirementFor({ ...analysis, requiredQualityTier: "balanced" }),
    );
    expect(
      resolveConditionalApiFallback({
        eligibility: mismatchedEligibility,
        pricing: pricedFallback(),
        analysis,
        pricingAsOf: PRICING_AS_OF,
        incrementalCashBudgetMicroUsd: 1_000_000,
      }),
    ).toEqual({
      status: "infeasible",
      reasonCode: "no-compatible-api-fallback",
      fallback: null,
    });

    expect(
      resolveConditionalApiFallback({
        eligibility: exactEligibility,
        pricing: pricedFallback(),
        analysis,
        pricingAsOf: "2026-07-19",
        incrementalCashBudgetMicroUsd: 1_000_000,
      }),
    ).toEqual({
      status: "infeasible",
      reasonCode: "no-compatible-api-fallback",
      fallback: null,
    });
  });
});

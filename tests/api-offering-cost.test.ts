import { describe, expect, it } from "vitest";

import { compareProviderPlans } from "@/lib/calculation/compare-providers";
import {
  evaluateApiOfferingCost,
  isEvaluatedApiOfferingCost,
  isEvaluatedApiOfferingCostFor,
} from "@/lib/calculation/evaluate-api-offering";
import { estimateTaskCost } from "@/lib/calculation/estimate-cost";
import { catalogOverrideTargetFor } from "@/lib/offerings/catalog-overrides";
import {
  MODEL_TIERS,
  PROVIDER_IDS,
  type TaskAnalysis,
  type TaskInput,
} from "@/types/domain";

const task: TaskInput = {
  id: "task-1",
  name: "Resolved API cost",
  description: "Generalized API offering cost fixture.",
  priority: "high",
  deadlineDate: null,
  failureImpact: "medium",
};

const mediumAnalysis: TaskAnalysis = {
  taskId: task.id,
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
  rationale: "Fixture",
};

describe("evaluateApiOfferingCost", () => {
  it("issues and freezes only the exact evaluated result", () => {
    const evaluated = evaluateApiOfferingCost({
      providerId: "openai",
      tier: "economy",
      analysis: mediumAnalysis,
      pricingAsOf: "2026-07-18",
    });
    expect(isEvaluatedApiOfferingCost(evaluated)).toBe(true);
    expect(
      isEvaluatedApiOfferingCostFor(
        evaluated,
        mediumAnalysis,
        "2026-07-18",
      ),
    ).toBe(true);
    expect(
      isEvaluatedApiOfferingCostFor(
        evaluated,
        { ...mediumAnalysis, expectedIterations: 3 },
        "2026-07-18",
      ),
    ).toBe(false);
    expect(
      isEvaluatedApiOfferingCostFor(
        evaluated,
        mediumAnalysis,
        "2026-07-19",
      ),
    ).toBe(false);
    expect(Object.isFrozen(evaluated)).toBe(true);
    expect(isEvaluatedApiOfferingCost({ ...evaluated })).toBe(false);
    expect(
      isEvaluatedApiOfferingCostFor(
        { ...evaluated },
        mediumAnalysis,
        "2026-07-18",
      ),
    ).toBe(false);
  });

  it("matches all nine compatibility-view costs at the catalog verification date", () => {
    for (const providerId of PROVIDER_IDS) {
      for (const tier of MODEL_TIERS) {
        const evaluated = evaluateApiOfferingCost({
          providerId,
          tier,
          analysis: mediumAnalysis,
          pricingAsOf: "2026-07-18",
        });
        expect(evaluated.status).toBe("priced");
        if (evaluated.status !== "priced") continue;
        expect(evaluated.cost).toEqual(estimateTaskCost(mediumAnalysis, tier, providerId));
        expect(evaluated.offeringEligibilityApplied).toBe(false);
        expect(evaluated.pricing.basis).toBe("standard-uncached-text");
      }
    }
  });

  it("reprices Sonnet 5 after the official transition without changing legacy comparison", () => {
    const after = evaluateApiOfferingCost({
      providerId: "anthropic",
      tier: "balanced",
      analysis: mediumAnalysis,
      pricingAsOf: "2026-09-01",
    });
    const legacy = compareProviderPlans(
      [task],
      [mediumAnalysis],
      { budgetUsd: 5, deadlineDays: 7, strategy: "balanced" },
    ).plans.anthropic;

    expect(after.status).toBe("priced");
    expect(after.status === "priced" ? after.cost.expected.costUsd : null).toBe(0.216);
    expect(after.status === "priced" ? after.scenarioCostMicroUsd.expected : null).toBe(
      216_000,
    );
    expect(legacy.totals.expectedUsd).toBe(0.144);
  });

  it("returns conditional with no cost when any scenario needs excluded long-context pricing", () => {
    const evaluated = evaluateApiOfferingCost({
      providerId: "google",
      tier: "frontier",
      analysis: {
        ...mediumAnalysis,
        expectedIterations: 1,
        estimatedInputSize: "xl",
        estimatedOutputSize: "xs",
      },
      pricingAsOf: "2026-07-18",
    });

    expect(evaluated).toMatchObject({
      status: "conditional",
      cost: null,
      offeringEligibilityApplied: false,
      pricing: {
        reasonCode: "standard-price-input-limit-exceeded",
        conditionFailures: [
          {
            scenario: "high",
            actualInputTokens: 256_000,
            limitInputTokens: 200_000,
          },
        ],
      },
    });
  });

  it("checks price conditions per invocation rather than iteration totals", () => {
    const evaluated = evaluateApiOfferingCost({
      providerId: "google",
      tier: "frontier",
      analysis: {
        ...mediumAnalysis,
        expectedIterations: 5,
        estimatedInputSize: "l",
        estimatedOutputSize: "xs",
      },
      pricingAsOf: "2026-07-18",
    });

    expect(evaluated.status).toBe("priced");
    if (evaluated.status !== "priced") return;
    expect(evaluated.cost.expected).toMatchObject({
      inputTokens: 320_000,
      iterations: 5,
    });
    expect(evaluated.cost.high).toMatchObject({
      inputTokens: 768_000,
      iterations: 6,
    });
  });

  it("keeps hard invocation failure distinct from conditional price applicability", () => {
    const invocationOnly = evaluateApiOfferingCost({
      providerId: "google",
      tier: "balanced",
      analysis: {
        ...mediumAnalysis,
        expectedIterations: 1,
        estimatedInputSize: "m",
        estimatedOutputSize: "xl",
      },
      pricingAsOf: "2026-07-18",
    });
    const both = evaluateApiOfferingCost({
      providerId: "google",
      tier: "frontier",
      analysis: {
        ...mediumAnalysis,
        expectedIterations: 1,
        estimatedInputSize: "xl",
        estimatedOutputSize: "xl",
      },
      pricingAsOf: "2026-07-18",
    });

    expect(invocationOnly).toMatchObject({
      status: "ineligible",
      reasonCode: "invocation-limit-exceeded",
      pricing: { status: "resolved" },
      cost: null,
    });
    expect(both).toMatchObject({
      status: "ineligible",
      reasonCode: "invocation-limit-exceeded",
      pricing: {
        status: "conditional",
        reasonCode: "standard-price-input-limit-exceeded",
      },
      cost: null,
    });
  });

  it("uses one integer micro-USD rounding step for a valid user price", () => {
    const evaluated = evaluateApiOfferingCost({
      providerId: "openai",
      tier: "economy",
      analysis: {
        ...mediumAnalysis,
        expectedIterations: 1,
        estimatedInputSize: "xs",
        estimatedOutputSize: "xs",
      },
      pricingAsOf: "2026-07-18",
      override: {
        kind: "api-catalog-override",
        provenance: "user-supplied",
        target: catalogOverrideTargetFor("openai", "economy"),
        effectiveFrom: "2026-07-18",
        recordedAt: "2026-07-18T09:00:00.000Z",
        standardTextPrice: {
          inputUsdPerMillion: 0.333333,
          outputUsdPerMillion: 1.777777,
        },
      },
    });

    expect(evaluated.status).toBe("priced");
    if (evaluated.status !== "priced") return;
    expect(evaluated.scenarioCostMicroUsd.expected).toBe(1_222);
    expect(evaluated.cost.expected.costUsd).toBe(0.001222);
    expect(evaluated.pricing.effectiveValue.standardTextPriceSource).toBe(
      "user-override",
    );
  });

  it("rejects a future-scheduled override instead of silently showing defaults", () => {
    const evaluated = evaluateApiOfferingCost({
      providerId: "openai",
      tier: "economy",
      analysis: mediumAnalysis,
      pricingAsOf: "2026-07-18",
      override: {
        kind: "api-catalog-override",
        provenance: "user-supplied",
        target: catalogOverrideTargetFor("openai", "economy"),
        effectiveFrom: "2026-08-01",
        recordedAt: "2026-07-18T09:00:00.000Z",
        planningTier: "premium",
        standardTextPrice: { inputUsdPerMillion: 0, outputUsdPerMillion: 0 },
      },
    });

    expect(evaluated).toMatchObject({
      status: "invalid",
      reasonCode: "invalid-user-override",
      pricing: {
        status: "invalid",
        reasonCode: "invalid-user-override",
      },
    });
  });
});

import { describe, expect, it } from "vitest";

import { PROVIDER_CATALOG } from "@/config/provider-catalog";
import { estimateTaskCost } from "@/lib/calculation/estimate-cost";
import { INPUT_TOKEN_BANDS, OUTPUT_TOKEN_BANDS } from "@/lib/calculation/size-bands";
import {
  MODEL_TIERS,
  PROVIDER_IDS,
  SIZE_BANDS,
  type ProviderId,
  type TaskAnalysis,
} from "@/types/domain";

const mediumTask: TaskAnalysis = {
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
  rationale: "Fixture",
};

describe("estimateTaskCost", () => {
  it("defines a complete three-tier catalog for every supported provider", () => {
    for (const providerId of PROVIDER_IDS) {
      expect(Object.keys(PROVIDER_CATALOG[providerId].models)).toEqual([...MODEL_TIERS]);
    }
  });

  it("maps size bands and iterations into exact Terra scenario costs", () => {
    const estimate = estimateTaskCost(mediumTask, "balanced");

    expect(estimate.low).toEqual({
      inputTokens: 8_000,
      outputTokens: 2_000,
      iterations: 1,
      costUsd: 0.05,
    });
    expect(estimate.expected).toEqual({
      inputTokens: 32_000,
      outputTokens: 8_000,
      iterations: 2,
      costUsd: 0.2,
    });
    expect(estimate.high).toEqual({
      inputTokens: 96_000,
      outputTokens: 24_000,
      iterations: 3,
      costUsd: 0.6,
    });
  });

  it.each([
    ["openai", "economy", 0.08],
    ["openai", "balanced", 0.2],
    ["openai", "frontier", 0.4],
    ["anthropic", "economy", 0.072],
    ["anthropic", "balanced", 0.144],
    ["anthropic", "frontier", 0.72],
    ["google", "economy", 0.02],
    ["google", "balanced", 0.04],
    ["google", "frontier", 0.16],
  ] as const)(
    "applies %s %s standard uncached text rates deterministically",
    (providerId, tier, expectedCostUsd) => {
      expect(estimateTaskCost(mediumTask, tier, providerId).expected.costUsd).toBe(
        expectedCostUsd,
      );
    },
  );

  it("keeps token projections identical across providers", () => {
    const estimates = PROVIDER_IDS.map((providerId) =>
      estimateTaskCost(mediumTask, "balanced", providerId),
    );

    expect(estimates.map(({ expected }) => ({
      inputTokens: expected.inputTokens,
      outputTokens: expected.outputTokens,
      iterations: expected.iterations,
    }))).toEqual([
      { inputTokens: 32_000, outputTokens: 8_000, iterations: 2 },
      { inputTokens: 32_000, outputTokens: 8_000, iterations: 2 },
      { inputTokens: 32_000, outputTokens: 8_000, iterations: 2 },
    ]);
  });

  it("uses standard uncached input rates without cache-write uplift", () => {
    const belowThreshold = estimateTaskCost(
      {
        ...mediumTask,
        expectedIterations: 1,
        estimatedInputSize: "xs",
        estimatedOutputSize: "xs",
      },
      "economy",
    );
    const eligible = estimateTaskCost(
      {
        ...mediumTask,
        expectedIterations: 1,
        estimatedInputSize: "xl",
        estimatedOutputSize: "xs",
      },
      "economy",
    );

    expect(belowThreshold.expected.costUsd).toBe(0.004);
    expect(eligible.expected.costUsd).toBe(0.195);
  });

  it("keeps Low at one iteration and gives a five-iteration estimate a six-iteration High", () => {
    const oneIteration = estimateTaskCost({ ...mediumTask, expectedIterations: 1 }, "balanced");
    const fiveIterations = estimateTaskCost({ ...mediumTask, expectedIterations: 5 }, "balanced");

    expect(oneIteration.low.iterations).toBe(1);
    expect(fiveIterations.high.iterations).toBe(6);
    expect(fiveIterations.high.inputTokens).toBe(192_000);
  });

  it.each(
    [
      ["openai", 0.08],
      ["anthropic", 0.072],
      ["google", 0.02],
    ] satisfies Array<[ProviderId, number]>,
  )("keeps exact micro-USD boundaries for %s", (providerId, expectedCostUsd) => {
    expect(estimateTaskCost(mediumTask, "economy", providerId).expected.costUsd).toBe(
      expectedCostUsd,
    );
  });
});

describe("fixed token bands", () => {
  it("are monotonic within and across every size band", () => {
    for (const bands of [INPUT_TOKEN_BANDS, OUTPUT_TOKEN_BANDS]) {
      let previous = { low: 0, expected: 0, high: 0 };
      for (const size of SIZE_BANDS) {
        const range = bands[size];
        expect(range.expected).toBeGreaterThanOrEqual(range.low);
        expect(range.high).toBeGreaterThanOrEqual(range.expected);
        expect(range.low).toBeGreaterThanOrEqual(previous.low);
        expect(range.expected).toBeGreaterThanOrEqual(previous.expected);
        expect(range.high).toBeGreaterThanOrEqual(previous.high);
        previous = range;
      }
    }
  });

  it("keeps the configured maximum single-call input at 256K", () => {
    expect(INPUT_TOKEN_BANDS.xl.high).toBe(256_000);
  });
});

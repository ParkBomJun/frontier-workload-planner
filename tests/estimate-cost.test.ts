import { describe, expect, it } from "vitest";

import { MODEL_PRICING } from "@/config/model-pricing";
import { estimateTaskCost } from "@/lib/calculation/estimate-cost";
import { INPUT_TOKEN_BANDS, OUTPUT_TOKEN_BANDS } from "@/lib/calculation/size-bands";
import { SIZE_BANDS, type TaskAnalysis } from "@/types/domain";

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
  riskFactors: [],
  rationale: "Fixture",
};

describe("estimateTaskCost", () => {
  it("uses the official standard, cache-write, and output prices", () => {
    expect(MODEL_PRICING.economy).toMatchObject({
      modelId: "gpt-5.6-luna",
      inputUsdPerMillion: 1,
      cacheWriteInputUsdPerMillion: 1.25,
      outputUsdPerMillion: 6,
    });
    expect(MODEL_PRICING.balanced).toMatchObject({
      modelId: "gpt-5.6-terra",
      inputUsdPerMillion: 2.5,
      cacheWriteInputUsdPerMillion: 3.125,
      outputUsdPerMillion: 15,
    });
    expect(MODEL_PRICING.frontier).toMatchObject({
      modelId: "gpt-5.6-sol",
      inputUsdPerMillion: 5,
      cacheWriteInputUsdPerMillion: 6.25,
      outputUsdPerMillion: 30,
    });
  });

  it("maps size bands and iterations into exact Terra scenario costs", () => {
    const estimate = estimateTaskCost(mediumTask, "balanced");

    expect(estimate.low).toEqual({
      inputTokens: 8_000,
      outputTokens: 2_000,
      iterations: 1,
      costUsd: 0.055,
    });
    expect(estimate.expected).toEqual({
      inputTokens: 32_000,
      outputTokens: 8_000,
      iterations: 2,
      costUsd: 0.22,
    });
    expect(estimate.high).toEqual({
      inputTokens: 96_000,
      outputTokens: 24_000,
      iterations: 3,
      costUsd: 0.66,
    });
  });

  it("uses cheaper Luna and more expensive Sol rates deterministically", () => {
    const luna = estimateTaskCost(mediumTask, "economy");
    const terra = estimateTaskCost(mediumTask, "balanced");
    const sol = estimateTaskCost(mediumTask, "frontier");

    expect(luna.expected.costUsd).toBeCloseTo(0.088);
    expect(terra.expected.costUsd).toBeCloseTo(0.22);
    expect(sol.expected.costUsd).toBeCloseTo(0.44);
  });

  it("uses cache-write pricing only when one iteration reaches 1,024 input tokens", () => {
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
    expect(eligible.expected.costUsd).toBe(0.243);
  });

  it("keeps Low at one iteration and gives a five-iteration estimate a six-iteration High", () => {
    const oneIteration = estimateTaskCost({ ...mediumTask, expectedIterations: 1 }, "balanced");
    const fiveIterations = estimateTaskCost({ ...mediumTask, expectedIterations: 5 }, "balanced");

    expect(oneIteration.low.iterations).toBe(1);
    expect(fiveIterations.high.iterations).toBe(6);
    expect(fiveIterations.high.inputTokens).toBe(192_000);
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

  it("keeps a single-call input estimate below the 272K long-context boundary", () => {
    expect(INPUT_TOKEN_BANDS.xl.high).toBe(256_000);
    expect(INPUT_TOKEN_BANDS.xl.high).toBeLessThan(272_000);
  });
});

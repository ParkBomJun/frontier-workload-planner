import { MODEL_PRICING } from "@/config/model-pricing";
import type {
  ModelTier,
  ScenarioEstimate,
  TaskAnalysis,
  TaskCostEstimate,
} from "@/types/domain";

import { INPUT_TOKEN_BANDS, OUTPUT_TOKEN_BANDS } from "./size-bands";

export const MICRO_USD_PER_USD = 1_000_000;

type Scenario = keyof TaskCostEstimate;

function iterationsForScenario(expectedIterations: number, scenario: Scenario): number {
  if (scenario === "low") return Math.max(1, expectedIterations - 1);
  if (scenario === "high") return expectedIterations + 1;
  return expectedIterations;
}

export function toMicroUsd(valueUsd: number): number {
  return Math.round(valueUsd * MICRO_USD_PER_USD);
}

export function fromMicroUsd(valueMicroUsd: number): number {
  return valueMicroUsd / MICRO_USD_PER_USD;
}

function estimateScenario(
  analysis: TaskAnalysis,
  tier: ModelTier,
  scenario: Scenario,
): ScenarioEstimate {
  const price = MODEL_PRICING[tier];
  const iterations = iterationsForScenario(analysis.expectedIterations, scenario);
  const inputTokens = INPUT_TOKEN_BANDS[analysis.estimatedInputSize][scenario] * iterations;
  const outputTokens = OUTPUT_TOKEN_BANDS[analysis.estimatedOutputSize][scenario] * iterations;
  const costMicroUsd = Math.round(
    inputTokens * price.inputUsdPerMillion + outputTokens * price.outputUsdPerMillion,
  );

  return {
    inputTokens,
    outputTokens,
    iterations,
    costUsd: fromMicroUsd(costMicroUsd),
  };
}

export function estimateTaskCost(analysis: TaskAnalysis, tier: ModelTier): TaskCostEstimate {
  return {
    low: estimateScenario(analysis, tier, "low"),
    expected: estimateScenario(analysis, tier, "expected"),
    high: estimateScenario(analysis, tier, "high"),
  };
}

import { PROVIDER_CATALOG } from "@/config/provider-catalog";
import type {
  ModelTier,
  PlannerTaskAnalysis,
  ProviderId,
  ScenarioEstimate,
  TaskCostEstimate,
} from "@/types/domain";
import type {
  NormalizedStandardTextRate,
  ResolvedRateTaskCost,
} from "@/types/pricing";

import { INPUT_TOKEN_BANDS, OUTPUT_TOKEN_BANDS } from "./size-bands";
import {
  fromMicroUsd,
  normalizeStandardTextRate,
  tokenCostMicroUsd,
} from "./micro-usd";

export { MICRO_USD_PER_USD, fromMicroUsd, toMicroUsd } from "./micro-usd";

type Scenario = keyof TaskCostEstimate;

function iterationsForScenario(expectedIterations: number, scenario: Scenario): number {
  if (scenario === "low") return Math.max(1, expectedIterations - 1);
  if (scenario === "high") return expectedIterations + 1;
  return expectedIterations;
}

function estimateScenario(
  analysis: PlannerTaskAnalysis,
  scenario: Scenario,
  price: NormalizedStandardTextRate,
): { estimate: ScenarioEstimate; costMicroUsd: number } {
  const iterations = iterationsForScenario(analysis.expectedIterations, scenario);
  const inputTokensPerIteration = INPUT_TOKEN_BANDS[analysis.estimatedInputSize][scenario];
  const inputTokens = inputTokensPerIteration * iterations;
  const outputTokens = OUTPUT_TOKEN_BANDS[analysis.estimatedOutputSize][scenario] * iterations;
  const costMicroUsd = tokenCostMicroUsd(inputTokens, outputTokens, price);

  return {
    estimate: {
      inputTokens,
      outputTokens,
      iterations,
      costUsd: fromMicroUsd(costMicroUsd),
    },
    costMicroUsd,
  };
}

export function estimateTaskCostFromResolvedRate(
  analysis: PlannerTaskAnalysis,
  price: NormalizedStandardTextRate,
): ResolvedRateTaskCost {
  const low = estimateScenario(analysis, "low", price);
  const expected = estimateScenario(analysis, "expected", price);
  const high = estimateScenario(analysis, "high", price);
  return {
    estimate: {
      low: low.estimate,
      expected: expected.estimate,
      high: high.estimate,
    },
    scenarioCostMicroUsd: {
      low: low.costMicroUsd,
      expected: expected.costMicroUsd,
      high: high.costMicroUsd,
    },
  };
}

export function estimateTaskCost(
  analysis: PlannerTaskAnalysis,
  tier: ModelTier,
  providerId: ProviderId = "openai",
): TaskCostEstimate {
  const model = PROVIDER_CATALOG[providerId].models[tier];
  const price = normalizeStandardTextRate(model);
  if (!price) throw new Error("The provider catalog contains an invalid standard-text price.");
  return estimateTaskCostFromResolvedRate(analysis, price).estimate;
}

import { PROVIDER_CATALOG } from "@/config/provider-catalog";
import type {
  ModelTier,
  PlannerTaskAnalysis,
  ProviderId,
  ScenarioEstimate,
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
  analysis: PlannerTaskAnalysis,
  tier: ModelTier,
  scenario: Scenario,
  providerId: ProviderId,
): ScenarioEstimate {
  const price = PROVIDER_CATALOG[providerId].models[tier];
  const iterations = iterationsForScenario(analysis.expectedIterations, scenario);
  const inputTokensPerIteration = INPUT_TOKEN_BANDS[analysis.estimatedInputSize][scenario];
  const inputTokens = inputTokensPerIteration * iterations;
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

export function estimateTaskCost(
  analysis: PlannerTaskAnalysis,
  tier: ModelTier,
  providerId: ProviderId = "openai",
): TaskCostEstimate {
  return {
    low: estimateScenario(analysis, tier, "low", providerId),
    expected: estimateScenario(analysis, tier, "expected", providerId),
    high: estimateScenario(analysis, tier, "high", providerId),
  };
}

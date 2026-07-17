import type { ProviderModelPrice } from "@/config/provider-catalog";
import type {
  CostScenario,
  InvocationFeasibilityResult,
  InvocationLimitFailure,
  InvocationTokenScenario,
  PlannerTaskAnalysis,
  ScenarioInvocationFeasibility,
} from "@/types/domain";
import type { InvocationLimits } from "@/types/offerings";

import { INPUT_TOKEN_BANDS, OUTPUT_TOKEN_BANDS } from "./size-bands";

export const COST_SCENARIOS: CostScenario[] = ["low", "expected", "high"];

/** Validates provider-native invocation limits without requiring a legacy price object. */
export function validateInvocationLimits(
  limits: InvocationLimits,
  tokenScenario: InvocationTokenScenario,
): InvocationFeasibilityResult {
  const failures: InvocationLimitFailure[] = [];

  if (
    limits.maxInputTokens !== undefined &&
    tokenScenario.inputTokens > limits.maxInputTokens
  ) {
    failures.push({
      code: "input-limit-exceeded",
      actualTokens: tokenScenario.inputTokens,
      limitTokens: limits.maxInputTokens,
    });
  }

  if (
    limits.maxOutputTokens !== undefined &&
    tokenScenario.outputTokens > limits.maxOutputTokens
  ) {
    failures.push({
      code: "output-limit-exceeded",
      actualTokens: tokenScenario.outputTokens,
      limitTokens: limits.maxOutputTokens,
    });
  }

  const combinedTokens = tokenScenario.inputTokens + tokenScenario.outputTokens;
  if (
    limits.maxCombinedTokens !== undefined &&
    combinedTokens > limits.maxCombinedTokens
  ) {
    failures.push({
      code: "context-limit-exceeded",
      actualTokens: combinedTokens,
      limitTokens: limits.maxCombinedTokens,
    });
  }

  return {
    feasible: failures.length === 0,
    tokenScenario: { ...tokenScenario },
    failures,
  };
}

/**
 * Validates one projected API invocation without truncating or splitting it.
 * Limits retain each provider's official meaning instead of assuming that every
 * catalog exposes the same kind of context-window field.
 */
export function validateInvocationFeasibility(
  model: ProviderModelPrice,
  tokenScenario: InvocationTokenScenario,
): InvocationFeasibilityResult {
  return validateInvocationLimits(model.limits, tokenScenario);
}

export function invocationTokensForScenario(
  analysis: PlannerTaskAnalysis,
  scenario: CostScenario,
): InvocationTokenScenario {
  return {
    inputTokens: INPUT_TOKEN_BANDS[analysis.estimatedInputSize][scenario],
    outputTokens: OUTPUT_TOKEN_BANDS[analysis.estimatedOutputSize][scenario],
  };
}

export function validateTaskModelFeasibility(
  model: ProviderModelPrice,
  analysis: PlannerTaskAnalysis,
): {
  feasible: boolean;
  scenarios: ScenarioInvocationFeasibility[];
} {
  const scenarios = COST_SCENARIOS.map((scenario) => ({
    scenario,
    ...validateInvocationFeasibility(model, invocationTokensForScenario(analysis, scenario)),
  }));

  return {
    feasible: scenarios.every((scenario) => scenario.feasible),
    scenarios,
  };
}

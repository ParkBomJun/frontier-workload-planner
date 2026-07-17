import type {
  NormalizedStandardTextRate,
  StandardTextRate,
} from "@/types/pricing";

export const MICRO_USD_PER_USD = 1_000_000;
export const MAX_STANDARD_TEXT_RATE_USD_PER_MILLION = 1_000_000;

export function toMicroUsd(valueUsd: number): number {
  return Math.round(valueUsd * MICRO_USD_PER_USD);
}

export function fromMicroUsd(valueMicroUsd: number): number {
  return valueMicroUsd / MICRO_USD_PER_USD;
}

function normalizeRateComponent(value: number): number | null {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_STANDARD_TEXT_RATE_USD_PER_MILLION
  ) {
    return null;
  }

  const microUsdPerMillion = Math.round(value * MICRO_USD_PER_USD);
  if (
    !Number.isSafeInteger(microUsdPerMillion) ||
    Math.abs(value - microUsdPerMillion / MICRO_USD_PER_USD) > 1e-12
  ) {
    return null;
  }
  return microUsdPerMillion;
}

export function normalizeStandardTextRate(
  rate: StandardTextRate,
): NormalizedStandardTextRate | null {
  if (typeof rate !== "object" || rate === null) return null;
  const inputMicroUsdPerMillion = normalizeRateComponent(rate.inputUsdPerMillion);
  const outputMicroUsdPerMillion = normalizeRateComponent(rate.outputUsdPerMillion);
  if (inputMicroUsdPerMillion === null || outputMicroUsdPerMillion === null) {
    return null;
  }

  return {
    inputUsdPerMillion: inputMicroUsdPerMillion / MICRO_USD_PER_USD,
    outputUsdPerMillion: outputMicroUsdPerMillion / MICRO_USD_PER_USD,
    inputMicroUsdPerMillion,
    outputMicroUsdPerMillion,
  };
}

export function tokenCostMicroUsd(
  inputTokens: number,
  outputTokens: number,
  rate: NormalizedStandardTextRate,
): number {
  if (
    !Number.isSafeInteger(inputTokens) ||
    inputTokens < 0 ||
    !Number.isSafeInteger(outputTokens) ||
    outputTokens < 0
  ) {
    throw new Error("Token counts must be non-negative safe integers.");
  }

  const numerator =
    BigInt(inputTokens) * BigInt(rate.inputMicroUsdPerMillion) +
    BigInt(outputTokens) * BigInt(rate.outputMicroUsdPerMillion);
  const rounded = (numerator + BigInt(500_000)) / BigInt(1_000_000);
  const result = Number(rounded);
  if (!Number.isSafeInteger(result)) {
    throw new Error("Calculated micro-USD cost exceeds the safe integer range.");
  }
  return result;
}

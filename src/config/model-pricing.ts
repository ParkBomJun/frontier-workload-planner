import type { ModelTier } from "@/types/domain";

export interface ModelPrice {
  tier: ModelTier;
  modelId: "gpt-5.6-luna" | "gpt-5.6-terra" | "gpt-5.6-sol";
  label: "Luna" | "Terra" | "Sol";
  inputUsdPerMillion: number;
  cachedInputUsdPerMillion: number;
  cacheWriteInputUsdPerMillion: number;
  outputUsdPerMillion: number;
}

export const MODEL_PRICING_LAST_UPDATED = "2026-07-17";
export const MODEL_PRICING_SOURCE = "https://developers.openai.com/api/docs/pricing";

export const MODEL_PRICING: Record<ModelTier, ModelPrice> = {
  economy: {
    tier: "economy",
    modelId: "gpt-5.6-luna",
    label: "Luna",
    inputUsdPerMillion: 1,
    cachedInputUsdPerMillion: 0.1,
    cacheWriteInputUsdPerMillion: 1.25,
    outputUsdPerMillion: 6,
  },
  balanced: {
    tier: "balanced",
    modelId: "gpt-5.6-terra",
    label: "Terra",
    inputUsdPerMillion: 2.5,
    cachedInputUsdPerMillion: 0.25,
    cacheWriteInputUsdPerMillion: 3.125,
    outputUsdPerMillion: 15,
  },
  frontier: {
    tier: "frontier",
    modelId: "gpt-5.6-sol",
    label: "Sol",
    inputUsdPerMillion: 5,
    cachedInputUsdPerMillion: 0.5,
    cacheWriteInputUsdPerMillion: 6.25,
    outputUsdPerMillion: 30,
  },
};

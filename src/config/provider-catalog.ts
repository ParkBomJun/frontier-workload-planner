import type { ModelTier, ProviderId } from "@/types/domain";

export interface ProviderModelPrice {
  tier: ModelTier;
  catalogId: string;
  displayName: string;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  preview?: true;
  effectiveThrough?: string;
  priceAfterEffectiveThrough?: {
    inputUsdPerMillion: number;
    outputUsdPerMillion: number;
    effectiveFrom: string;
  };
  standardPriceInputLimitTokens?: number;
  excludedLongContextPrice?: {
    inputUsdPerMillion: number;
    outputUsdPerMillion: number;
  };
}

export interface ProviderCatalog {
  id: ProviderId;
  displayName: string;
  productFamily: string;
  pricingSource: string;
  modelsSource: string;
  verifiedAt: "2026-07-17";
  models: Record<ModelTier, ProviderModelPrice>;
}

export const PROVIDER_PRICING_BASIS = "standard-uncached-text" as const;
export const PROVIDER_PRICING_EXCLUSIONS = [
  "cache-discounts-and-writes",
  "batch-pricing",
  "tool-call-fees",
  "long-context-surcharges",
] as const;

export const PROVIDER_CATALOG: Record<ProviderId, ProviderCatalog> = {
  openai: {
    id: "openai",
    displayName: "OpenAI",
    productFamily: "GPT-5.6",
    pricingSource: "https://developers.openai.com/api/docs/pricing",
    modelsSource: "https://developers.openai.com/api/docs/guides/latest-model",
    verifiedAt: "2026-07-17",
    models: {
      economy: {
        tier: "economy",
        catalogId: "gpt-5.6-luna",
        displayName: "GPT-5.6 Luna",
        inputUsdPerMillion: 1,
        outputUsdPerMillion: 6,
      },
      balanced: {
        tier: "balanced",
        catalogId: "gpt-5.6-terra",
        displayName: "GPT-5.6 Terra",
        inputUsdPerMillion: 2.5,
        outputUsdPerMillion: 15,
      },
      frontier: {
        tier: "frontier",
        catalogId: "gpt-5.6-sol",
        displayName: "GPT-5.6 Sol",
        inputUsdPerMillion: 5,
        outputUsdPerMillion: 30,
      },
    },
  },
  anthropic: {
    id: "anthropic",
    displayName: "Anthropic",
    productFamily: "Claude",
    pricingSource: "https://platform.claude.com/docs/en/about-claude/pricing",
    modelsSource: "https://platform.claude.com/docs/en/about-claude/models/overview",
    verifiedAt: "2026-07-17",
    models: {
      economy: {
        tier: "economy",
        catalogId: "claude-haiku-4-5",
        displayName: "Claude Haiku 4.5",
        inputUsdPerMillion: 1,
        outputUsdPerMillion: 5,
      },
      balanced: {
        tier: "balanced",
        catalogId: "claude-sonnet-5",
        displayName: "Claude Sonnet 5",
        inputUsdPerMillion: 2,
        outputUsdPerMillion: 10,
        effectiveThrough: "2026-08-31",
        priceAfterEffectiveThrough: {
          inputUsdPerMillion: 3,
          outputUsdPerMillion: 15,
          effectiveFrom: "2026-09-01",
        },
      },
      frontier: {
        tier: "frontier",
        catalogId: "claude-fable-5",
        displayName: "Claude Fable 5",
        inputUsdPerMillion: 10,
        outputUsdPerMillion: 50,
      },
    },
  },
  google: {
    id: "google",
    displayName: "Google",
    productFamily: "Gemini 3",
    pricingSource: "https://ai.google.dev/gemini-api/docs/pricing",
    modelsSource: "https://ai.google.dev/gemini-api/docs/gemini-3",
    verifiedAt: "2026-07-17",
    models: {
      economy: {
        tier: "economy",
        catalogId: "gemini-3.1-flash-lite",
        displayName: "Gemini 3.1 Flash-Lite",
        inputUsdPerMillion: 0.25,
        outputUsdPerMillion: 1.5,
        preview: true,
      },
      balanced: {
        tier: "balanced",
        catalogId: "gemini-3-flash-preview",
        displayName: "Gemini 3 Flash",
        inputUsdPerMillion: 0.5,
        outputUsdPerMillion: 3,
        preview: true,
      },
      frontier: {
        tier: "frontier",
        catalogId: "gemini-3.1-pro-preview",
        displayName: "Gemini 3.1 Pro",
        inputUsdPerMillion: 2,
        outputUsdPerMillion: 12,
        preview: true,
        standardPriceInputLimitTokens: 200_000,
        excludedLongContextPrice: {
          inputUsdPerMillion: 4,
          outputUsdPerMillion: 18,
        },
      },
    },
  },
};

export function providerDisplayName(providerId: ProviderId): string {
  const provider = PROVIDER_CATALOG[providerId];
  return `${provider.displayName} · ${provider.productFamily}`;
}

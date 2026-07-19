import type { ProviderCatalog } from "./provider-catalog";
import { PROVIDER_CATALOG } from "./provider-catalog";
import type { ProviderId } from "@/types/domain";

export const API_CATALOG_REGISTRY_VERSIONS = [
  "provider-comparison-stable-v1",
  "provider-comparison-stable-v2",
  "provider-comparison-stable-v3",
] as const;

export type ApiCatalogRegistryVersion =
  (typeof API_CATALOG_REGISTRY_VERSIONS)[number];

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function cloneCatalog(
  catalog: Readonly<Record<ProviderId, ProviderCatalog>>,
): Record<ProviderId, ProviderCatalog> {
  return JSON.parse(JSON.stringify(catalog)) as Record<ProviderId, ProviderCatalog>;
}

const v1Literal: Record<ProviderId, ProviderCatalog> = {
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
        limits: {
          maxOutputTokens: 128_000,
          maxCombinedTokens: 1_050_000,
          sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
          verifiedAt: "2026-07-17",
        },
      },
      balanced: {
        tier: "balanced",
        catalogId: "gpt-5.6-terra",
        displayName: "GPT-5.6 Terra",
        inputUsdPerMillion: 2.5,
        outputUsdPerMillion: 15,
        limits: {
          maxOutputTokens: 128_000,
          maxCombinedTokens: 1_050_000,
          sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
          verifiedAt: "2026-07-17",
        },
      },
      frontier: {
        tier: "frontier",
        catalogId: "gpt-5.6-sol",
        displayName: "GPT-5.6 Sol",
        inputUsdPerMillion: 5,
        outputUsdPerMillion: 30,
        limits: {
          maxOutputTokens: 128_000,
          maxCombinedTokens: 1_050_000,
          sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
          verifiedAt: "2026-07-17",
        },
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
        limits: {
          maxOutputTokens: 64_000,
          maxCombinedTokens: 200_000,
          sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
          verifiedAt: "2026-07-17",
        },
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
        limits: {
          maxOutputTokens: 128_000,
          maxCombinedTokens: 1_000_000,
          sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
          verifiedAt: "2026-07-17",
        },
      },
      frontier: {
        tier: "frontier",
        catalogId: "claude-fable-5",
        displayName: "Claude Fable 5",
        inputUsdPerMillion: 10,
        outputUsdPerMillion: 50,
        limits: {
          maxOutputTokens: 128_000,
          maxCombinedTokens: 1_000_000,
          sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
          verifiedAt: "2026-07-17",
        },
      },
    },
  },
  google: {
    id: "google",
    displayName: "Google",
    productFamily: "Gemini 3",
    pricingSource: "https://ai.google.dev/gemini-api/docs/pricing",
    modelsSource: "https://ai.google.dev/gemini-api/docs/models",
    verifiedAt: "2026-07-17",
    models: {
      economy: {
        tier: "economy",
        catalogId: "gemini-3.1-flash-lite",
        displayName: "Gemini 3.1 Flash-Lite",
        inputUsdPerMillion: 0.25,
        outputUsdPerMillion: 1.5,
        limits: {
          maxInputTokens: 1_048_576,
          maxOutputTokens: 65_536,
          sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite",
          verifiedAt: "2026-07-17",
        },
      },
      balanced: {
        tier: "balanced",
        catalogId: "gemini-3-flash-preview",
        displayName: "Gemini 3 Flash",
        inputUsdPerMillion: 0.5,
        outputUsdPerMillion: 3,
        preview: true,
        limits: {
          maxInputTokens: 1_048_576,
          maxOutputTokens: 65_536,
          sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview",
          verifiedAt: "2026-07-17",
        },
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
        limits: {
          maxInputTokens: 1_048_576,
          maxOutputTokens: 65_536,
          sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview",
          verifiedAt: "2026-07-17",
        },
      },
    },
  },
};

const v1 = deepFreeze(cloneCatalog(v1Literal));
const v2 = deepFreeze(cloneCatalog(v1Literal));
const v3 = deepFreeze(cloneCatalog(PROVIDER_CATALOG));

export const PROVIDER_CATALOG_SNAPSHOTS: Readonly<
  Record<ApiCatalogRegistryVersion, Readonly<Record<ProviderId, ProviderCatalog>>>
> = deepFreeze({
  "provider-comparison-stable-v1": v1,
  "provider-comparison-stable-v2": v2,
  "provider-comparison-stable-v3": v3,
});

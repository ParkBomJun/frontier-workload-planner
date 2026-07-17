import { describe, expect, it } from "vitest";

import {
  PROVIDER_CATALOG,
  PROVIDER_PRICING_BASIS,
  PROVIDER_PRICING_EXCLUSIONS,
  providerDisplayName,
} from "@/config/provider-catalog";
import { MODEL_TIERS, PROVIDER_IDS } from "@/types/domain";

const expectedCatalog = {
  openai: {
    economy: ["gpt-5.6-luna", "GPT-5.6 Luna", 1, 6],
    balanced: ["gpt-5.6-terra", "GPT-5.6 Terra", 2.5, 15],
    frontier: ["gpt-5.6-sol", "GPT-5.6 Sol", 5, 30],
  },
  anthropic: {
    economy: ["claude-haiku-4-5", "Claude Haiku 4.5", 1, 5],
    balanced: ["claude-sonnet-5", "Claude Sonnet 5", 2, 10],
    frontier: ["claude-fable-5", "Claude Fable 5", 10, 50],
  },
  google: {
    economy: ["gemini-3.1-flash-lite", "Gemini 3.1 Flash-Lite", 0.25, 1.5],
    balanced: ["gemini-3-flash-preview", "Gemini 3 Flash", 0.5, 3],
    frontier: ["gemini-3.1-pro-preview", "Gemini 3.1 Pro", 2, 12],
  },
} as const;

describe("provider catalog", () => {
  it("records the requested standard text prices for all nine tier mappings", () => {
    for (const providerId of PROVIDER_IDS) {
      for (const tier of MODEL_TIERS) {
        const [catalogId, displayName, inputPrice, outputPrice] =
          expectedCatalog[providerId][tier];

        expect(PROVIDER_CATALOG[providerId].models[tier]).toMatchObject({
          tier,
          catalogId,
          displayName,
          inputUsdPerMillion: inputPrice,
          outputUsdPerMillion: outputPrice,
        });
      }
    }
  });

  it("records official sources and the 2026-07-17 verification date", () => {
    expect(PROVIDER_CATALOG.openai).toMatchObject({
      verifiedAt: "2026-07-17",
      pricingSource: "https://developers.openai.com/api/docs/pricing",
      modelsSource: "https://developers.openai.com/api/docs/guides/latest-model",
    });
    expect(PROVIDER_CATALOG.anthropic).toMatchObject({
      verifiedAt: "2026-07-17",
      pricingSource: "https://platform.claude.com/docs/en/about-claude/pricing",
      modelsSource: "https://platform.claude.com/docs/en/about-claude/models/overview",
    });
    expect(PROVIDER_CATALOG.google).toMatchObject({
      verifiedAt: "2026-07-17",
      pricingSource: "https://ai.google.dev/gemini-api/docs/pricing",
      modelsSource: "https://ai.google.dev/gemini-api/docs/models",
    });
  });

  it("preserves stable/preview, temporary-price, and long-context restrictions", () => {
    expect(PROVIDER_CATALOG.anthropic.models.balanced).toMatchObject({
      effectiveThrough: "2026-08-31",
      priceAfterEffectiveThrough: {
        effectiveFrom: "2026-09-01",
        inputUsdPerMillion: 3,
        outputUsdPerMillion: 15,
      },
    });
    expect(PROVIDER_CATALOG.google.models.economy.preview).toBeUndefined();
    expect(PROVIDER_CATALOG.google.models.balanced.preview).toBe(true);
    expect(PROVIDER_CATALOG.google.models.frontier).toMatchObject({
      preview: true,
      standardPriceInputLimitTokens: 200_000,
      excludedLongContextPrice: {
        inputUsdPerMillion: 4,
        outputUsdPerMillion: 18,
      },
    });
    expect(
      Object.values(PROVIDER_CATALOG.google.models).filter((model) => model.preview),
    ).toHaveLength(2);
  });

  it("records provider-native invocation limits and their official sources", () => {
    expect(PROVIDER_CATALOG.openai.models.economy.limits).toEqual({
      maxOutputTokens: 128_000,
      maxCombinedTokens: 1_050_000,
      sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
      verifiedAt: "2026-07-17",
    });
    expect(PROVIDER_CATALOG.anthropic.models.economy.limits).toEqual({
      maxOutputTokens: 64_000,
      maxCombinedTokens: 200_000,
      sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
      verifiedAt: "2026-07-17",
    });
    expect(PROVIDER_CATALOG.anthropic.models.balanced.limits).toMatchObject({
      maxOutputTokens: 128_000,
      maxCombinedTokens: 1_000_000,
    });
    expect(PROVIDER_CATALOG.google.models.economy.limits).toEqual({
      maxInputTokens: 1_048_576,
      maxOutputTokens: 65_536,
      sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite",
      verifiedAt: "2026-07-17",
    });
  });

  it("makes the comparison basis and exclusions machine-readable", () => {
    expect(PROVIDER_PRICING_BASIS).toBe("standard-uncached-text");
    expect(PROVIDER_PRICING_EXCLUSIONS).toEqual([
      "cache-discounts-and-writes",
      "batch-pricing",
      "tool-call-fees",
      "long-context-surcharges",
    ]);
  });

  it("produces stable provider labels without implying a quality ranking", () => {
    expect(PROVIDER_IDS.map(providerDisplayName)).toEqual([
      "OpenAI · GPT-5.6",
      "Anthropic · Claude",
      "Google · Gemini 3",
    ]);
  });
});

import { describe, expect, it } from "vitest";

import {
  PROVIDER_CATALOG,
  PROVIDER_PRICING_BASIS,
  PROVIDER_PRICING_EXCLUSIONS,
  type ProviderModelPrice,
} from "@/config/provider-catalog";
import { compareProviderPlans } from "@/lib/calculation/compare-providers";
import {
  resolveAllApiCatalogEntries,
  resolveApiCatalogEntry,
  projectApiCatalogEntryToLegacyModel,
} from "@/lib/offerings/provider-catalog-adapter";
import {
  API_CATALOG_REGISTRY_VERSION,
} from "@/config/versioned-provider-registry";
import {
  MODEL_TIERS,
  PROVIDER_IDS,
  type ModelTier,
  type PlanningSettings,
  type ProviderId,
  type TaskAnalysis,
  type TaskInput,
} from "@/types/domain";

describe("provider catalog offering adapter", () => {
  it("adapts exactly three providers by three legacy tiers in stable order", () => {
    const entries = resolveAllApiCatalogEntries();
    expect(entries).toHaveLength(9);
    expect(entries.map(({ legacyReference }) => legacyReference)).toEqual(
      PROVIDER_IDS.flatMap((providerId) =>
        MODEL_TIERS.map((tier) => ({ providerId, tier })),
      ),
    );
    expect(entries.map(({ planningTier }) => planningTier)).toEqual([
      "economy",
      "balanced",
      "premium",
      "economy",
      "balanced",
      "premium",
      "economy",
      "balanced",
      "premium",
    ]);
  });

  it("preserves every legacy model and price field through a round trip", () => {
    for (const providerId of PROVIDER_IDS) {
      for (const tier of MODEL_TIERS) {
        const entry = resolveApiCatalogEntry(providerId, tier);
        expect(projectApiCatalogEntryToLegacyModel(providerId, tier)).toEqual(
          PROVIDER_CATALOG[providerId].models[tier],
        );
        expect(entry.model.id).toBe(PROVIDER_CATALOG[providerId].models[tier].catalogId);
        expect(entry.model.qualityTier).toBe(
          tier === "frontier" ? "premium" : tier,
        );
        expect(entry.model.registryReference).toEqual({
          registryId: "frontier-provider-api-catalog",
          registryVersion: API_CATALOG_REGISTRY_VERSION,
          entryId: entry.model.id,
        });
        expect(entry.offering).toMatchObject({
          kind: "model-bound",
          providerId,
          mode: "api",
          modelId: entry.model.id,
          limitPolicy: { kind: "unknown" },
          capabilityPolicy: { kind: "unknown" },
        });
        expect(entry.routeIdentity).toEqual({
          providerId,
          offeringId: entry.offering.id,
          resourceId: null,
        });
      }
    }
  });

  it("projects only a canonical provider/tier lookup and ignores cloned entry mutations", () => {
    const entry = resolveApiCatalogEntry("anthropic", "balanced");
    const forged = {
      ...entry,
      legacyReference: { providerId: "google", tier: "frontier" },
      model: {
        ...entry.model,
        id: "forged-model",
        displayName: "Forged model",
        invocationLimits: {
          ...entry.model.invocationLimits,
          limits: { maxInputTokens: 1, maxOutputTokens: 1 },
          evidence: {
            ...(
              entry.model.invocationLimits.knowledge === "complete"
                ? entry.model.invocationLimits.evidence
                : entry.model.evidence
            ),
            sourceUrl: "https://attacker.invalid/limits",
            verifiedAt: "2099-01-01",
          },
        },
      },
      standardTextPrice: {
        ...entry.standardTextPrice,
        inputUsdPerMillion: 0,
        outputUsdPerMillion: 0,
        evidence: {
          ...entry.standardTextPrice.evidence,
          sourceUrl: "https://attacker.invalid/pricing",
          verifiedAt: "2099-01-01",
        },
      },
      verifiedAt: "2099-01-01",
    };

    expect(projectApiCatalogEntryToLegacyModel("anthropic", "balanced")).toEqual(
      PROVIDER_CATALOG.anthropic.models.balanced,
    );
    expect(() =>
      (
        projectApiCatalogEntryToLegacyModel as unknown as (
          legacyEntry: unknown,
        ) => ProviderModelPrice
      )(forged),
    ).toThrow(/Resolved API catalog entry is missing/);
  });

  it("returns fresh nested projection values and rejects invalid references", () => {
    const first = projectApiCatalogEntryToLegacyModel("anthropic", "balanced");
    first.inputUsdPerMillion = 999;
    first.limits.maxOutputTokens = 1;
    if (first.priceAfterEffectiveThrough) {
      first.priceAfterEffectiveThrough.inputUsdPerMillion = 999;
    }
    const longContext = projectApiCatalogEntryToLegacyModel("google", "frontier");
    if (longContext.excludedLongContextPrice) {
      longContext.excludedLongContextPrice.outputUsdPerMillion = 999;
    }

    expect(projectApiCatalogEntryToLegacyModel("anthropic", "balanced")).toEqual(
      PROVIDER_CATALOG.anthropic.models.balanced,
    );
    expect(projectApiCatalogEntryToLegacyModel("google", "frontier")).toEqual(
      PROVIDER_CATALOG.google.models.frontier,
    );
    expect(() =>
      projectApiCatalogEntryToLegacyModel("unknown" as ProviderId, "balanced"),
    ).toThrow(/Resolved API catalog entry is missing/);
    expect(() =>
      projectApiCatalogEntryToLegacyModel("openai", "unknown" as ModelTier),
    ).toThrow(/Resolved API catalog entry is missing/);
  });

  it("keeps unverified capabilities unknown instead of inferring them from model names", () => {
    for (const entry of resolveAllApiCatalogEntries()) {
      expect(entry.model.capabilityProfile).toEqual({
        knowledge: "unknown",
        reason: "capability-profile-not-yet-verified",
      });
      expect(entry.standardTextPrice).toMatchObject({
        basis: PROVIDER_PRICING_BASIS,
        exclusions: PROVIDER_PRICING_EXCLUSIONS,
      });
    }
  });

  it("preserves preview, temporary price, and long-context metadata", () => {
    expect(resolveApiCatalogEntry("anthropic", "balanced").standardTextPrice).toMatchObject({
      effectiveThrough: "2026-08-31",
      priceAfterEffectiveThrough: {
        inputUsdPerMillion: 3,
        outputUsdPerMillion: 15,
        effectiveFrom: "2026-09-01",
      },
    });
    expect(resolveApiCatalogEntry("google", "economy").standardTextPrice.preview).toBeUndefined();
    expect(resolveApiCatalogEntry("google", "frontier").standardTextPrice).toMatchObject({
      preview: true,
      standardPriceInputLimitTokens: 200_000,
      excludedLongContextPrice: {
        inputUsdPerMillion: 4,
        outputUsdPerMillion: 18,
      },
    });
  });

  it("does not mutate the legacy catalog or current provider-plan output", () => {
    const before = JSON.stringify(PROVIDER_CATALOG);
    resolveAllApiCatalogEntries().forEach(({ legacyReference }) => {
      projectApiCatalogEntryToLegacyModel(
        legacyReference.providerId,
        legacyReference.tier,
      );
    });
    expect(JSON.stringify(PROVIDER_CATALOG)).toBe(before);

    const task: TaskInput = {
      id: "parity-task",
      name: "Adapter parity",
      description: "Current planner remains on its legacy catalog path.",
      priority: "high",
      deadlineDate: null,
      failureImpact: "medium",
    };
    const analysis: TaskAnalysis = {
      taskId: task.id,
      taskType: "software-development",
      complexity: "medium",
      reasoningDepth: "moderate",
      expectedIterations: 2,
      estimatedInputSize: "m",
      estimatedOutputSize: "m",
      uncertainty: "medium",
      recommendedModelTier: "balanced",
      workMode: "interactive",
      requiredQualityTier: "economy",
      requiredCapabilities: [],
      upgradeConditions: [],
      failureRisk: "medium",
      riskFactors: [],
      rationale: "Parity fixture",
    };
    const settings: PlanningSettings = {
      budgetUsd: 5,
      deadlineDays: 7,
      strategy: "balanced",
    };

    expect(
      compareProviderPlans([task], [analysis], settings).comparisons.map(
        ({ providerId, totals, activeTaskCount, heldTaskCount, infeasibleTaskCount }) => ({
          providerId,
          totals,
          activeTaskCount,
          heldTaskCount,
          infeasibleTaskCount,
        }),
      ),
    ).toEqual([
      {
        providerId: "openai",
        totals: { lowUsd: 0.05, expectedUsd: 0.2, highUsd: 0.6 },
        activeTaskCount: 1,
        heldTaskCount: 0,
        infeasibleTaskCount: 0,
      },
      {
        providerId: "anthropic",
        totals: { lowUsd: 0.036, expectedUsd: 0.144, highUsd: 0.432 },
        activeTaskCount: 1,
        heldTaskCount: 0,
        infeasibleTaskCount: 0,
      },
      {
        providerId: "google",
        totals: { lowUsd: 0.01, expectedUsd: 0.04, highUsd: 0.12 },
        activeTaskCount: 1,
        heldTaskCount: 0,
        infeasibleTaskCount: 0,
      },
    ]);
  });
});

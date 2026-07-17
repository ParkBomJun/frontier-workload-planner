import { describe, expect, it } from "vitest";

import {
  catalogOverrideTargetFor,
  restoreApiCatalogDefaults,
  upsertApiCatalogOverride,
} from "@/lib/offerings/catalog-overrides";
import {
  resolveApiStandardTextPrice,
  resolveStandardTextPriceSchedule,
} from "@/lib/offerings/api-price-resolver";
import { resolveApiCatalogEntry } from "@/lib/offerings/provider-catalog-adapter";
import type { CostScenario } from "@/types/domain";
import type { ApiCatalogOverride } from "@/types/pricing";

function inputScenarios(
  low: number,
  expected = low,
  high = expected,
): Record<CostScenario, number> {
  return { low, expected, high };
}

function overrideFor(
  target: ApiCatalogOverride["target"],
  patch: Pick<ApiCatalogOverride, "planningTier" | "standardTextPrice">,
): ApiCatalogOverride {
  return {
    kind: "api-catalog-override",
    provenance: "user-supplied",
    target,
    effectiveFrom: "2026-07-17",
    recordedAt: "2026-07-17T09:00:00.000Z",
    ...patch,
  };
}

describe("resolveApiStandardTextPrice", () => {
  it("resolves the Sonnet 5 introductory-price boundary by explicit date", () => {
    const through = resolveApiStandardTextPrice({
      providerId: "anthropic",
      tier: "balanced",
      pricingAsOf: "2026-08-31",
      perInvocationInputTokens: inputScenarios(16_000),
    });
    const after = resolveApiStandardTextPrice({
      providerId: "anthropic",
      tier: "balanced",
      pricingAsOf: "2026-09-01",
      perInvocationInputTokens: inputScenarios(16_000),
    });

    expect(through).toMatchObject({
      status: "resolved",
      officialDefault: {
        standardTextPrice: { inputUsdPerMillion: 2, outputUsdPerMillion: 10 },
        effectiveFrom: "2026-07-17",
        effectiveThrough: "2026-08-31",
      },
    });
    expect(after).toMatchObject({
      status: "resolved",
      officialDefault: {
        standardTextPrice: { inputUsdPerMillion: 3, outputUsdPerMillion: 15 },
        effectiveFrom: "2026-09-01",
        effectiveThrough: null,
      },
    });
    expect(
      resolveApiStandardTextPrice({
        providerId: "anthropic",
        tier: "balanced",
        pricingAsOf: "2026-09-01",
        perInvocationInputTokens: inputScenarios(16_000),
      }),
    ).toEqual(after);
  });

  it("does not guess invalid dates, pre-verification prices, gaps, or overlaps", () => {
    expect(
      resolveApiStandardTextPrice({
        providerId: "anthropic",
        tier: "balanced",
        pricingAsOf: "2026-02-30",
        perInvocationInputTokens: inputScenarios(1),
      }),
    ).toMatchObject({ status: "invalid", reasonCode: "invalid-pricing-as-of" });
    expect(
      resolveApiStandardTextPrice({
        providerId: "anthropic",
        tier: "balanced",
        pricingAsOf: "2026-07-16",
        perInvocationInputTokens: inputScenarios(1),
      }),
    ).toMatchObject({
      status: "conditional",
      reasonCode: "price-schedule-not-applicable",
    });
    expect(
      resolveStandardTextPriceSchedule(
        {
          verifiedAt: "2026-07-17",
          basePrice: { inputUsdPerMillion: 2, outputUsdPerMillion: 10 },
          effectiveThrough: "2026-08-30",
          priceAfterEffectiveThrough: {
            inputUsdPerMillion: 3,
            outputUsdPerMillion: 15,
            effectiveFrom: "2026-09-02",
          },
        },
        "2026-09-01",
      ),
    ).toEqual({
      status: "conditional",
      reasonCode: "price-schedule-not-applicable",
    });
    expect(
      resolveStandardTextPriceSchedule(
        {
          verifiedAt: "2026-07-17",
          basePrice: { inputUsdPerMillion: 2, outputUsdPerMillion: 10 },
          effectiveThrough: "2026-08-31",
          priceAfterEffectiveThrough: {
            inputUsdPerMillion: 3,
            outputUsdPerMillion: 15,
            effectiveFrom: "2026-08-31",
          },
        },
        "2026-08-31",
      ),
    ).toEqual({ status: "invalid", reasonCode: "catalog-price-schedule-invalid" });
  });

  it("enforces Gemini Pro's standard-price input condition per invocation", () => {
    const boundary = resolveApiStandardTextPrice({
      providerId: "google",
      tier: "frontier",
      pricingAsOf: "2026-07-17",
      perInvocationInputTokens: inputScenarios(200_000),
    });
    const exceeded = resolveApiStandardTextPrice({
      providerId: "google",
      tier: "frontier",
      pricingAsOf: "2026-07-17",
      perInvocationInputTokens: inputScenarios(128_000, 192_000, 200_001),
    });

    expect(boundary).toMatchObject({
      status: "resolved",
      effectiveValue: {
        standardTextPrice: { inputUsdPerMillion: 2, outputUsdPerMillion: 12 },
      },
    });
    expect(exceeded).toMatchObject({
      status: "conditional",
      reasonCode: "standard-price-input-limit-exceeded",
      conditionFailures: [
        {
          scenario: "high",
          actualInputTokens: 200_001,
          limitInputTokens: 200_000,
        },
      ],
      officialDefault: {
        excludedLongContextPrice: {
          inputUsdPerMillion: 4,
          outputUsdPerMillion: 18,
        },
      },
    });
    expect(exceeded).not.toHaveProperty("effectiveValue");
  });

  it("applies only an exact user-supplied override and preserves official evidence", () => {
    const target = catalogOverrideTargetFor("openai", "economy");
    const source = overrideFor(target, {
      planningTier: "premium",
      standardTextPrice: {
        inputUsdPerMillion: 0.5,
        outputUsdPerMillion: 2,
      },
    });
    const mutation = upsertApiCatalogOverride([], source);
    expect(mutation.ok).toBe(true);
    if (!mutation.ok) return;

    const resolved = resolveApiStandardTextPrice({
      providerId: "openai",
      tier: "economy",
      pricingAsOf: "2026-07-17",
      perInvocationInputTokens: inputScenarios(1_000),
      override: mutation.overrides[0],
    });

    expect(resolved).toMatchObject({
      status: "resolved",
      officialDefault: {
        planningTier: "economy",
        standardTextPrice: { inputUsdPerMillion: 1, outputUsdPerMillion: 6 },
        evidence: {
          kind: "provider-published",
          authority: "allowlisted-registry-resolver",
        },
      },
      effectiveValue: {
        planningTier: "premium",
        standardTextPrice: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 2 },
        planningTierSource: "user-override",
        standardTextPriceSource: "user-override",
      },
      overrideApplied: true,
      override: { provenance: "user-supplied" },
    });
    expect(resolved.status === "resolved" && resolved.override).not.toBe(source);
    expect(source).toEqual(
      overrideFor(target, {
        planningTier: "premium",
        standardTextPrice: {
          inputUsdPerMillion: 0.5,
          outputUsdPerMillion: 2,
        },
      }),
    );
  });

  it("restores defaults by deleting the override rather than writing a fake default", () => {
    const target = catalogOverrideTargetFor("openai", "balanced");
    const mutation = upsertApiCatalogOverride(
      [],
      overrideFor(target, {
        planningTier: undefined,
        standardTextPrice: { inputUsdPerMillion: 1, outputUsdPerMillion: 8 },
      }),
    );
    expect(mutation.ok).toBe(true);
    if (!mutation.ok) return;

    const restored = restoreApiCatalogDefaults(mutation.overrides, target);
    expect(restored).toEqual({ ok: true, overrides: [] });
    if (!restored.ok) return;
    const canonical = resolveApiStandardTextPrice({
      providerId: "openai",
      tier: "balanced",
      pricingAsOf: "2026-07-17",
      perInvocationInputTokens: inputScenarios(1_000),
    });
    const afterRestore = resolveApiStandardTextPrice({
      providerId: "openai",
      tier: "balanced",
      pricingAsOf: "2026-07-17",
      perInvocationInputTokens: inputScenarios(1_000),
      ...(restored.overrides[0] ? { override: restored.overrides[0] } : {}),
    });
    expect(afterRestore).toEqual(canonical);
  });

  it.each([
    { standardTextPrice: { inputUsdPerMillion: -1, outputUsdPerMillion: 1 } },
    { standardTextPrice: { inputUsdPerMillion: Number.NaN, outputUsdPerMillion: 1 } },
    { standardTextPrice: { inputUsdPerMillion: 1, outputUsdPerMillion: Infinity } },
    { standardTextPrice: { inputUsdPerMillion: 1.1234567, outputUsdPerMillion: 2 } },
    { planningTier: "unknown" },
    { modelId: "invented-model", planningTier: "economy" },
    { recordedAt: "2026-02-30T09:00:00.000Z" },
    { recordedAt: "2026-07-17Z" },
    { recordedAt: "2026-07-17 09:00:00.000Z" },
  ])("rejects invalid or expanded override input %#", (patch) => {
    const source = {
      kind: "api-catalog-override",
      provenance: "user-supplied",
      target: catalogOverrideTargetFor("openai", "economy"),
      effectiveFrom: "2026-07-17",
      recordedAt: "2026-07-17T09:00:00.000Z",
      ...patch,
    };
    expect(upsertApiCatalogOverride([], source)).toEqual({
      ok: false,
      reasonCode: "invalid-user-override",
    });
  });

  it("rejects an override that is valid for a different canonical entry", () => {
    const override = overrideFor(catalogOverrideTargetFor("openai", "balanced"), {
      planningTier: "premium",
      standardTextPrice: undefined,
    });
    expect(
      resolveApiStandardTextPrice({
        providerId: "openai",
        tier: "economy",
        pricingAsOf: "2026-07-17",
        perInvocationInputTokens: inputScenarios(1_000),
        override,
      }),
    ).toMatchObject({ status: "invalid", reasonCode: "override-target-mismatch" });
  });

  it("orders override source state canonically and rejects unknown targets", () => {
    const luna = overrideFor(catalogOverrideTargetFor("openai", "economy"), {
      planningTier: "balanced",
      standardTextPrice: undefined,
    });
    const sonnet = overrideFor(catalogOverrideTargetFor("anthropic", "balanced"), {
      planningTier: undefined,
      standardTextPrice: { inputUsdPerMillion: 2.25, outputUsdPerMillion: 11 },
    });
    const forwardFirst = upsertApiCatalogOverride([], luna);
    const reverseFirst = upsertApiCatalogOverride([], sonnet);
    expect(forwardFirst.ok).toBe(true);
    expect(reverseFirst.ok).toBe(true);
    if (!forwardFirst.ok || !reverseFirst.ok) return;
    const forward = upsertApiCatalogOverride(forwardFirst.overrides, sonnet);
    const reverse = upsertApiCatalogOverride(reverseFirst.overrides, luna);

    expect(forward).toEqual(reverse);
    expect(
      upsertApiCatalogOverride([], {
        ...luna,
        target: { ...luna.target, entryId: "invented-model" },
      }),
    ).toEqual({ ok: false, reasonCode: "override-target-unresolved" });
    expect(
      restoreApiCatalogDefaults([], {
        ...luna.target,
        registryVersion: "unknown-version",
      }),
    ).toEqual({ ok: false, reasonCode: "override-target-unresolved" });
  });

  it("keeps the canonical registry entry immutable across override resolution", () => {
    const entry = resolveApiCatalogEntry("openai", "economy");
    const before = JSON.stringify(entry);
    resolveApiStandardTextPrice({
      providerId: "openai",
      tier: "economy",
      pricingAsOf: "2026-07-17",
      perInvocationInputTokens: inputScenarios(1_000),
      override: overrideFor(catalogOverrideTargetFor("openai", "economy"), {
        planningTier: "premium",
        standardTextPrice: undefined,
      }),
    });
    expect(JSON.stringify(resolveApiCatalogEntry("openai", "economy"))).toBe(before);
  });
});

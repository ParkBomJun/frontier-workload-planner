import { describe, expect, it } from "vitest";

import {
  parseStoredSubscriptionResourceInput,
  storedSubscriptionResourceInputSchema,
} from "@/lib/subscriptions/resource-schema";

const observed = (note = "Observed in account settings") => ({
  kind: "user-observed" as const,
  observedAt: "2026-07-17T09:00:00.000Z",
  note,
});

const preset = (claimId: string) => ({
  kind: "preset-ref" as const,
  presetId: "subscription-presets",
  presetVersion: "subscription-presets-v1",
  claimId,
});

function ownedResource() {
  return {
    contractVersion: "subscription-resource-v1" as const,
    id: "resource.github.account-0001",
    offeringRef: {
      providerId: "github",
      offeringId: "subscription.github.copilot",
    },
    ownership: "owned" as const,
    commitment: {
      kind: "existing" as const,
      currentFeeUsd: 10,
      currency: "USD" as const,
      billingBasis: "current-plan-period" as const,
      evidence: observed("Current monthly fee"),
    },
    availability: {
      status: "available" as const,
      evidence: observed("Plan is active"),
    },
    quota: {
      kind: "metered" as const,
      unit: "credit" as const,
      included: { value: 300, evidence: preset("included-capacity") },
      remaining: { value: 250, evidence: observed("Remaining credits") },
      consumptionRule: {
        kind: "observed-range-per-basis" as const,
        unit: "credit" as const,
        basis: "task" as const,
        low: 1,
        expected: 1.5,
        high: 2,
        sampleSize: 10,
        evidence: observed("Observed task consumption"),
      },
    },
    reset: {
      kind: "fixed" as const,
      cadenceDays: 30,
      nextResetAt: "2026-08-01T00:00:00.000Z",
      evidence: observed("Next reset shown in account"),
    },
    overage: { kind: "none" as const },
  };
}

function candidateResource() {
  return {
    contractVersion: "subscription-resource-v1" as const,
    id: "resource.openai.candidate-0001",
    offeringRef: {
      providerId: "openai",
      offeringId: "subscription.openai.team",
    },
    ownership: "candidate-new" as const,
    commitment: {
      kind: "new" as const,
      feeUsd: 25,
      currency: "USD" as const,
      billingBasis: "one-plan-period" as const,
      evidence: observed("Displayed checkout price"),
    },
    availability: {
      status: "uncertain" as const,
      evidence: observed("Not purchased yet"),
    },
    quota: {
      kind: "initial-capacity" as const,
      unit: "request" as const,
      included: { value: 1_000, evidence: preset("included-capacity") },
      availableOnActivation: {
        value: 1_000,
        evidence: preset("initial-capacity"),
      },
      appliesFor: "one-plan-period" as const,
      consumptionRule: {
        kind: "fixed-per-basis" as const,
        unit: "request" as const,
        basis: "analysis-iteration" as const,
        units: 1,
        evidence: preset("consumption-rule"),
      },
    },
    reset: { kind: "none" as const },
    overage: {
      kind: "paid" as const,
      unit: "request" as const,
      usdPerUnit: 0.05,
      appliesTo: {
        kind: "offering-list" as const,
        offeringRefs: [
          { providerId: "openai", offeringId: "subscription.openai.team" },
        ],
      },
      effectiveFrom: "2026-07-01",
      effectiveThrough: "2026-12-31",
      maxOverageUnits: 100,
      evidence: preset("paid-overage"),
    },
  };
}

describe("stored subscription resource schema", () => {
  it("accepts strict owned and candidate-new source inputs", () => {
    expect(parseStoredSubscriptionResourceInput(ownedResource())).toMatchObject({
      success: true,
      data: { ownership: "owned", quota: { kind: "metered" } },
    });
    expect(parseStoredSubscriptionResourceInput(candidateResource())).toMatchObject({
      success: true,
      data: { ownership: "candidate-new", quota: { kind: "initial-capacity" } },
    });
  });

  it("returns one closed failure without leaking Zod internals", () => {
    expect(parseStoredSubscriptionResourceInput(null)).toEqual({
      success: false,
      reason: "invalid-subscription-resource-input",
    });
    expect(
      parseStoredSubscriptionResourceInput({ ...ownedResource(), extra: true }),
    ).toEqual({
      success: false,
      reason: "invalid-subscription-resource-input",
    });
    expect(
      parseStoredSubscriptionResourceInput({
        ...ownedResource(),
        availability: {
          ...ownedResource().availability,
          evidence: {
            kind: "provider-published",
            sourceUrl: "https://example.com",
          },
        },
      }),
    ).toEqual({ success: false, reason: "invalid-subscription-resource-input" });
  });

  it("validates the contract version and stable provider/resource identities", () => {
    for (const resource of [
      { ...ownedResource(), contractVersion: "subscription-resource-v2" },
      { ...ownedResource(), id: "Resource 1" },
      {
        ...ownedResource(),
        offeringRef: { ...ownedResource().offeringRef, providerId: "unknown" },
      },
      {
        ...ownedResource(),
        offeringRef: { ...ownedResource().offeringRef, providerId: "custom.short" },
      },
    ]) {
      expect(storedSubscriptionResourceInputSchema.safeParse(resource).success).toBe(false);
    }
    expect(
      storedSubscriptionResourceInputSchema.safeParse({
        ...ownedResource(),
        offeringRef: {
          ...ownedResource().offeringRef,
          providerId: "custom.account-0001",
        },
      }).success,
    ).toBe(true);
  });

  it("enforces ownership-aligned commitment and quota shapes", () => {
    expect(
      storedSubscriptionResourceInputSchema.safeParse({
        ...ownedResource(),
        commitment: candidateResource().commitment,
      }).success,
    ).toBe(false);

    for (const feeUsd of [
      1e-13,
      1.0000000000001,
      0.0000004,
      Number.MAX_SAFE_INTEGER / 1_000_000,
    ]) {
      expect(
        storedSubscriptionResourceInputSchema.safeParse({
          ...candidateResource(),
          commitment: { ...candidateResource().commitment, feeUsd },
        }).success,
      ).toBe(false);
    }
    expect(
      storedSubscriptionResourceInputSchema.safeParse({
        ...candidateResource(),
        commitment: { ...candidateResource().commitment, feeUsd: 12.345678 },
      }).success,
    ).toBe(true);

    for (const sourceValue of [1e-13, 1.0000000000001]) {
      const resource = ownedResource();
      resource.quota.remaining.value = sourceValue;
      expect(storedSubscriptionResourceInputSchema.safeParse(resource).success).toBe(
        false,
      );
    }
    const exactSixDecimalQuota = ownedResource();
    exactSixDecimalQuota.quota.remaining.value = 8.030292;
    expect(
      storedSubscriptionResourceInputSchema.safeParse(exactSixDecimalQuota).success,
    ).toBe(true);
    expect(
      storedSubscriptionResourceInputSchema.safeParse({
        ...candidateResource(),
        quota: ownedResource().quota,
      }).success,
    ).toBe(false);
  });

  it("rejects unsafe values while accepting exact zero remaining and percent bounds", () => {
    const zeroRemaining = ownedResource();
    zeroRemaining.quota.remaining.value = 0;
    expect(storedSubscriptionResourceInputSchema.safeParse(zeroRemaining).success).toBe(true);

    for (const badValue of [
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(
        storedSubscriptionResourceInputSchema.safeParse({
          ...ownedResource(),
          commitment: { ...ownedResource().commitment, currentFeeUsd: badValue },
        }).success,
      ).toBe(false);
    }

    expect(
      storedSubscriptionResourceInputSchema.safeParse({
        ...candidateResource(),
        commitment: {
          ...candidateResource().commitment,
          feeUsd: Number.MAX_SAFE_INTEGER / 1_000_000 + 1,
        },
      }).success,
    ).toBe(false);

    for (const badQuota of [
      { ...ownedResource().quota, included: { ...ownedResource().quota.included, value: 0 } },
      {
        ...ownedResource().quota,
        remaining: { ...ownedResource().quota.remaining, value: 301 },
      },
      {
        ...ownedResource().quota,
        consumptionRule: { ...ownedResource().quota.consumptionRule, low: 0 },
      },
    ]) {
      expect(
        storedSubscriptionResourceInputSchema.safeParse({
          ...ownedResource(),
          quota: badQuota,
        }).success,
      ).toBe(false);
    }

    for (const remainingPercent of [0, 100]) {
      expect(
        storedSubscriptionResourceInputSchema.safeParse({
          ...ownedResource(),
          quota: {
            kind: "calibrated",
            unit: "percent-point",
            remainingPercent: { value: remainingPercent, evidence: observed() },
            consumptionRule: {
              ...ownedResource().quota.consumptionRule,
              unit: "percent-point",
            },
          },
        }).success,
      ).toBe(true);
    }
    for (const remainingPercent of [-0.000001, 100.000001, 0.0000004]) {
      expect(
        storedSubscriptionResourceInputSchema.safeParse({
          ...ownedResource(),
          quota: {
            kind: "calibrated",
            unit: "percent-point",
            remainingPercent: { value: remainingPercent, evidence: observed() },
            consumptionRule: {
              ...ownedResource().quota.consumptionRule,
              unit: "percent-point",
            },
          },
        }).success,
      ).toBe(false);
    }
  });

  it("validates consumption range order, sample size, and same-unit rules", () => {
    for (const consumptionRule of [
      { ...ownedResource().quota.consumptionRule, low: 2, expected: 1.5 },
      { ...ownedResource().quota.consumptionRule, expected: 3, high: 2 },
      { ...ownedResource().quota.consumptionRule, sampleSize: 0 },
      { ...ownedResource().quota.consumptionRule, sampleSize: 1.5 },
      { ...ownedResource().quota.consumptionRule, unit: "request" },
    ]) {
      expect(
        storedSubscriptionResourceInputSchema.safeParse({
          ...ownedResource(),
          quota: { ...ownedResource().quota, consumptionRule },
        }).success,
      ).toBe(false);
    }
  });

  it("requires real UTC reset datetimes and ordered ISO overage dates", () => {
    for (const nextResetAt of [
      "2026-02-30T00:00:00.000Z",
      "2026-07-17",
      "2026-07-17 00:00:00Z",
      "2026-07-17T09:00:00+09:00",
    ]) {
      expect(
        storedSubscriptionResourceInputSchema.safeParse({
          ...ownedResource(),
          reset: { ...ownedResource().reset, nextResetAt },
        }).success,
      ).toBe(false);
    }
    expect(
      storedSubscriptionResourceInputSchema.safeParse({
        ...candidateResource(),
        overage: {
          ...candidateResource().overage,
          effectiveThrough: "2026-06-30",
        },
      }).success,
    ).toBe(false);
  });

  it("validates initial capacity and overage applicability without fake capacity", () => {
    for (const availableOnActivation of [0, 1_001]) {
      expect(
        storedSubscriptionResourceInputSchema.safeParse({
          ...candidateResource(),
          quota: {
            ...candidateResource().quota,
            availableOnActivation: {
              ...candidateResource().quota.availableOnActivation,
              value: availableOnActivation,
            },
          },
        }).success,
      ).toBe(false);
    }

    const opaquePaid = {
      ...ownedResource(),
      quota: { kind: "opaque", description: "Private variable quota" },
      overage: candidateResource().overage,
    };
    expect(storedSubscriptionResourceInputSchema.safeParse(opaquePaid).success).toBe(false);

    expect(
      storedSubscriptionResourceInputSchema.safeParse({
        ...candidateResource(),
        overage: { ...candidateResource().overage, unit: "credit" },
      }).success,
    ).toBe(false);

    const duplicateRef = candidateResource().overage.appliesTo.offeringRefs[0];
    expect(
      storedSubscriptionResourceInputSchema.safeParse({
        ...candidateResource(),
        overage: {
          ...candidateResource().overage,
          appliesTo: {
            kind: "offering-list",
            offeringRefs: [duplicateRef, { ...duplicateRef }],
          },
        },
      }).success,
    ).toBe(false);

    for (const overage of [
      { ...candidateResource().overage, usdPerUnit: 0 },
      { ...candidateResource().overage, usdPerUnit: Number.NaN },
      { ...candidateResource().overage, maxOverageUnits: -1 },
      { ...candidateResource().overage, effectiveFrom: "2026-02-30" },
      {
        ...candidateResource().overage,
        appliesTo: { kind: "offering-list", offeringRefs: [] },
      },
    ]) {
      expect(
        storedSubscriptionResourceInputSchema.safeParse({
          ...candidateResource(),
          overage,
        }).success,
      ).toBe(false);
    }
  });
});

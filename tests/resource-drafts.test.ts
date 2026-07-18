import { describe, expect, it } from "vitest";

import { SUBSCRIPTION_PRESETS } from "@/config/subscription-presets";
import { resolveOfferingEligibility } from "@/lib/offerings/eligibility";
import {
  adaptAvailableAiResourceDraft,
  createAvailableAiResourceEvidenceObservedAt,
  createDefaultAvailableAiResourceDraft,
  recoverableAvailableAiResourcePresetReason,
  relinkAvailableAiResourceDraftPreset,
  updateAvailableAiResourceEvidenceObservedAt,
} from "@/lib/planning/resource-drafts";
import { parseStoredSubscriptionResourceInput } from "@/lib/subscriptions/resource-schema";
import { resolveStoredSubscriptionResource } from "@/lib/subscriptions/resource-resolver";
import type { AvailableAiResourceDraft } from "@/types/resource-drafts";

const OBSERVED_AT = "2026-07-18T03:00:00.000Z";
const CONTEXT = {
  evidenceObservedAt: createAvailableAiResourceEvidenceObservedAt(OBSERVED_AT),
};

function ownedMeteredDraft(): AvailableAiResourceDraft {
  return {
    ...createDefaultAvailableAiResourceDraft({
      uiId: "account-0001",
      presetId: "github-copilot-like-credits",
    }),
    feeUsd: "10.123456",
    quota: {
      kind: "metered",
      unit: "credit",
      included: "4096.000001",
      remaining: "2048.000001",
      consumption: {
        basis: "analysis-iteration",
        low: "0.100001",
        expected: "0.200001",
        high: "0.300001",
        sampleSize: "3",
      },
    },
    reset: {
      kind: "fixed",
      cadenceDays: "30",
      nextResetAt: "2026-08-01T00:00:00.000Z",
    },
  };
}

function candidateOpaqueDraft(
  presetId: "chatgpt-like-variable" | "custom-subscription" =
    "chatgpt-like-variable",
): AvailableAiResourceDraft {
  const draft = createDefaultAvailableAiResourceDraft({
    uiId: "account-0002",
    presetId,
  });
  return {
    ...draft,
    ownership: "candidate-new",
    availability: "uncertain",
    surface: draft.surface || "chat",
    feeUsd: "12.345678",
    quota: {
      kind: "opaque",
      description: "The provider does not publish a deterministic remaining quota.",
    },
    reset: { kind: "unknown" },
  };
}

function ownedCalibratedDraft(): AvailableAiResourceDraft {
  return {
    ...createDefaultAvailableAiResourceDraft({
      uiId: "account-0003",
      presetId: "custom-subscription",
    }),
    surface: "batch",
    feeUsd: "20",
    quota: {
      kind: "calibrated",
      remainingPercent: "100.000000",
      consumption: {
        basis: "task",
        low: "1.000001",
        expected: "2.000001",
        high: "3.000001",
        sampleSize: "5",
      },
    },
    reset: { kind: "none" },
  };
}

describe("Available AI resource draft factory", () => {
  it("builds deterministic, empty source drafts from bounded presets", () => {
    const chat = createDefaultAvailableAiResourceDraft({
      uiId: "account-0001",
      presetId: "chatgpt-like-variable",
    });
    const copilot = createDefaultAvailableAiResourceDraft({
      uiId: "account-0002",
      presetId: "github-copilot-like-credits",
    });
    const rolling = createDefaultAvailableAiResourceDraft({
      uiId: "account-0003",
      presetId: "glm-like-rolling",
    });

    expect(chat).toMatchObject({
      uiId: "account-0001",
      availability: "uncertain",
      surface: "chat",
      feeUsd: "",
      quota: { kind: "opaque", description: "" },
      reset: { kind: "unknown" },
    });
    expect(copilot).toMatchObject({
      surface: "ide-cli",
      feeUsd: "",
      quota: {
        kind: "metered",
        unit: "credit",
        included: "",
        remaining: "",
      },
    });
    expect(rolling).toMatchObject({
      quota: { kind: "opaque" },
      reset: { kind: "rolling", windowHours: "" },
    });
    expect(() =>
      createDefaultAvailableAiResourceDraft({
        uiId: "short",
        presetId: "custom-subscription",
      }),
    ).toThrow(/UI ID/);
  });
});

describe("Available AI resource draft adapter", () => {
  it("does not refresh quota or reset evidence when only the display name changes", () => {
    const draft = ownedMeteredDraft();
    const renamed = { ...draft, displayName: "Renamed account" };
    const timestamps = createAvailableAiResourceEvidenceObservedAt(OBSERVED_AT);
    const update = updateAvailableAiResourceEvidenceObservedAt(
      draft,
      renamed,
      timestamps,
      "2026-07-18T04:00:00.000Z",
    );

    expect(update).toEqual({ evidenceChanged: false, observedAt: timestamps });
    const before = adaptAvailableAiResourceDraft(draft, {
      evidenceObservedAt: timestamps,
    });
    const after = adaptAvailableAiResourceDraft(renamed, {
      evidenceObservedAt: update.observedAt,
    });
    expect(before.success).toBe(true);
    expect(after.success).toBe(true);
    if (!before.success || !after.success) return;
    expect(after.resourceInput).toEqual(before.resourceInput);
    expect(after.offering).toEqual(before.offering);
    expect(
      resolveStoredSubscriptionResource(after.resourceInput, OBSERVED_AT),
    ).toEqual(resolveStoredSubscriptionResource(before.resourceInput, OBSERVED_AT));
  });

  it("reports empty numeric strings instead of coercing them to zero", () => {
    const result = adaptAvailableAiResourceDraft(
      createDefaultAvailableAiResourceDraft({
        uiId: "account-0001",
        presetId: "github-copilot-like-credits",
      }),
      CONTEXT,
    );

    expect(result).toEqual({
      success: false,
      fieldErrors: expect.objectContaining({
        feeUsd: "required",
        "quota.included": "required",
        "quota.remaining": "required",
        "quota.consumption.low": "required",
        "quota.consumption.expected": "required",
        "quota.consumption.high": "required",
        "quota.consumption.sampleSize": "required",
      }),
    });

    const draft = ownedMeteredDraft();
    if (draft.quota.kind !== "metered") throw new Error("Fixture must be metered.");
    expect(
      adaptAvailableAiResourceDraft(
        { ...draft, quota: { ...draft.quota, remaining: "0" } },
        CONTEXT,
      ).success,
    ).toBe(true);
  });

  it("preserves exact six-decimal fee and quota source values", () => {
    const result = adaptAvailableAiResourceDraft(ownedMeteredDraft(), CONTEXT);
    expect(result.success).toBe(true);
    if (!result.success || result.resourceInput.ownership !== "owned") return;
    expect(result.resourceInput.commitment.currentFeeUsd).toBe(10.123456);
    expect(result.resourceInput.quota).toMatchObject({
      kind: "metered",
      included: { value: 4096.000001 },
      remaining: { value: 2048.000001 },
      consumptionRule: {
        low: 0.100001,
        expected: 0.200001,
        high: 0.300001,
      },
    });
    expect(parseStoredSubscriptionResourceInput(result.resourceInput).success).toBe(
      true,
    );

    const tooPrecise = adaptAvailableAiResourceDraft(
      { ...ownedMeteredDraft(), feeUsd: "1.0000001" },
      CONTEXT,
    );
    expect(tooPrecise).toEqual({
      success: false,
      fieldErrors: expect.objectContaining({
        feeUsd: "too-many-decimal-places",
      }),
    });
  });

  it("enforces ownership-compatible quota without inventing initial capacity", () => {
    const candidate = adaptAvailableAiResourceDraft(candidateOpaqueDraft(), CONTEXT);
    expect(candidate.success).toBe(true);
    if (candidate.success) {
      expect(candidate.resourceInput).toMatchObject({
        ownership: "candidate-new",
        commitment: { kind: "new", feeUsd: 12.345678 },
        quota: { kind: "opaque" },
        overage: { kind: "unknown" },
      });
    }

    const meteredCandidate = adaptAvailableAiResourceDraft(
      { ...ownedMeteredDraft(), ownership: "candidate-new" },
      CONTEXT,
    );
    expect(meteredCandidate).toEqual({
      success: false,
      fieldErrors: expect.objectContaining({
        "quota.kind": "ownership-quota-mismatch",
      }),
    });

    const calibrated = adaptAvailableAiResourceDraft(ownedCalibratedDraft(), CONTEXT);
    expect(calibrated.success).toBe(true);
    if (calibrated.success) {
      expect(calibrated.resourceInput).toMatchObject({
        ownership: "owned",
        quota: {
          kind: "calibrated",
          remainingPercent: { value: 100 },
        },
      });
    }
  });

  it("keeps preset shape hints bounded without treating them as evidence", () => {
    const chatWithMeter = adaptAvailableAiResourceDraft(
      {
        ...ownedMeteredDraft(),
        preset: {
          id: "chatgpt-like-variable",
          version: "subscription-presets-v1",
        },
      },
      CONTEXT,
    );
    expect(chatWithMeter).toEqual({
      success: false,
      fieldErrors: expect.objectContaining({
        "quota.kind": "preset-quota-mismatch",
      }),
    });

    const wrongUnit = adaptAvailableAiResourceDraft(
      {
        ...ownedMeteredDraft(),
        quota: { ...ownedMeteredDraft().quota, kind: "metered", unit: "request" },
      } as AvailableAiResourceDraft,
      CONTEXT,
    );
    expect(wrongUnit).toEqual({
      success: false,
      fieldErrors: expect.objectContaining({
        "quota.unit": "preset-unit-mismatch",
      }),
    });

    const rolling = createDefaultAvailableAiResourceDraft({
      uiId: "account-0004",
      presetId: "glm-like-rolling",
    });
    expect(
      adaptAvailableAiResourceDraft(
        {
          ...rolling,
          feeUsd: "0",
          quota: { kind: "opaque", description: "Quota is not published." },
          reset: { kind: "unknown" },
        },
        CONTEXT,
      ),
    ).toEqual({
      success: false,
      fieldErrors: expect.objectContaining({
        "reset.kind": "preset-reset-mismatch",
      }),
    });
  });

  it("uses only the planner-generated Custom provider namespace", () => {
    const result = adaptAvailableAiResourceDraft(
      candidateOpaqueDraft("custom-subscription"),
      CONTEXT,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.resourceInput).toMatchObject({
      id: "resource.custom.account-0002",
      offeringRef: {
        providerId: "custom.account-0002",
        offeringId: "subscription.custom.account-0002",
      },
    });
    expect(result.offering).toMatchObject({
      kind: "model-opaque-subscription",
      mode: "subscription",
      providerId: "custom.account-0002",
      id: "subscription.custom.account-0002",
      eligibility: { kind: "unprofiled", reason: "model-undisclosed" },
    });
  });

  it("does not mutate caller drafts or preset metadata", () => {
    const draft = ownedMeteredDraft();
    const draftBefore = structuredClone(draft);
    const presetsBefore = JSON.stringify(SUBSCRIPTION_PRESETS);

    const first = adaptAvailableAiResourceDraft(draft, CONTEXT);
    const second = adaptAvailableAiResourceDraft(draft, CONTEXT);

    expect(draft).toEqual(draftBefore);
    expect(JSON.stringify(SUBSCRIPTION_PRESETS)).toBe(presetsBefore);
    expect(first).toEqual(second);
  });

  it("assembles allowlisted preset references but keeps their authority conditional", () => {
    const result = adaptAvailableAiResourceDraft(ownedMeteredDraft(), CONTEXT);
    expect(result.success).toBe(true);
    if (!result.success || result.resourceInput.quota.kind !== "metered") return;

    expect(result.resourceInput.quota.included.evidence).toEqual({
      kind: "preset-ref",
      presetId: "github-copilot-like-credits",
      presetVersion: "subscription-presets-v1",
      claimId: "included-capacity",
    });
    expect(JSON.stringify(result)).not.toContain("provider-published");
    expect(result.offering.evidence).toMatchObject({ kind: "user-observed" });

    const resourceResolution = resolveStoredSubscriptionResource(
      result.resourceInput,
      OBSERVED_AT,
    );
    expect(resourceResolution).toMatchObject({
      status: "conditional",
      resource: null,
      reasonCodes: expect.arrayContaining([
        "profile-unverified",
        "consumption-user-observed",
      ]),
    });

    const eligibility = resolveOfferingEligibility(result.offering, new Map(), {
      surface: "ide-cli",
      minimumQualityTier: "economy",
      requiredCapabilities: [],
      tokenScenarios: [
        { scenario: "low", inputTokens: 1, outputTokens: 1 },
        { scenario: "expected", inputTokens: 1, outputTokens: 1 },
        { scenario: "high", inputTokens: 1, outputTokens: 1 },
      ],
    });
    expect(eligibility).toMatchObject({
      status: "conditional",
      modelId: null,
      reasonCodes: expect.arrayContaining([
        "evidence-authority-invalid",
        "profile-unverified",
      ]),
    });
  });

  it("rejects forged preset versions and sub-micro source strings", () => {
    const forged = adaptAvailableAiResourceDraft(
      {
        ...candidateOpaqueDraft(),
        preset: {
          id: "chatgpt-like-variable",
          version: "subscription-presets-v0",
        },
      } as unknown as AvailableAiResourceDraft,
      CONTEXT,
    );
    expect(forged).toEqual({
      success: false,
      fieldErrors: expect.objectContaining({
        "preset.version": "preset-version-mismatch",
      }),
    });

    const subMicro = adaptAvailableAiResourceDraft(
      { ...candidateOpaqueDraft(), feeUsd: "0.0000004" },
      CONTEXT,
    );
    expect(subMicro).toEqual({
      success: false,
      fieldErrors: expect.objectContaining({
        feeUsd: "too-many-decimal-places",
      }),
    });
  });

  it("relinks an unknown preset with safe preset-bound defaults and fresh evidence", () => {
    const retired: AvailableAiResourceDraft = {
      ...ownedMeteredDraft(),
      preset: { id: "retired-credit-plan", version: "retired-v3" },
      displayName: "My preserved account name",
      ownership: "owned",
      availability: "available",
      feeUsd: "14.5",
    };
    const relinked = relinkAvailableAiResourceDraftPreset(
      retired,
      "glm-like-rolling",
    );

    expect(recoverableAvailableAiResourcePresetReason(retired)).toBe(
      "preset-reference-unresolved",
    );
    expect(relinked).toMatchObject({
      uiId: retired.uiId,
      preset: {
        id: "glm-like-rolling",
        version: "subscription-presets-v1",
      },
      displayName: "My preserved account name",
      ownership: "owned",
      availability: "available",
      surface: "",
      feeUsd: "14.5",
      quota: { kind: "opaque", description: "" },
      reset: { kind: "rolling", windowHours: "" },
    });
    expect(recoverableAvailableAiResourcePresetReason(relinked)).toBeNull();

    const priorObservedAt = createAvailableAiResourceEvidenceObservedAt(
      "2026-07-17T03:00:00.000Z",
    );
    const changedAt = "2026-07-18T04:00:00.000Z";
    expect(
      updateAvailableAiResourceEvidenceObservedAt(
        retired,
        relinked,
        priorObservedAt,
        changedAt,
      ),
    ).toEqual({
      evidenceChanged: true,
      observedAt: createAvailableAiResourceEvidenceObservedAt(changedAt),
    });
  });

  it("requires an explicit surface selection after preset relink", () => {
    const retired: AvailableAiResourceDraft = {
      ...ownedMeteredDraft(),
      preset: { id: "retired-credit-plan", version: "retired-v3" },
    };
    const relinked = relinkAvailableAiResourceDraftPreset(
      retired,
      "github-copilot-like-credits",
    );

    expect(relinked.surface).toBe("");
    expect(adaptAvailableAiResourceDraft(relinked, CONTEXT)).toEqual({
      success: false,
      fieldErrors: expect.objectContaining({ surface: "required" }),
    });
  });

  it("marks an obsolete version as a recoverable preset reference", () => {
    const draft = createDefaultAvailableAiResourceDraft({
      uiId: "account-0004",
      presetId: "chatgpt-like-variable",
    });
    expect(
      recoverableAvailableAiResourcePresetReason({
        ...draft,
        preset: { ...draft.preset, version: "subscription-presets-v0" },
      }),
    ).toBe("preset-version-mismatch");
  });
});

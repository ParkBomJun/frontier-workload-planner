import { describe, expect, it } from "vitest";

import {
  isResolverIssuedSubscriptionResource,
  resolveStoredSubscriptionResource,
} from "@/lib/subscriptions/resource-resolver";

const observed = (note: string, observedAt = "2026-07-17T09:00:00.000Z") => ({
  kind: "user-observed" as const,
  observedAt,
  note,
});

function observedMeteredResource() {
  return {
    contractVersion: "subscription-resource-v1" as const,
    id: "resource.github.account-0001",
    offeringRef: {
      providerId: "github",
      offeringId: "subscription.github.copilot-like",
    },
    ownership: "owned" as const,
    commitment: {
      kind: "existing" as const,
      currentFeeUsd: 10,
      currency: "USD" as const,
      billingBasis: "current-plan-period" as const,
      evidence: observed("Existing fee"),
    },
    availability: {
      status: "available" as const,
      evidence: observed("Plan available"),
    },
    quota: {
      kind: "metered" as const,
      unit: "credit" as const,
      included: { value: 100, evidence: observed("Included credits") },
      remaining: { value: 50, evidence: observed("Remaining credits") },
      consumptionRule: {
        kind: "observed-range-per-basis" as const,
        unit: "credit" as const,
        basis: "task" as const,
        low: 1,
        expected: 2,
        high: 3,
        sampleSize: 5,
        evidence: observed("Observed consumption"),
      },
    },
    reset: {
      kind: "fixed" as const,
      cadenceDays: 30,
      nextResetAt: "2026-07-18T00:00:00.000Z",
      evidence: observed("Displayed reset"),
    },
    overage: { kind: "none" as const },
  };
}

function opaqueCandidate() {
  return {
    contractVersion: "subscription-resource-v1" as const,
    id: "resource.openai.candidate-0001",
    offeringRef: {
      providerId: "openai",
      offeringId: "subscription.openai.chatgpt-like",
    },
    ownership: "candidate-new" as const,
    commitment: {
      kind: "new" as const,
      feeUsd: 20,
      currency: "USD" as const,
      billingBasis: "one-plan-period" as const,
      evidence: observed("Checkout price"),
    },
    availability: {
      status: "uncertain" as const,
      evidence: observed("Not purchased"),
    },
    quota: { kind: "opaque" as const, description: "Private variable quota" },
    reset: { kind: "unknown" as const },
    overage: { kind: "unknown" as const },
  };
}

describe("stored subscription resource resolution", () => {
  it("resolves user observations without promoting them to confirmed capacity", () => {
    const source = observedMeteredResource();
    const before = structuredClone(source);
    const result = resolveStoredSubscriptionResource(
      source,
      "2026-07-17T12:00:00.000Z",
    );

    expect(result).toMatchObject({
      status: "conditional",
      reasonCodes: ["consumption-user-observed"],
      resource: {
        ownership: "owned",
        availability: { status: "available" },
        quota: { kind: "metered", remaining: { value: 50 } },
      },
    });
    expect(source).toEqual(before);
    expect(result.status === "conditional" && result.resource).not.toBeNull();
    if (result.status !== "conditional" || result.resource === null) return;
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.source)).toBe(true);
    expect(isResolverIssuedSubscriptionResource(result.resource)).toBe(true);
    expect(isResolverIssuedSubscriptionResource({ ...result.resource })).toBe(false);
  });

  it("downgrades stale fixed and rolling snapshots without replenishing source quota", () => {
    const fixedSource = observedMeteredResource();
    const beforeReset = resolveStoredSubscriptionResource(
      fixedSource,
      "2026-07-17T23:59:59.999Z",
    );
    const atReset = resolveStoredSubscriptionResource(
      fixedSource,
      "2026-07-18T00:00:00.000Z",
    );
    expect(beforeReset).toMatchObject({
      status: "conditional",
      reasonCodes: ["consumption-user-observed"],
      resource: { availability: { status: "available" } },
    });
    expect(atReset).toMatchObject({
      status: "conditional",
      reasonCodes: ["availability-uncertain", "consumption-user-observed"],
      resource: {
        availability: { status: "uncertain" },
        quota: { remaining: { value: 50 } },
      },
    });
    expect(fixedSource.quota.remaining.value).toBe(50);

    const unavailableSource = {
      ...observedMeteredResource(),
      availability: {
        ...observedMeteredResource().availability,
        status: "unavailable" as const,
      },
    };
    expect(
      resolveStoredSubscriptionResource(
        unavailableSource,
        "2026-07-18T00:00:00.000Z",
      ),
    ).toMatchObject({
      resource: { availability: { status: "unavailable" } },
    });

    const rollingSource = {
      ...observedMeteredResource(),
      reset: {
        kind: "rolling" as const,
        windowHours: 24,
        evidence: observed("Rolling window"),
      },
    };
    expect(
      resolveStoredSubscriptionResource(
        rollingSource,
        "2026-07-18T09:00:00.000Z",
      ),
    ).toMatchObject({
      reasonCodes: ["consumption-user-observed"],
      resource: { availability: { status: "available" } },
    });
    expect(
      resolveStoredSubscriptionResource(
        rollingSource,
        "2026-07-18T09:00:00.001Z",
      ),
    ).toMatchObject({
      reasonCodes: ["availability-uncertain", "consumption-user-observed"],
      resource: { availability: { status: "uncertain" } },
    });
  });

  it("keeps opaque and calibrated resources conditional without fake precision", () => {
    expect(
      resolveStoredSubscriptionResource(
        opaqueCandidate(),
        "2026-07-17T12:00:00.000Z",
      ),
    ).toMatchObject({
      status: "conditional",
      reasonCodes: [
        "availability-uncertain",
        "quota-opaque",
        "initial-capacity-unpublished",
      ],
      resource: { quota: { kind: "opaque" } },
    });

    const base = observedMeteredResource();
    const calibrated = {
      ...base,
      quota: {
        kind: "calibrated" as const,
        unit: "percent-point" as const,
        remainingPercent: { value: 100, evidence: observed("Remaining percent") },
        consumptionRule: {
          ...base.quota.consumptionRule,
          unit: "percent-point" as const,
        },
      },
    };
    expect(
      resolveStoredSubscriptionResource(
        calibrated,
        "2026-07-17T12:00:00.000Z",
      ),
    ).toMatchObject({
      status: "conditional",
      reasonCodes: ["consumption-user-observed", "quota-calibrated"],
      resource: { quota: { kind: "calibrated", remainingPercent: { value: 100 } } },
    });
  });

  it("preserves unresolved preset and connector source state as conditional", () => {
    const presetSource = observedMeteredResource();
    presetSource.quota.included.evidence = {
      kind: "preset-ref",
      presetId: "unknown-preset",
      presetVersion: "v99",
      claimId: "included-capacity",
    } as never;
    expect(
      resolveStoredSubscriptionResource(
        presetSource,
        "2026-07-17T12:00:00.000Z",
      ),
    ).toMatchObject({
      status: "conditional",
      source: { quota: { included: { evidence: { presetVersion: "v99" } } } },
      resource: null,
      reasonCodes: ["preset-version-mismatch", "consumption-user-observed"],
    });

    const connectorSource = observedMeteredResource();
    connectorSource.quota.remaining.evidence = {
      kind: "connector-ref",
      adapterId: "connector.github",
      adapterVersion: "v1",
      bindingId: "binding-1",
      snapshotId: "snapshot-1",
      snapshotVersion: "v1",
    } as never;
    expect(
      resolveStoredSubscriptionResource(
        connectorSource,
        "2026-07-17T12:00:00.000Z",
      ),
    ).toMatchObject({
      status: "conditional",
      resource: null,
      reasonCodes: ["connector-unverified", "consumption-user-observed"],
    });
  });

  it("does not invent candidate initial capacity from unresolved claims", () => {
    const candidate = opaqueCandidate();
    const claim = (claimId: string) => ({
      kind: "preset-ref" as const,
      presetId: "chatgpt-like-variable",
      presetVersion: "subscription-presets-v1",
      claimId,
    });
    const initial = {
      ...candidate,
      quota: {
        kind: "initial-capacity" as const,
        unit: "request" as const,
        included: { value: 100, evidence: claim("included-capacity") },
        availableOnActivation: { value: 100, evidence: claim("initial-capacity") },
        appliesFor: "one-plan-period" as const,
        consumptionRule: {
          kind: "fixed-per-basis" as const,
          unit: "request" as const,
          basis: "task" as const,
          units: 1,
          evidence: claim("consumption-rule"),
        },
      },
      overage: { kind: "none" as const },
    };
    expect(
      resolveStoredSubscriptionResource(
        initial,
        "2026-07-17T12:00:00.000Z",
      ),
    ).toMatchObject({
      status: "conditional",
      resource: null,
      reasonCodes: ["profile-unverified", "initial-capacity-unpublished"],
    });
  });

  it("rejects malformed source state and planning timestamps deterministically", () => {
    expect(resolveStoredSubscriptionResource(null, "2026-07-17T12:00:00.000Z")).toEqual({
      status: "invalid",
      source: null,
      reasonCode: "invalid-subscription-resource-input",
    });
    expect(resolveStoredSubscriptionResource(observedMeteredResource(), "2026-02-30Z")).toMatchObject({
      status: "invalid",
      reasonCode: "invalid-subscription-resource-input",
    });
    const first = resolveStoredSubscriptionResource(
      observedMeteredResource(),
      "2026-07-17T12:00:00.000Z",
    );
    expect(
      resolveStoredSubscriptionResource(
        observedMeteredResource(),
        "2026-07-17T12:00:00.000Z",
      ),
    ).toEqual(first);
  });
});

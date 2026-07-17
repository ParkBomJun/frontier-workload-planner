import { describe, expect, it, vi } from "vitest";

import {
  diagnoseConnectorSnapshot,
  type DiagnoseConnectorSnapshotInput,
} from "@/lib/subscriptions/connector-verifier";
import { registeredAccessProviderId } from "@/lib/offerings/route-identity";

const offeringRef = {
  providerId: registeredAccessProviderId("openai"),
  offeringId: "subscription.openai.chat-plan",
};

function validInput(): DiagnoseConnectorSnapshotInput {
  return {
    reference: {
      kind: "connector-ref",
      adapterId: "connector.openai",
      adapterVersion: "v1",
      bindingId: "binding-0001",
      snapshotId: "snapshot-0001",
      snapshotVersion: "v1",
    },
    planningAsOf: "2026-07-17T12:00:00.000Z",
    online: true,
    registeredAdapters: [
      {
        adapterId: "connector.openai",
        adapterVersion: "v1",
        snapshotVersion: "v1",
        maxSnapshotAgeSeconds: 3_600,
      },
    ],
    authenticatedBinding: {
      bindingId: "binding-0001",
      accountId: "account-0001",
      resourceId: "resource-0001",
      offeringRef,
    },
    snapshot: {
      adapterId: "connector.openai",
      adapterVersion: "v1",
      bindingId: "binding-0001",
      accountId: "account-0001",
      resourceId: "resource-0001",
      offeringRef,
      snapshotId: "snapshot-0001",
      snapshotVersion: "v1",
      capturedAt: "2026-07-17T11:30:00.000Z",
      replayDetected: false,
      receiptStatus: "valid",
    },
  };
}

describe("connector snapshot diagnostics", () => {
  it("returns only an untrusted verified diagnostic for an exact fresh match", () => {
    const result = diagnoseConnectorSnapshot(validInput());
    expect(result).toEqual({
      status: "verified-diagnostic",
      adapterId: "connector.openai",
      adapterVersion: "v1",
      bindingId: "binding-0001",
      snapshotId: "snapshot-0001",
      snapshotVersion: "v1",
      capturedAt: "2026-07-17T11:30:00.000Z",
    });
    expect(result).not.toHaveProperty("kind");
    expect(result).not.toHaveProperty("authority");
    expect(result).not.toHaveProperty("evidence");
  });

  it("rejects an unregistered, forged, duplicate, or version-mismatched adapter", () => {
    const base = validInput();
    expect(
      diagnoseConnectorSnapshot({ ...base, registeredAdapters: [] }),
    ).toEqual({ status: "conditional", reasonCodes: ["connector-unverified"] });
    expect(
      diagnoseConnectorSnapshot({
        ...base,
        registeredAdapters: [...base.registeredAdapters, ...base.registeredAdapters],
      }),
    ).toEqual({ status: "conditional", reasonCodes: ["connector-unverified"] });
    expect(
      diagnoseConnectorSnapshot({
        ...base,
        reference: { ...base.reference, adapterVersion: "forged-v2" },
      }),
    ).toEqual({ status: "conditional", reasonCodes: ["connector-unverified"] });
    expect(
      diagnoseConnectorSnapshot({
        ...base,
        snapshot: { ...base.snapshot!, snapshotVersion: "forged-v2" },
      }),
    ).toEqual({ status: "conditional", reasonCodes: ["connector-unverified"] });
  });

  it("keeps an offline or missing snapshot unverified", () => {
    const base = validInput();
    expect(diagnoseConnectorSnapshot({ ...base, online: false })).toEqual({
      status: "conditional",
      reasonCodes: ["connector-unverified"],
    });
    expect(diagnoseConnectorSnapshot({ ...base, snapshot: null })).toEqual({
      status: "conditional",
      reasonCodes: ["connector-unverified"],
    });
  });

  it("rejects cross-binding, account, resource, and Offering snapshots", () => {
    const base = validInput();
    for (const snapshot of [
      { ...base.snapshot!, bindingId: "binding-0002" },
      { ...base.snapshot!, accountId: "account-0002" },
      { ...base.snapshot!, resourceId: "resource-0002" },
      {
        ...base.snapshot!,
        offeringRef: { ...offeringRef, offeringId: "subscription.openai.other" },
      },
    ]) {
      expect(diagnoseConnectorSnapshot({ ...base, snapshot })).toEqual({
        status: "conditional",
        reasonCodes: ["connector-binding-mismatch"],
      });
    }
  });

  it("rejects stale and future snapshots using explicit planningAsOf", () => {
    const base = validInput();
    expect(
      diagnoseConnectorSnapshot({
        ...base,
        snapshot: { ...base.snapshot!, capturedAt: "2026-07-17T10:59:59.999Z" },
      }),
    ).toEqual({
      status: "conditional",
      reasonCodes: ["connector-snapshot-stale"],
    });
    expect(
      diagnoseConnectorSnapshot({
        ...base,
        snapshot: { ...base.snapshot!, capturedAt: "2026-07-17T12:00:00.001Z" },
      }),
    ).toEqual({
      status: "conditional",
      reasonCodes: ["connector-snapshot-stale"],
    });
  });

  it("distinguishes replay and invalid or missing receipts in fixed code order", () => {
    const base = validInput();
    expect(
      diagnoseConnectorSnapshot({
        ...base,
        snapshot: {
          ...base.snapshot!,
          replayDetected: true,
          receiptStatus: "invalid",
        },
      }),
    ).toEqual({
      status: "conditional",
      reasonCodes: ["connector-snapshot-replayed", "connector-receipt-invalid"],
    });
    expect(
      diagnoseConnectorSnapshot({
        ...base,
        snapshot: { ...base.snapshot!, receiptStatus: "missing" },
      }),
    ).toEqual({
      status: "conditional",
      reasonCodes: ["connector-receipt-invalid"],
    });
  });

  it("rejects invalid explicit timestamps instead of reading the clock", () => {
    const base = validInput();
    expect(
      diagnoseConnectorSnapshot({ ...base, planningAsOf: "2026-02-30T00:00:00.000Z" }),
    ).toEqual({ status: "conditional", reasonCodes: ["connector-unverified"] });
    expect(
      diagnoseConnectorSnapshot({
        ...base,
        snapshot: { ...base.snapshot!, capturedAt: "2026-02-30T00:00:00.000Z" },
      }),
    ).toEqual({ status: "conditional", reasonCodes: ["connector-unverified"] });

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2000-01-01T00:00:00.000Z"));
      const first = diagnoseConnectorSnapshot(base);
      vi.setSystemTime(new Date("2099-01-01T00:00:00.000Z"));
      expect(diagnoseConnectorSnapshot(base)).toEqual(first);
    } finally {
      vi.useRealTimers();
    }
  });

  it("is independent of unrelated adapter input order", () => {
    const base = validInput();
    const unrelated = {
      adapterId: "connector.unrelated",
      adapterVersion: "v9",
      snapshotVersion: "v4",
      maxSnapshotAgeSeconds: 10,
    };
    const forward = diagnoseConnectorSnapshot({
      ...base,
      registeredAdapters: [unrelated, ...base.registeredAdapters],
    });
    const reverse = diagnoseConnectorSnapshot({
      ...base,
      registeredAdapters: [...base.registeredAdapters, unrelated],
    });
    expect(forward).toEqual(reverse);
    expect(forward.status).toBe("verified-diagnostic");
  });
});

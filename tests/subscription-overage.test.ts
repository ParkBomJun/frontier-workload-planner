import { describe, expect, it } from "vitest";

import {
  canonicalizeSubscriptionOverageClaimValue,
  VERSIONED_PROVIDER_REGISTRY,
} from "@/config/versioned-provider-registry";
import { resolveApiCatalogEntry } from "@/lib/offerings/provider-catalog-adapter";
import { registeredAccessProviderId } from "@/lib/offerings/route-identity";
import {
  calculateOverageCostMicroUsd,
  resolvePaidOverage,
  type ResolvePaidOverageInput,
} from "@/lib/subscriptions/overage-resolver";
import type { ProviderPublishedEvidence } from "@/types/offerings";
import type { PaidOveragePolicy } from "@/types/subscriptions";

const issuedWrongSubjectEvidence = resolveApiCatalogEntry(
  "openai",
  "economy",
).standardTextPrice.evidence;

function paidPolicy(
  overrides: Partial<PaidOveragePolicy> = {},
): PaidOveragePolicy {
  return {
    kind: "paid",
    unit: "credit",
    usdPerUnit: 0.25,
    appliesTo: { kind: "whole-resource" },
    effectiveFrom: "2026-07-01",
    effectiveThrough: "2026-07-31",
    maxOverageUnits: 100,
    evidence: issuedWrongSubjectEvidence,
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<ResolvePaidOverageInput> = {},
): ResolvePaidOverageInput {
  return {
    policy: paidPolicy(),
    quotaKind: "metered",
    quotaUnit: "credit",
    routeIdentity: {
      providerId: registeredAccessProviderId("openai"),
      offeringId: "subscription.openai.credit-plan",
      resourceId: "account-0001",
    },
    planningAsOf: "2026-07-17T12:00:00.000Z",
    deficitUnits: 4,
    overageUnitsAlreadyUsed: 0,
    ...overrides,
  };
}

describe("paid overage resolution", () => {
  it("calculates integer micro-USD with one half-up rounding step", () => {
    expect(calculateOverageCostMicroUsd(2.5, 0.333333)).toBe(833_333);
    expect(calculateOverageCostMicroUsd(1, 0.0000005)).toBe(1);
    expect(calculateOverageCostMicroUsd(0, 0.25)).toBe(0);
    expect(calculateOverageCostMicroUsd(-1, 0.25)).toBeNull();
    expect(calculateOverageCostMicroUsd(1, 0)).toBeNull();
    expect(calculateOverageCostMicroUsd(Number.POSITIVE_INFINITY, 1)).toBeNull();
    expect(calculateOverageCostMicroUsd(Number.MAX_VALUE, Number.MAX_VALUE)).toBeNull();
  });

  it("does not require overage for a zero non-opaque deficit", () => {
    expect(
      resolvePaidOverage({
        ...baseInput(),
        policy: { kind: "unknown" },
        deficitUnits: 0,
      }),
    ).toEqual({
      status: "not-needed",
      unit: "credit",
      overageUnits: 0,
      costMicroUsd: 0,
    });
  });

  it("keeps none, unknown, and opaque overage unavailable", () => {
    expect(
      resolvePaidOverage({ ...baseInput(), policy: { kind: "none" } }),
    ).toMatchObject({ status: "unavailable", reasonCode: "overage-disabled" });
    expect(
      resolvePaidOverage({ ...baseInput(), policy: { kind: "unknown" } }),
    ).toMatchObject({ status: "unavailable", reasonCode: "overage-unknown" });
    expect(
      resolvePaidOverage({
        ...baseInput(),
        quotaKind: "opaque",
        quotaUnit: null,
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "opaque-quota-overage-invalid",
    });
    expect(
      resolvePaidOverage({
        ...baseInput(),
        policy: { kind: "none" },
        quotaKind: "opaque",
        quotaUnit: null,
      }),
    ).toMatchObject({ status: "unavailable", reasonCode: "overage-disabled" });
    expect(
      resolvePaidOverage({
        ...baseInput(),
        policy: { kind: "unknown" },
        quotaKind: "opaque",
        quotaUnit: null,
      }),
    ).toMatchObject({ status: "unavailable", reasonCode: "overage-unknown" });
  });

  it("checks exact Offering scope without joining route identity strings", () => {
    expect(
      resolvePaidOverage({
        ...baseInput(),
        policy: paidPolicy({
          appliesTo: {
            kind: "offering-list",
            offeringRefs: [
              {
                providerId: registeredAccessProviderId("openai"),
                offeringId: "subscription.openai.other-plan",
              },
            ],
          },
        }),
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-scope-mismatch",
    });
    expect(
      resolvePaidOverage({
        ...baseInput(),
        policy: paidPolicy({
          appliesTo: {
            kind: "offering-list",
            offeringRefs: [
              {
                providerId: registeredAccessProviderId("openai"),
                offeringId: "subscription.openai.credit-plan",
              },
            ],
          },
        }),
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-evidence-unverified",
    });
  });

  it("treats effective dates and the optional cap as inclusive boundaries", () => {
    expect(
      resolvePaidOverage({
        ...baseInput(),
        planningAsOf: "2026-06-30T23:59:59.999Z",
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-not-yet-effective",
    });
    expect(
      resolvePaidOverage({
        ...baseInput(),
        planningAsOf: "2026-07-01T00:00:00.000Z",
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-evidence-unverified",
    });
    expect(
      resolvePaidOverage({
        ...baseInput(),
        planningAsOf: "2026-07-31T23:59:59.999Z",
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-evidence-unverified",
    });
    expect(
      resolvePaidOverage({
        ...baseInput(),
        planningAsOf: "2026-08-01T00:00:00.000Z",
      }),
    ).toMatchObject({ status: "unavailable", reasonCode: "overage-expired" });
    expect(
      resolvePaidOverage({ ...baseInput(), deficitUnits: 100 }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-evidence-unverified",
    });
    expect(
      resolvePaidOverage({ ...baseInput(), deficitUnits: 100.000001 }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-cap-exceeded",
    });
    expect(
      resolvePaidOverage({
        ...baseInput(),
        overageUnitsAlreadyUsed: 96,
        deficitUnits: 4,
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-evidence-unverified",
    });
    expect(
      resolvePaidOverage({
        ...baseInput(),
        overageUnitsAlreadyUsed: 96,
        deficitUnits: 4.000001,
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-cap-exceeded",
    });
    expect(
      resolvePaidOverage({
        ...baseInput(),
        policy: paidPolicy({ maxOverageUnits: 9_007_199_253.999998 }),
        deficitUnits: 9_007_199_253.999998,
        exactMicrounits: {
          deficit: 9_007_199_253_999_999,
          alreadyUsed: 0,
        },
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-cap-exceeded",
    });
  });

  it("rejects unit mismatches and malformed dates, ranges, rates, or deficits", () => {
    expect(
      resolvePaidOverage({
        ...baseInput(),
        policy: paidPolicy({ unit: "request" }),
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-unit-mismatch",
    });
    for (const policy of [
      paidPolicy({ effectiveFrom: "2026-02-30" }),
      paidPolicy({ effectiveFrom: "2026-08-01", effectiveThrough: "2026-07-31" }),
      paidPolicy({ usdPerUnit: 0 }),
      paidPolicy({ usdPerUnit: Number.NaN }),
      paidPolicy({ usdPerUnit: Number.MAX_VALUE }),
      paidPolicy({ maxOverageUnits: Number.POSITIVE_INFINITY }),
    ]) {
      expect(resolvePaidOverage({ ...baseInput(), policy })).toMatchObject({
        status: "unavailable",
        reasonCode: "overage-policy-invalid",
      });
    }
    expect(
      resolvePaidOverage({ ...baseInput(), deficitUnits: Number.NaN }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-policy-invalid",
    });
    expect(
      resolvePaidOverage({
        ...baseInput(),
        policy: paidPolicy({ maxOverageUnits: undefined }),
        deficitUnits: Number.MAX_VALUE,
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-policy-invalid",
    });
    expect(
      resolvePaidOverage({ ...baseInput(), planningAsOf: "2026-07-17" }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-policy-invalid",
    });
  });

  it("does not accept issued evidence for another subject or a forged clone", () => {
    expect(resolvePaidOverage(baseInput())).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-evidence-unverified",
    });
    expect(
      resolvePaidOverage({
        ...baseInput(),
        policy: paidPolicy({
          evidence: null as unknown as ProviderPublishedEvidence,
        }),
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-evidence-unverified",
    });

    const forged = {
      ...issuedWrongSubjectEvidence,
      providerId: "openai",
      subjectId: "account-0001",
      fieldPath: "subscription.overage",
      claimId: "subscription-overage",
    } as unknown as ProviderPublishedEvidence;
    expect(
      resolvePaidOverage({
        ...baseInput(),
        policy: paidPolicy({ evidence: forged }),
      }),
    ).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-evidence-unverified",
    });

    for (const alteredPolicy of [
      paidPolicy({ evidence: forged, usdPerUnit: 0.5 }),
      paidPolicy({ evidence: forged, effectiveThrough: "2026-08-31" }),
      paidPolicy({ evidence: forged, maxOverageUnits: 200 }),
      paidPolicy({
        evidence: forged,
        appliesTo: {
          kind: "offering-list",
          offeringRefs: [
            {
              providerId: registeredAccessProviderId("openai"),
              offeringId: "subscription.openai.credit-plan",
            },
          ],
        },
      }),
    ]) {
      expect(
        resolvePaidOverage({ ...baseInput(), policy: alteredPolicy }),
      ).toMatchObject({
        status: "unavailable",
        reasonCode: "overage-evidence-unverified",
      });
    }
  });

  it("canonicalizes offering-list claim scope without retaining caller arrays", () => {
    const source = {
      kind: "paid" as const,
      unit: "credit" as const,
      usdPerUnit: 0.25,
      appliesTo: {
        kind: "offering-list" as const,
        offeringRefs: [
          { providerId: "z-ai", offeringId: "subscription.z-ai.plan-b" },
          { providerId: "github", offeringId: "subscription.github.plan-z" },
          { providerId: "github", offeringId: "subscription.github.plan-a" },
        ],
      },
      effectiveFrom: "2026-07-01",
      maxOverageUnits: 100,
    };
    const canonical = canonicalizeSubscriptionOverageClaimValue(source);

    expect(canonical.appliesTo).toEqual({
      kind: "offering-list",
      offeringRefs: [
        { providerId: "github", offeringId: "subscription.github.plan-a" },
        { providerId: "github", offeringId: "subscription.github.plan-z" },
        { providerId: "z-ai", offeringId: "subscription.z-ai.plan-b" },
      ],
    });
    expect(Object.isFrozen(canonical)).toBe(true);
    expect(Object.isFrozen(canonical.appliesTo)).toBe(true);
    if (canonical.appliesTo.kind === "offering-list") {
      expect(Object.isFrozen(canonical.appliesTo.offeringRefs)).toBe(true);
      expect(canonical.appliesTo.offeringRefs).not.toBe(
        source.appliesTo.offeringRefs,
      );
    }
  });

  it("publishes no fabricated subscription-overage claim in current snapshots", () => {
    for (const entry of VERSIONED_PROVIDER_REGISTRY.entries) {
      expect(entry.claims["subscription-overage"]).toBeUndefined();
    }
  });
});

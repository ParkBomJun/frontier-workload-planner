import { describe, expect, it } from "vitest";

import {
  activateSubscriptionCommitment,
  buildSubscriptionCommitmentLedger,
  createDerivedSubscriptionCommitmentLedger,
  isDerivedSubscriptionCommitmentLedger,
} from "@/lib/subscriptions/commitment-ledger";
import { resolveStoredSubscriptionResource } from "@/lib/subscriptions/resource-resolver";
import { parseStoredSubscriptionResourceInput } from "@/lib/subscriptions/resource-schema";
import type { AccessProviderId, SubscriptionRouteIdentity } from "@/types/offerings";
import type {
  ResolvedSubscriptionResource,
  StoredSubscriptionResourceInput,
} from "@/types/subscriptions";

const PLANNING_AS_OF = "2026-07-17T09:00:00.000Z";

function observed(note: string) {
  return {
    kind: "user-observed" as const,
    observedAt: PLANNING_AS_OF,
    note,
  };
}

function storedResource(
  id: string,
  ownership: "owned" | "candidate-new",
  feeUsd: number,
): StoredSubscriptionResourceInput {
  const base = {
    contractVersion: "subscription-resource-v1" as const,
    id,
    offeringRef: {
      providerId: "custom.account-0001",
      offeringId: "subscription.custom.general",
    },
    availability: {
      status: "uncertain" as const,
      evidence: observed("Availability is user observed"),
    },
    quota: {
      kind: "opaque" as const,
      description: "Private variable quota",
    },
    reset: { kind: "unknown" as const },
    overage: { kind: "none" as const },
  };

  return ownership === "owned"
    ? {
        ...base,
        ownership,
        commitment: {
          kind: "existing",
          currentFeeUsd: feeUsd,
          currency: "USD",
          billingBasis: "current-plan-period",
          evidence: observed("Existing plan fee"),
        },
      }
    : {
        ...base,
        ownership,
        commitment: {
          kind: "new",
          feeUsd,
          currency: "USD",
          billingBasis: "one-plan-period",
          evidence: observed("Candidate plan fee"),
        },
      };
}

function resolvedResource(
  id: string,
  ownership: "owned" | "candidate-new",
  feeUsd: number,
): ResolvedSubscriptionResource {
  const result = resolveStoredSubscriptionResource(
    storedResource(id, ownership, feeUsd),
    PLANNING_AS_OF,
  );
  expect(result.status).toBe("conditional");
  if (result.status !== "conditional" || result.resource === null) {
    throw new Error("Expected a resolver-issued conditional resource fixture.");
  }
  return result.resource;
}

function routeFor(resource: ResolvedSubscriptionResource): SubscriptionRouteIdentity {
  return Object.freeze({
    providerId: resource.offeringRef.providerId as AccessProviderId,
    offeringId: resource.offeringRef.offeringId,
    resourceId: resource.id,
  });
}

describe("subscription commitment ledger", () => {
  it("keeps owned subscription use at zero incremental cash", () => {
    const resource = resolvedResource("resource.custom.owned-0001", "owned", 25);
    const routeIdentity = routeFor(resource);
    const sourceBefore = JSON.stringify(resource);

    const ledger = activateSubscriptionCommitment(
      createDerivedSubscriptionCommitmentLedger(),
      { resource, routeIdentity },
    );

    expect(ledger).toEqual({
      kind: "subscription-commitment-ledger",
      components: [
        {
          kind: "existing-included",
          resourceRouteIdentity: routeIdentity,
          incrementalCashMicroUsd: 0,
        },
      ],
      totalIncrementalCashMicroUsd: 0,
    });
    expect(JSON.stringify(resource)).toBe(sourceBefore);
    expect(Object.isFrozen(resource)).toBe(true);
  });

  it("charges a candidate plan-period fee exactly once per canonical resource", () => {
    const resource = resolvedResource(
      "resource.custom.candidate-0001",
      "candidate-new",
      12.345678,
    );
    const activation = { resource, routeIdentity: routeFor(resource) };
    const once = activateSubscriptionCommitment(
      createDerivedSubscriptionCommitmentLedger(),
      activation,
    );
    const twice = activateSubscriptionCommitment(once, activation);

    expect(twice).toBe(once);
    expect(twice.components).toHaveLength(1);
    expect(twice.components[0]).toMatchObject({
      kind: "new-subscription-commitment",
      fullPlanPeriodFeeMicroUsd: 12_345_678,
    });
    expect(twice.totalIncrementalCashMicroUsd).toBe(12_345_678);
  });

  it("does not charge an unused resource", () => {
    const used = resolvedResource(
      "resource.custom.used-0001",
      "candidate-new",
      10,
    );
    resolvedResource("resource.custom.unused-0001", "candidate-new", 100);

    const ledger = buildSubscriptionCommitmentLedger([
      { resource: used, routeIdentity: routeFor(used) },
    ]);
    expect(ledger.components).toHaveLength(1);
    expect(ledger.totalIncrementalCashMicroUsd).toBe(10_000_000);
  });

  it("sorts canonical resources so activation input order cannot change output", () => {
    const first = resolvedResource(
      "resource.custom.account-0001",
      "candidate-new",
      10,
    );
    const second = resolvedResource(
      "resource.custom.account-0002",
      "candidate-new",
      20,
    );
    const firstActivation = { resource: first, routeIdentity: routeFor(first) };
    const secondActivation = { resource: second, routeIdentity: routeFor(second) };

    const forward = buildSubscriptionCommitmentLedger([
      firstActivation,
      secondActivation,
    ]);
    const reverse = buildSubscriptionCommitmentLedger([
      secondActivation,
      firstActivation,
    ]);

    expect(reverse).toEqual(forward);
    expect(forward.components.map(({ resourceRouteIdentity }) => resourceRouteIdentity.resourceId))
      .toEqual(["resource.custom.account-0001", "resource.custom.account-0002"]);
    expect(forward.totalIncrementalCashMicroUsd).toBe(30_000_000);
  });

  it("rejects forged ledgers, cloned resources, and mismatched routes", () => {
    const resource = resolvedResource(
      "resource.custom.authentic-0001",
      "candidate-new",
      10,
    );
    const routeIdentity = routeFor(resource);
    const ledger = createDerivedSubscriptionCommitmentLedger();

    expect(isDerivedSubscriptionCommitmentLedger(ledger)).toBe(true);
    expect(isDerivedSubscriptionCommitmentLedger({ ...ledger })).toBe(false);
    expect(() =>
      activateSubscriptionCommitment({ ...ledger }, { resource, routeIdentity }),
    ).toThrow(/derived ledger/);
    expect(() =>
      activateSubscriptionCommitment(ledger, {
        resource: { ...resource },
        routeIdentity,
      }),
    ).toThrow(/resolver-issued resource/);
    expect(() =>
      activateSubscriptionCommitment(ledger, {
        resource,
        routeIdentity: { ...routeIdentity, resourceId: "resource.custom.other-0001" },
      }),
    ).toThrow(/exactly match/);
  });

  it("keeps every issued ledger and component deeply frozen", () => {
    const resource = resolvedResource(
      "resource.custom.frozen-0001",
      "candidate-new",
      10,
    );
    const ledger = buildSubscriptionCommitmentLedger([
      { resource, routeIdentity: routeFor(resource) },
    ]);

    expect(Object.isFrozen(ledger)).toBe(true);
    expect(Object.isFrozen(ledger.components)).toBe(true);
    expect(Object.isFrozen(ledger.components[0])).toBe(true);
    expect(Object.isFrozen(ledger.components[0].resourceRouteIdentity)).toBe(true);
  });

  it("rejects unsafe fees at the strict stored-input boundary", () => {
    for (const feeUsd of [
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(
        parseStoredSubscriptionResourceInput(
          storedResource("resource.custom.invalid-0001", "candidate-new", feeUsd),
        ),
      ).toEqual({
        success: false,
        reason: "invalid-subscription-resource-input",
      });
    }
  });

  it("rejects a fee that cannot be represented exactly in micro-USD at input", () => {
    expect(
      parseStoredSubscriptionResourceInput(
        storedResource(
          "resource.custom.precision-0001",
          "candidate-new",
          0.0000004,
        ),
      ),
    ).toEqual({
      success: false,
      reason: "invalid-subscription-resource-input",
    });
  });
});

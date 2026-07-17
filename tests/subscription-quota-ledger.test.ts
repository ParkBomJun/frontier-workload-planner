import { describe, expect, it } from "vitest";

import {
  createDerivedSubscriptionQuotaLedger,
  isDerivedSubscriptionQuotaLedger,
  reserveSubscriptionQuota,
  selectCanonicalSubscriptionResource,
} from "@/lib/subscriptions/quota-ledger";
import { estimateQuotaDemand } from "@/lib/subscriptions/quota-demand";
import { resolveStoredSubscriptionResource } from "@/lib/subscriptions/resource-resolver";
import type { TaskAnalysis } from "@/types/domain";
import type { SubscriptionRouteIdentity } from "@/types/offerings";
import type {
  QuotaDemandResult,
  ResolvedSubscriptionResource,
} from "@/types/subscriptions";

const PLANNING_AS_OF = "2026-07-17T12:00:00.000Z";

const analysis: TaskAnalysis = {
  taskId: "task-1",
  taskType: "software-development",
  complexity: "medium",
  reasoningDepth: "moderate",
  expectedIterations: 2,
  estimatedInputSize: "m",
  estimatedOutputSize: "m",
  uncertainty: "medium",
  recommendedModelTier: "balanced",
  workMode: "coding-agent",
  requiredQualityTier: "economy",
  requiredCapabilities: ["code-editing"],
  upgradeConditions: [],
  failureRisk: "medium",
  riskFactors: [],
  rationale: "Quota ledger fixture",
};

const observed = (note: string) => ({
  kind: "user-observed" as const,
  observedAt: "2026-07-17T09:00:00.000Z",
  note,
});

function sourceResource(
  resourceId: string,
  options: {
    remaining?: number;
    availability?: "available" | "unavailable" | "uncertain";
    quotaKind?: "metered" | "opaque";
    demand?: { low: number; expected: number; high: number };
    resetAt?: string;
  } = {},
) {
  const quota = options.quotaKind === "opaque"
    ? ({ kind: "opaque" as const, description: "Private variable quota" })
    : ({
        kind: "metered" as const,
        unit: "credit" as const,
        included: { value: 100, evidence: observed("Included credits") },
        remaining: {
          value: options.remaining ?? 10,
          evidence: observed("Remaining credits"),
        },
        consumptionRule: {
          kind: "observed-range-per-basis" as const,
          unit: "credit" as const,
          basis: "task" as const,
          low: options.demand?.low ?? 1,
          expected: options.demand?.expected ?? 2,
          high: options.demand?.high ?? 3,
          sampleSize: 5,
          evidence: observed("Observed consumption"),
        },
      });
  return {
    contractVersion: "subscription-resource-v1" as const,
    id: resourceId,
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
      evidence: observed("Existing subscription"),
    },
    availability: {
      status: options.availability ?? "available",
      evidence: observed("Plan availability"),
    },
    quota,
    reset: options.resetAt
      ? {
          kind: "fixed" as const,
          cadenceDays: 30,
          nextResetAt: options.resetAt,
          evidence: observed("Displayed reset"),
        }
      : { kind: "none" as const },
    overage: { kind: "none" as const },
  };
}

function resolveResource(
  resourceId = "resource.github.account-0001",
  options: Parameters<typeof sourceResource>[1] = {},
): ResolvedSubscriptionResource {
  const result = resolveStoredSubscriptionResource(
    sourceResource(resourceId, options),
    PLANNING_AS_OF,
  );
  if (result.status !== "conditional" || result.resource === null) {
    throw new Error("Fixture requires a resolver-issued conditional resource.");
  }
  return result.resource;
}

function route(resource: ResolvedSubscriptionResource): SubscriptionRouteIdentity {
  return {
    providerId: resource.offeringRef.providerId,
    offeringId: resource.offeringRef.offeringId,
    resourceId: resource.id,
  };
}

function workload(taskId = analysis.taskId, expectedIterations = analysis.expectedIterations) {
  return { ...analysis, taskId, expectedIterations };
}

function observedDemand(
  resource: ResolvedSubscriptionResource,
  taskAnalysis: TaskAnalysis = analysis,
): QuotaDemandResult {
  return estimateQuotaDemand({
    quota: resource.quota,
    analysis: taskAnalysis,
    evidenceSubject: {
      providerId: resource.offeringRef.providerId,
      subjectId: resource.id,
    },
  });
}

describe("derived subscription quota ledger", () => {
  it("reserves the conservative High observation without mutating source state", () => {
    const source = sourceResource("resource.github.account-0001");
    const before = structuredClone(source);
    const resolution = resolveStoredSubscriptionResource(source, PLANNING_AS_OF);
    if (resolution.status !== "conditional" || resolution.resource === null) {
      throw new Error("Fixture did not resolve.");
    }
    const resource = resolution.resource;
    const ledger = createDerivedSubscriptionQuotaLedger(
      resource,
      route(resource),
      PLANNING_AS_OF,
    );
    const result = reserveSubscriptionQuota({
      resource,
      ledger,
      taskId: "task-1",
      analysis,
      demand: observedDemand(resource),
      planningAsOf: PLANNING_AS_OF,
    });

    expect(result).toMatchObject({
      status: "conditional",
      reservation: { reservedUnits: 3, reservationBasis: "high-conditional" },
      ledger: { sourceAvailableUnits: 10, remainingUnits: 7 },
      reasonCodes: ["consumption-user-observed"],
    });
    expect(ledger).toMatchObject({ sourceAvailableUnits: 10, remainingUnits: 10 });
    expect(source).toEqual(before);
  });

  it("accepts the exact boundary, declines one unit above it, and rejects duplicates", () => {
    const resource = resolveResource("resource.github.account-exact", {
      demand: { low: 8, expected: 9, high: 10 },
    });
    const ledger = createDerivedSubscriptionQuotaLedger(
      resource,
      route(resource),
      PLANNING_AS_OF,
    );
    const exact = reserveSubscriptionQuota({
      resource,
      ledger,
      taskId: "task-exact",
      analysis: workload("task-exact"),
      demand: observedDemand(resource, workload("task-exact")),
      planningAsOf: PLANNING_AS_OF,
    });
    expect(exact).toMatchObject({
      status: "conditional",
      reservation: { reservedUnits: 10 },
      ledger: { remainingUnits: 0 },
    });

    const aboveResource = resolveResource("resource.github.account-above", {
      demand: { low: 9, expected: 10, high: 11 },
    });
    const aboveLedger = createDerivedSubscriptionQuotaLedger(
      aboveResource,
      route(aboveResource),
      PLANNING_AS_OF,
    );
    const above = reserveSubscriptionQuota({
      resource: aboveResource,
      ledger: aboveLedger,
      taskId: "task-above",
      analysis: workload("task-above"),
      demand: observedDemand(aboveResource, workload("task-above")),
      planningAsOf: PLANNING_AS_OF,
    });
    expect(above).toMatchObject({
      status: "conditional",
      reservation: null,
      ledger: { remainingUnits: 10 },
      reasonCodes: [
        "consumption-user-observed",
        "quota-insufficient-observed",
      ],
    });

    if (exact.status !== "conditional") throw new Error("Expected conditional result.");
    expect(
      reserveSubscriptionQuota({
        resource,
        ledger: exact.ledger,
        taskId: "task-exact",
        analysis: workload("task-exact"),
        demand: observedDemand(resource, workload("task-exact")),
        planningAsOf: PLANNING_AS_OF,
      }),
    ).toMatchObject({ status: "unavailable", reasonCode: "duplicate-task-reservation" });
  });

  it("never invents numeric capacity for opaque quota", () => {
    const resource = resolveResource("resource.github.opaque-0001", {
      quotaKind: "opaque",
      availability: "uncertain",
    });
    const ledger = createDerivedSubscriptionQuotaLedger(
      resource,
      route(resource),
      PLANNING_AS_OF,
    );
    const result = reserveSubscriptionQuota({
      resource,
      ledger,
      taskId: "task-opaque",
      analysis: workload("task-opaque"),
      demand: observedDemand(resource, workload("task-opaque")),
      planningAsOf: PLANNING_AS_OF,
    });

    expect(result).toEqual({
      status: "conditional",
      ledger: {
        kind: "opaque",
        routeIdentity: route(resource),
        planningAsOf: PLANNING_AS_OF,
        suggestedTaskIds: ["task-opaque"],
        description: "Private variable quota",
      },
      reservation: null,
      reasonCodes: ["availability-uncertain", "quota-opaque"],
    });
    expect("remainingUnits" in result.ledger).toBe(false);
  });

  it("keeps explicitly unavailable resources unavailable across derived ledgers", () => {
    const resource = resolveResource("resource.github.unavailable-0001", {
      availability: "unavailable",
    });
    const ledger = createDerivedSubscriptionQuotaLedger(
      resource,
      route(resource),
      PLANNING_AS_OF,
    );
    expect(
      reserveSubscriptionQuota({
        resource,
        ledger,
        taskId: "task-1",
        analysis,
        demand: observedDemand(resource),
        planningAsOf: PLANNING_AS_OF,
      }),
    ).toMatchObject({ status: "unavailable", reasonCode: "resource-unavailable" });
  });

  it("uses fixed decimal quota at repeated fractional exact boundaries", () => {
    const resource = resolveResource("resource.github.fractional-0001", {
      remaining: 0.3,
      demand: { low: 0.1, expected: 0.1, high: 0.1 },
    });
    let ledger = createDerivedSubscriptionQuotaLedger(
      resource,
      route(resource),
      PLANNING_AS_OF,
    );
    for (const taskId of ["task-1", "task-2", "task-3"]) {
      const result = reserveSubscriptionQuota({
        resource,
        ledger,
        taskId,
        analysis: workload(taskId),
        demand: observedDemand(resource, workload(taskId)),
        planningAsOf: PLANNING_AS_OF,
      });
      expect(result.status).toBe("conditional");
      if (result.status !== "conditional") throw new Error("Expected conditional.");
      expect(result.reservation).not.toBeNull();
      ledger = result.ledger;
    }
    expect(ledger).toMatchObject({
      remainingUnits: 0,
      remainingMicrounits: 0,
      sourceAvailableUnits: 0.3,
      sourceAvailableMicrounits: 300_000,
    });
  });

  it("rejects cloned ledgers and mismatched resource routes", () => {
    const resource = resolveResource();
    const identity = route(resource);
    const ledger = createDerivedSubscriptionQuotaLedger(
      resource,
      identity,
      PLANNING_AS_OF,
    );
    expect(isDerivedSubscriptionQuotaLedger(ledger)).toBe(true);
    expect(isDerivedSubscriptionQuotaLedger({ ...ledger })).toBe(false);
    expect(() =>
      reserveSubscriptionQuota({
        resource,
        ledger: { ...ledger },
        taskId: "task-1",
        analysis,
        demand: observedDemand(resource),
        planningAsOf: PLANNING_AS_OF,
      }),
    ).toThrow(/resolved matching source state/);
    const demand = observedDemand(resource);
    expect(() =>
      reserveSubscriptionQuota({
        resource,
        ledger,
        taskId: "task-demand-clone",
        analysis: workload("task-demand-clone"),
        demand: { ...demand },
        planningAsOf: PLANNING_AS_OF,
      }),
    ).toThrow(/resolved matching source state/);
    const smallerWorkload = workload("task-demand-reuse", 1);
    const largerWorkload = workload("task-demand-reuse", 3);
    expect(() =>
      reserveSubscriptionQuota({
        resource,
        ledger,
        taskId: largerWorkload.taskId,
        analysis: largerWorkload,
        demand: observedDemand(resource, smallerWorkload),
        planningAsOf: PLANNING_AS_OF,
      }),
    ).toThrow(/resolved matching source state/);
    const otherResource = resolveResource("resource.github.account-other");
    expect(() =>
      reserveSubscriptionQuota({
        resource,
        ledger,
        taskId: "task-wrong-demand",
        analysis: workload("task-wrong-demand"),
        demand: observedDemand(otherResource),
        planningAsOf: PLANNING_AS_OF,
      }),
    ).toThrow(/resolved matching source state/);
    const sameRouteNewSnapshot = resolveResource(resource.id, { remaining: 9 });
    expect(route(sameRouteNewSnapshot)).toEqual(route(resource));
    expect(() =>
      reserveSubscriptionQuota({
        resource: sameRouteNewSnapshot,
        ledger,
        taskId: "task-rebound-resource",
        analysis: workload("task-rebound-resource"),
        demand: observedDemand(
          sameRouteNewSnapshot,
          workload("task-rebound-resource"),
        ),
        planningAsOf: PLANNING_AS_OF,
      }),
    ).toThrow(/resolved matching source state/);
    expect(() =>
      createDerivedSubscriptionQuotaLedger(
        resource,
        {
          ...identity,
          resourceId: "resource.github.other",
        },
        PLANNING_AS_OF,
      ),
    ).toThrow(/must match/);
    expect(() =>
      reserveSubscriptionQuota({
        resource,
        ledger,
        taskId: "task-1",
        analysis,
        demand: observedDemand(resource),
        planningAsOf: "2026-02-30T00:00:00.000Z",
      }),
    ).toThrow(/resolved matching source state/);
  });

  it("chooses the canonical resource independently of input enumeration order", () => {
    const alpha = resolveResource("resource.github.account-alpha");
    const beta = resolveResource("resource.github.account-beta");
    const candidate = (resource: ResolvedSubscriptionResource) => ({
      resource,
      routeIdentity: route(resource),
      ledger: createDerivedSubscriptionQuotaLedger(
        resource,
        route(resource),
        PLANNING_AS_OF,
      ),
      demand: observedDemand(resource),
    });

    const forward = selectCanonicalSubscriptionResource(
      [candidate(beta), candidate(alpha)],
      analysis,
      PLANNING_AS_OF,
    );
    const reverse = selectCanonicalSubscriptionResource(
      [candidate(alpha), candidate(beta)],
      analysis,
      PLANNING_AS_OF,
    );
    expect(forward?.candidate.routeIdentity.resourceId).toBe(
      "resource.github.account-alpha",
    );
    expect(reverse?.candidate.routeIdentity.resourceId).toBe(
      "resource.github.account-alpha",
    );
  });

  it("skips an insufficient canonical account when a later account can reserve", () => {
    const alpha = resolveResource("resource.github.account-alpha", { remaining: 1 });
    const beta = resolveResource("resource.github.account-beta", { remaining: 10 });
    const candidate = (resource: ResolvedSubscriptionResource) => ({
      resource,
      routeIdentity: route(resource),
      ledger: createDerivedSubscriptionQuotaLedger(
        resource,
        route(resource),
        PLANNING_AS_OF,
      ),
      demand: observedDemand(resource),
    });

    for (const candidates of [
      [candidate(alpha), candidate(beta)],
      [candidate(beta), candidate(alpha)],
    ]) {
      expect(
        selectCanonicalSubscriptionResource(
          candidates,
          analysis,
          PLANNING_AS_OF,
        )?.candidate.routeIdentity.resourceId,
      ).toBe("resource.github.account-beta");
    }
  });

  it("rejects duplicate or mismatched selector candidates", () => {
    const resource = resolveResource();
    const candidate = {
      resource,
      routeIdentity: route(resource),
      ledger: createDerivedSubscriptionQuotaLedger(
        resource,
        route(resource),
        PLANNING_AS_OF,
      ),
      demand: observedDemand(resource),
    };
    expect(() =>
      selectCanonicalSubscriptionResource(
        [candidate, candidate],
        analysis,
        PLANNING_AS_OF,
      ),
    ).toThrow(/must be unique/);
    expect(() =>
      selectCanonicalSubscriptionResource(
        [
          {
            ...candidate,
            routeIdentity: {
              ...candidate.routeIdentity,
              resourceId: "resource.github.other",
            },
          },
        ],
        analysis,
        PLANNING_AS_OF,
      ),
    ).toThrow(/must match exactly/);
  });

  it("requires re-resolution when planning crosses a reset boundary", () => {
    const stored = sourceResource("resource.github.reset-0001", {
      resetAt: "2026-07-18T00:00:00.000Z",
    });
    const beforeReset = resolveStoredSubscriptionResource(stored, PLANNING_AS_OF);
    if (beforeReset.status !== "conditional" || beforeReset.resource === null) {
      throw new Error("Fixture must resolve before reset.");
    }
    const resource = beforeReset.resource;
    const ledger = createDerivedSubscriptionQuotaLedger(
      resource,
      route(resource),
      PLANNING_AS_OF,
    );
    expect(() =>
      reserveSubscriptionQuota({
        resource,
        ledger,
        taskId: "task-1",
        analysis,
        demand: observedDemand(resource),
        planningAsOf: "2026-07-18T00:00:00.000Z",
      }),
    ).toThrow(/resolved matching source state/);
    expect(() =>
      createDerivedSubscriptionQuotaLedger(
        resource,
        route(resource),
        "2026-07-18T00:00:00.000Z",
      ),
    ).toThrow(/resolver-issued subscription resource/);

    expect(
      resolveStoredSubscriptionResource(
        stored,
        "2026-07-18T00:00:00.000Z",
      ),
    ).toMatchObject({ resource: { availability: { status: "uncertain" } } });
  });
});

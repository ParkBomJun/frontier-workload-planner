import { beforeEach, describe, expect, it, vi } from "vitest";

const overageMockState = vi.hoisted(() => ({
  costSequence: null as number[] | null,
  calls: 0,
}));

vi.mock("@/lib/offerings/evidence-resolver", () => ({
  isResolverIssuedProviderEvidence: () => true,
  isResolverIssuedEvidenceForClaim: () => true,
}));

vi.mock("@/lib/subscriptions/resource-resolver", () => ({
  isResolverIssuedSubscriptionResource: () => true,
  isResolverIssuedSubscriptionResourceForPlanningAsOf: () => true,
}));

vi.mock("@/lib/subscriptions/overage-resolver", () => ({
  resolvePaidOverage: (input: {
    policy: object;
    quotaUnit: "credit";
    deficitUnits: number;
    exactMicrounits?: { deficit: number };
  }) => {
    const sequencedCost =
      overageMockState.costSequence?.[overageMockState.calls];
    overageMockState.calls += 1;
    return {
      status: "covered" as const,
      unit: input.quotaUnit,
      overageUnits: input.deficitUnits,
      costMicroUsd:
        sequencedCost ??
        Math.round((input.exactMicrounits?.deficit ?? 0) / 1_000_000),
      policy: input.policy,
    };
  },
}));

import { registeredAccessProviderId } from "@/lib/offerings/route-identity";
import {
  createDerivedSubscriptionQuotaLedger,
  reserveSubscriptionQuota,
} from "@/lib/subscriptions/quota-ledger";
import { estimateQuotaDemand } from "@/lib/subscriptions/quota-demand";
import type { TaskAnalysis } from "@/types/domain";
import type {
  EvidenceFieldPath,
  ProviderPublishedEvidence,
} from "@/types/offerings";
import type { ResolvedSubscriptionResource } from "@/types/subscriptions";

const PLANNING_AS_OF = "2026-07-17T12:00:00.000Z";
const DEMAND_UNITS = 9_007_199_254;

const observed = (note: string) => ({
  kind: "user-observed" as const,
  observedAt: "2026-07-17T09:00:00.000Z",
  note,
});

function publishedEvidence(
  fieldPath: EvidenceFieldPath,
  claimId: string,
): ProviderPublishedEvidence {
  return {
    kind: "provider-published",
    authority: "allowlisted-registry-resolver",
    registryId: "test.subscription-overage",
    registryVersion: "v1",
    entryId: "test.subscription-overage.no-cap",
    claimId,
    providerId: "openai",
    subjectId: "resource.openai.no-cap-overage",
    fieldPath,
    sourceUrl: "https://example.invalid/test-only",
    verifiedAt: "2026-07-17",
  } as ProviderPublishedEvidence;
}

function confirmedResource(demandUnits = DEMAND_UNITS): ResolvedSubscriptionResource {
  return {
    contractVersion: "subscription-resource-v1",
    id: "resource.openai.no-cap-overage",
    offeringRef: {
      providerId: registeredAccessProviderId("openai"),
      offeringId: "subscription.openai.no-cap-overage",
    },
    ownership: "owned",
    commitment: {
      kind: "existing",
      currentFeeUsd: 0,
      currency: "USD",
      billingBasis: "current-plan-period",
      evidence: observed("Existing test subscription"),
    },
    availability: {
      status: "available",
      evidence: observed("Available test subscription"),
    },
    quota: {
      kind: "metered",
      unit: "credit",
      included: { value: 1, evidence: observed("Included test quota") },
      remaining: { value: 0, evidence: observed("No remaining test quota") },
      consumptionRule: {
        kind: "fixed-per-basis",
        unit: "credit",
        basis: "task",
        units: demandUnits,
        evidence: publishedEvidence(
          "subscription.quota.consumption",
          "subscription-consumption",
        ),
      },
    },
    reset: { kind: "none" },
    overage: {
      kind: "paid",
      unit: "credit",
      usdPerUnit: 0.000001,
      appliesTo: { kind: "whole-resource" },
      effectiveFrom: "2026-07-01",
      evidence: publishedEvidence(
        "subscription.overage",
        "subscription-overage",
      ),
    },
  };
}

function analysis(taskId: string): TaskAnalysis {
  return {
    taskId,
    taskType: "software-development",
    complexity: "medium",
    reasoningDepth: "moderate",
    expectedIterations: 1,
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
    rationale: "No-cap overage overflow regression fixture",
  };
}

describe("subscription quota ledger overage overflow", () => {
  beforeEach(() => {
    overageMockState.costSequence = null;
    overageMockState.calls = 0;
  });

  it("returns overage-unavailable instead of throwing on the second no-cap reservation", () => {
    const resource = confirmedResource();
    const routeIdentity = {
      providerId: resource.offeringRef.providerId,
      offeringId: resource.offeringRef.offeringId,
      resourceId: resource.id,
    };
    const demandFor = (taskAnalysis: TaskAnalysis) =>
      estimateQuotaDemand({
        quota: resource.quota,
        analysis: taskAnalysis,
        evidenceSubject: {
          providerId: resource.offeringRef.providerId,
          subjectId: resource.id,
        },
      });
    const firstAnalysis = analysis("task-overage-1");
    const firstDemand = demandFor(firstAnalysis);
    expect(firstDemand).toMatchObject({
      status: "known",
      confidence: "provider-published",
    });
    const first = reserveSubscriptionQuota({
      resource,
      ledger: createDerivedSubscriptionQuotaLedger(
        resource,
        routeIdentity,
        PLANNING_AS_OF,
      ),
      taskId: firstAnalysis.taskId,
      analysis: firstAnalysis,
      demand: firstDemand,
      planningAsOf: PLANNING_AS_OF,
    });

    expect(first).toMatchObject({
      status: "reserved",
      ledger: { overageMicrounitsUsed: 9_007_199_254_000_000 },
    });
    if (first.status !== "reserved") throw new Error("First reservation failed.");

    const secondAnalysis = analysis("task-overage-2");
    const second = reserveSubscriptionQuota({
      resource,
      ledger: first.ledger,
      taskId: secondAnalysis.taskId,
      analysis: secondAnalysis,
      demand: demandFor(secondAnalysis),
      planningAsOf: PLANNING_AS_OF,
    });
    expect(second).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-unavailable",
    });
    expect(second.ledger).toBe(first.ledger);
  });

  it("accepts an exact MAX_SAFE cumulative cost and rejects the next micro-USD", () => {
    overageMockState.costSequence = [
      Math.floor(Number.MAX_SAFE_INTEGER / 2),
      Math.ceil(Number.MAX_SAFE_INTEGER / 2),
      1,
    ];
    const resource = confirmedResource(1);
    const routeIdentity = {
      providerId: resource.offeringRef.providerId,
      offeringId: resource.offeringRef.offeringId,
      resourceId: resource.id,
    };
    const demandFor = (taskAnalysis: TaskAnalysis) =>
      estimateQuotaDemand({
        quota: resource.quota,
        analysis: taskAnalysis,
        evidenceSubject: {
          providerId: resource.offeringRef.providerId,
          subjectId: resource.id,
        },
      });
    let ledger = createDerivedSubscriptionQuotaLedger(
      resource,
      routeIdentity,
      PLANNING_AS_OF,
    );

    for (const taskId of ["task-cost-1", "task-cost-2"]) {
      const taskAnalysis = analysis(taskId);
      const result = reserveSubscriptionQuota({
        resource,
        ledger,
        taskId,
        analysis: taskAnalysis,
        demand: demandFor(taskAnalysis),
        planningAsOf: PLANNING_AS_OF,
      });
      expect(result.status).toBe("reserved");
      if (result.status !== "reserved") throw new Error("Reservation failed.");
      ledger = result.ledger;
    }
    expect(ledger).toMatchObject({
      overageMicrounitsUsed: 2_000_000,
      overageCostMicroUsd: Number.MAX_SAFE_INTEGER,
    });

    const thirdAnalysis = analysis("task-cost-3");
    const overflow = reserveSubscriptionQuota({
      resource,
      ledger,
      taskId: thirdAnalysis.taskId,
      analysis: thirdAnalysis,
      demand: demandFor(thirdAnalysis),
      planningAsOf: PLANNING_AS_OF,
    });
    expect(overflow).toMatchObject({
      status: "unavailable",
      reasonCode: "overage-unavailable",
    });
    expect(overflow.ledger).toBe(ledger);
  });
});

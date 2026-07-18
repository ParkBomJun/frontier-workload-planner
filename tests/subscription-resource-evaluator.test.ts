import { describe, expect, it } from "vitest";

import { evaluateApiOfferingCost } from "@/lib/calculation/evaluate-api-offering";
import {
  COST_SCENARIOS,
  invocationTokensForScenario,
} from "@/lib/calculation/invocation-feasibility";
import { resolveOfferingEligibility } from "@/lib/offerings/eligibility";
import { resolveApiCatalogEntry } from "@/lib/offerings/provider-catalog-adapter";
import { toOfferingEligibilityRequirement } from "@/lib/planning/workload-requirements";
import { createDerivedSubscriptionQuotaLedger } from "@/lib/subscriptions/quota-ledger";
import {
  evaluateSubscriptionResource,
  isEvaluatedSubscriptionResource,
} from "@/lib/subscriptions/resource-evaluator";
import { resolveStoredSubscriptionResource } from "@/lib/subscriptions/resource-resolver";
import type { TaskAnalysis } from "@/types/domain";
import type {
  OfferingEligibilityResult,
  ModelOpaqueSubscriptionOffering,
  SubscriptionRouteIdentity,
} from "@/types/offerings";
import type {
  ResolvedSubscriptionResource,
  SubscriptionResourceResolution,
} from "@/types/subscriptions";

const PLANNING_AS_OF = "2026-07-17T12:00:00.000Z";
const PRICING_AS_OF = "2026-07-18";

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
  rationale: "Subscription evaluation fixture",
};

const observed = (note: string) => ({
  kind: "user-observed" as const,
  observedAt: "2026-07-17T09:00:00.000Z",
  note,
});

function source(availability: "available" | "unavailable" = "available") {
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
      evidence: observed("Existing plan"),
    },
    availability: {
      status: availability,
      evidence: observed("Available in account"),
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
    reset: { kind: "none" as const },
    overage: { kind: "none" as const },
  };
}

function resolved(
  availability: "available" | "unavailable" = "available",
): {
  resolution: Extract<SubscriptionResourceResolution, { status: "conditional" }> & {
    resource: ResolvedSubscriptionResource;
  };
  resource: ResolvedSubscriptionResource;
  routeIdentity: SubscriptionRouteIdentity;
} {
  const resolution = resolveStoredSubscriptionResource(
    source(availability),
    PLANNING_AS_OF,
  );
  if (resolution.status !== "conditional" || resolution.resource === null) {
    throw new Error("Fixture requires a conditional resolver-issued resource.");
  }
  const resource = resolution.resource;
  return {
    resolution: resolution as typeof resolution & { resource: ResolvedSubscriptionResource },
    resource,
    routeIdentity: {
      providerId: resource.offeringRef.providerId,
      offeringId: resource.offeringRef.offeringId,
      resourceId: resource.id,
    },
  };
}

function subscriptionEligibility(
  resource: ResolvedSubscriptionResource,
  targetAnalysis: TaskAnalysis = analysis,
): OfferingEligibilityResult {
  const offering: ModelOpaqueSubscriptionOffering = {
    kind: "model-opaque-subscription",
    providerId: resource.offeringRef.providerId,
    id: resource.offeringRef.offeringId,
    mode: "subscription",
    supportedSurfaces: ["ide-cli"],
    evidence: observed("User-entered subscription identity"),
    eligibility: {
      kind: "unprofiled",
      reason: "model-undisclosed",
      evidence: observed("Provider does not publish a complete profile"),
    },
  };
  return resolveOfferingEligibility(
    offering,
    new Map(),
    toOfferingEligibilityRequirement(
      targetAnalysis,
      COST_SCENARIOS.map((scenario) => ({
        scenario,
        ...invocationTokensForScenario(targetAnalysis, scenario),
      })),
    ),
  );
}

function fallback(targetAnalysis: TaskAnalysis = analysis) {
  const pricing = evaluateApiOfferingCost({
    providerId: "openai",
    tier: "economy",
    analysis: targetAnalysis,
    pricingAsOf: PRICING_AS_OF,
  });
  if (pricing.status !== "priced") throw new Error("Fallback must be priced.");
  const entry = resolveApiCatalogEntry("openai", "economy");
  const eligibility = resolveOfferingEligibility(
    entry.offering,
    new Map([[entry.model.id, entry.model]]),
    toOfferingEligibilityRequirement(
      targetAnalysis,
      COST_SCENARIOS.map((scenario) => ({
        scenario,
        ...invocationTokensForScenario(targetAnalysis, scenario),
      })),
    ),
  );
  return { pricing, eligibility };
}

function evaluate(
  budgetMicroUsd: number,
  fallbackMode: "present" | "missing" = "present",
  availability: "available" | "unavailable" = "available",
) {
  const fixture = resolved(availability);
  const api = fallback();
  return evaluateSubscriptionResource({
    resolution: fixture.resolution,
    eligibility: subscriptionEligibility(fixture.resource),
    ledger: createDerivedSubscriptionQuotaLedger(
      fixture.resource,
      fixture.routeIdentity,
      PLANNING_AS_OF,
    ),
    taskId: analysis.taskId,
    analysis,
    planningAsOf: PLANNING_AS_OF,
    pricingAsOf: PRICING_AS_OF,
    fallbackEligibility: fallbackMode === "present" ? api.eligibility : null,
    fallbackPricing: fallbackMode === "present" ? api.pricing : null,
    remainingIncrementalCashBudgetMicroUsd: budgetMicroUsd,
  });
}

describe("subscription resource evaluation boundary", () => {
  it("keeps observed quota conditional and exposes the confirmed API fallback", () => {
    const api = fallback();
    const result = evaluate(api.pricing.scenarioCostMicroUsd.expected);
    expect(result).toMatchObject({
      status: "conditional",
      reasonCodes: [
        "evidence-authority-invalid",
        "profile-unverified",
        "consumption-user-observed",
      ],
      fallbackRequired: true,
      fallback: {
        status: "ready",
      },
      reservation: {
        status: "conditional",
        reservation: { reservationBasis: "high-conditional" },
      },
    });
    expect("active" in result).toBe(false);
    expect("allTasksActiveWithinBudget" in result).toBe(false);
    expect(isEvaluatedSubscriptionResource(result)).toBe(true);
    expect(isEvaluatedSubscriptionResource({ ...result })).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("marks a conditional suggestion infeasible when no compatible fallback exists", () => {
    expect(evaluate(1_000_000, "missing")).toMatchObject({
      status: "conditional",
      fallback: {
        status: "infeasible",
        reasonCode: "no-compatible-api-fallback",
      },
    });
  });

  it("distinguishes an unavailable resource from a conditional fallback failure", () => {
    expect(evaluate(1_000_000, "present", "unavailable")).toMatchObject({
      status: "unavailable",
      reasonCode: "resource-unavailable",
      reservation: { status: "unavailable", reasonCode: "resource-unavailable" },
    });
  });

  it("rejects structurally fabricated eligibility before quota evaluation", () => {
    const fixture = resolved();
    expect(() =>
      evaluateSubscriptionResource({
        resolution: fixture.resolution,
        eligibility: {
          status: "ineligible",
          providerId: fixture.resource.offeringRef.providerId,
          offeringId: fixture.resource.offeringRef.offeringId,
          modelId: null,
          reasonCodes: ["surface-incompatible"],
          scenarioFailures: [],
        },
        ledger: createDerivedSubscriptionQuotaLedger(
          fixture.resource,
          fixture.routeIdentity,
          PLANNING_AS_OF,
        ),
        taskId: analysis.taskId,
        analysis,
        planningAsOf: PLANNING_AS_OF,
        pricingAsOf: PRICING_AS_OF,
        fallbackEligibility: null,
        fallbackPricing: null,
        remainingIncrementalCashBudgetMicroUsd: 0,
      }),
    ).toThrow(/resolver-issued resource/);
  });

  it("rejects a resource bound to different Offering eligibility", () => {
    const fixture = resolved();
    expect(() =>
      evaluateSubscriptionResource({
        resolution: fixture.resolution,
        eligibility: {
          ...subscriptionEligibility(fixture.resource),
          offeringId: "subscription.github.other",
        },
        ledger: createDerivedSubscriptionQuotaLedger(
          fixture.resource,
          fixture.routeIdentity,
          PLANNING_AS_OF,
        ),
        taskId: analysis.taskId,
        analysis,
        planningAsOf: PLANNING_AS_OF,
        pricingAsOf: PRICING_AS_OF,
        fallbackEligibility: null,
        fallbackPricing: null,
        remainingIncrementalCashBudgetMicroUsd: 0,
      }),
    ).toThrow(/matching Offering eligibility/);

    expect(() =>
      evaluateSubscriptionResource({
        resolution: { ...fixture.resolution },
        eligibility: subscriptionEligibility(fixture.resource),
        ledger: createDerivedSubscriptionQuotaLedger(
          fixture.resource,
          fixture.routeIdentity,
          PLANNING_AS_OF,
        ),
        taskId: analysis.taskId,
        analysis,
        planningAsOf: PLANNING_AS_OF,
        pricingAsOf: PRICING_AS_OF,
        fallbackEligibility: null,
        fallbackPricing: null,
        remainingIncrementalCashBudgetMicroUsd: 0,
      }),
    ).toThrow(/resolver-issued resource/);
  });

  it("rejects resolver-issued subscription eligibility from another workload", () => {
    const fixture = resolved();
    const mismatchedAnalysis: TaskAnalysis = {
      ...analysis,
      requiredCapabilities: [],
    };

    expect(() =>
      evaluateSubscriptionResource({
        resolution: fixture.resolution,
        eligibility: subscriptionEligibility(
          fixture.resource,
          mismatchedAnalysis,
        ),
        ledger: createDerivedSubscriptionQuotaLedger(
          fixture.resource,
          fixture.routeIdentity,
          PLANNING_AS_OF,
        ),
        taskId: analysis.taskId,
        analysis,
        planningAsOf: PLANNING_AS_OF,
        pricingAsOf: PRICING_AS_OF,
        fallbackEligibility: null,
        fallbackPricing: null,
        remainingIncrementalCashBudgetMicroUsd: 0,
      }),
    ).toThrow(/matching Offering eligibility/);
  });
});

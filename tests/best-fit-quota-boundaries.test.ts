import { describe, expect, it } from "vitest";

import { registeredAccessProviderId } from "@/lib/offerings/route-identity";
import { allocateNormalizedBestFitPlan } from "@/lib/planning/best-fit-allocator";
import type {
  BestFitApiRouteCandidate,
  BestFitConfirmedRouteCandidate,
  BestFitScenarioMicrounits,
  BestFitSubscriptionOverageProfile,
  BestFitSubscriptionRouteCandidate,
  NormalizedBestFitTask,
} from "@/types/best-fit";
import type { TaskAnalysis, TaskInput } from "@/types/domain";
import type {
  ApiRouteIdentity,
  SubscriptionRouteIdentity,
} from "@/types/offerings";

const providerId = registeredAccessProviderId("openai");
const MAX_SAFE_MICRO_VALUE = Number.MAX_SAFE_INTEGER;

function scenario(value: number): BestFitScenarioMicrounits {
  return { low: value, expected: value, high: value };
}

function taskInput(id: string): TaskInput {
  return {
    id,
    name: `Task ${id}`,
    description: "Quota boundary regression fixture",
    priority: "high",
    deadlineDate: null,
    failureImpact: "medium",
  };
}

function taskAnalysis(taskId: string): TaskAnalysis {
  return {
    taskId,
    taskType: "software-development",
    complexity: "low",
    reasoningDepth: "light",
    expectedIterations: 1,
    estimatedInputSize: "xs",
    estimatedOutputSize: "xs",
    uncertainty: "low",
    recommendedModelTier: "economy",
    riskFactors: [],
    rationale: "Quota boundary regression fixture",
    workMode: "interactive",
    requiredQualityTier: "economy",
    requiredCapabilities: [],
    upgradeConditions: [],
    failureRisk: "low",
  };
}

function subscriptionIdentity(suffix: string): SubscriptionRouteIdentity {
  return {
    providerId,
    offeringId: `subscription.openai.${suffix}`,
    resourceId: `resource.openai.${suffix}`,
  };
}

function apiIdentity(suffix: string): ApiRouteIdentity {
  return {
    providerId,
    offeringId: `api.openai.${suffix}`,
    resourceId: null,
  };
}

function subscriptionRoute(input: {
  suffix: string;
  availableMicrounits: number;
  demandMicrounits: BestFitScenarioMicrounits;
  overage: BestFitSubscriptionOverageProfile | null;
}): BestFitSubscriptionRouteCandidate {
  const routeIdentity = subscriptionIdentity(input.suffix);
  return {
    mode: "subscription",
    routeIdentity,
    qualityTier: "economy",
    modelId: "model.openai.quota-test",
    resource: {
      routeIdentity,
      ownership: "owned",
      quotaUnit: "credit",
      availableMicrounits: input.availableMicrounits,
      fullPlanPeriodFeeMicroUsd: 0,
      overage: input.overage,
    },
    demandMicrounits: {
      ...input.demandMicrounits,
      unit: "credit",
    },
  };
}

function apiRoute(
  suffix: string,
  cashMicroUsd: number,
): BestFitApiRouteCandidate {
  return {
    mode: "api",
    routeIdentity: apiIdentity(suffix),
    qualityTier: "economy",
    modelId: "model.openai.api-fallback",
    variableCashMicroUsd: {
      low: cashMicroUsd,
      expected: cashMicroUsd,
      high: cashMicroUsd,
    },
  };
}

function normalizedTask(
  id: string,
  originalIndex: number,
  confirmedRoutes: readonly BestFitConfirmedRouteCandidate[],
): NormalizedBestFitTask {
  return {
    task: taskInput(id),
    analysis: taskAnalysis(id),
    originalIndex,
    confirmedRoutes,
    conditionalAlternatives: [],
  };
}

function allocate(
  tasks: readonly NormalizedBestFitTask[],
  incrementalCashBudgetMicroUsd = MAX_SAFE_MICRO_VALUE,
) {
  return allocateNormalizedBestFitPlan({
    tasks,
    strategy: "cost-saver",
    planningAsOf: "2026-07-17T12:00:00.000Z",
    pricingAsOf: "2026-07-17",
    incrementalCashBudgetMicroUsd,
  });
}

describe("best-fit quota boundaries", () => {
  it("accepts the exact included quota and rejects the next microunit without overage", () => {
    const exactRoute = subscriptionRoute({
      suffix: "included-exact",
      availableMicrounits: 1_000_000,
      demandMicrounits: scenario(1_000_000),
      overage: null,
    });
    const exact = allocate([
      normalizedTask("included-exact", 0, [exactRoute]),
    ]);

    expect(exact.tasks[0]).toMatchObject({
      status: "active",
      routeIdentity: exactRoute.routeIdentity,
      routeKind: "owned-within-included-quota",
    });
    expect(exact.cash.paidOverageMicroUsd).toEqual(scenario(0));

    const overByOneRoute = subscriptionRoute({
      suffix: "included-plus-one",
      availableMicrounits: 1_000_000,
      demandMicrounits: scenario(1_000_001),
      overage: null,
    });
    const withFallback = allocate([
      normalizedTask("included-plus-one-fallback", 0, [
        overByOneRoute,
        apiRoute("included-plus-one-fallback", 10),
      ]),
    ]);
    expect(withFallback.tasks[0]).toMatchObject({
      status: "active",
      routeIdentity: apiIdentity("included-plus-one-fallback"),
      routeKind: "api",
    });

    const withoutFallback = allocate([
      normalizedTask("included-plus-one-infeasible", 0, [overByOneRoute]),
    ]);
    expect(withoutFallback.tasks[0]).toMatchObject({
      status: "infeasible",
      infeasibleReason: "no-compatible-confirmed-route",
    });
  });

  it("rounds an exact 0.0000005 USD per unit half-up at one unit", () => {
    const route = subscriptionRoute({
      suffix: "half-up",
      availableMicrounits: 0,
      demandMicrounits: scenario(1_000_000),
      overage: {
        rateUsdPerUnit: { coefficient: "5", decimalScale: 7 },
        maxOverageMicrounits: null,
      },
    });
    const plan = allocate([normalizedTask("half-up", 0, [route])], 1);

    expect(plan.tasks[0]).toMatchObject({
      status: "active",
      routeIdentity: route.routeIdentity,
      variableCashMicroUsd: scenario(1),
    });
    expect(plan.cash.paidOverageMicroUsd).toEqual(scenario(1));
    expect(plan.expectedWithinBudget).toBe(true);
  });

  it("rounds cumulative overage once instead of summing independently rounded tasks", () => {
    const routeFor = () =>
      subscriptionRoute({
        suffix: "cumulative-rounding",
        availableMicrounits: 0,
        demandMicrounits: scenario(500_000),
        overage: {
          rateUsdPerUnit: { coefficient: "1", decimalScale: 6 },
          maxOverageMicrounits: null,
        },
      });
    const plan = allocate([
      normalizedTask("cumulative-first", 0, [routeFor()]),
      normalizedTask("cumulative-second", 1, [routeFor()]),
    ]);

    expect(plan.tasks).toHaveLength(2);
    expect(plan.tasks.every(({ status }) => status === "active")).toBe(true);
    expect(plan.cash.paidOverageMicroUsd).toEqual(scenario(1));
    expect(
      plan.tasks.reduce(
        (sum, task) =>
          sum + (task.status === "active" ? task.variableCashMicroUsd.expected : 0),
        0,
      ),
    ).toBe(1);
  });

  it("treats an overage cap as inclusive and rejects the next microunit", () => {
    const cappedRoute = (demandMicrounits: number) =>
      subscriptionRoute({
        suffix: "inclusive-cap",
        availableMicrounits: 0,
        demandMicrounits: scenario(demandMicrounits),
        overage: {
          rateUsdPerUnit: { coefficient: "1", decimalScale: 0 },
          maxOverageMicrounits: 1_000_000,
        },
      });

    const exact = allocate([
      normalizedTask("cap-exact", 0, [cappedRoute(1_000_000)]),
    ]);
    expect(exact.tasks[0]).toMatchObject({
      status: "active",
      variableCashMicroUsd: scenario(1_000_000),
    });

    const fallback = apiRoute("cap-plus-one-fallback", 2_000_000);
    const overByOne = allocate([
      normalizedTask("cap-plus-one-fallback", 0, [
        cappedRoute(1_000_001),
        fallback,
      ]),
    ]);
    expect(overByOne.tasks[0]).toMatchObject({
      status: "active",
      routeIdentity: fallback.routeIdentity,
      routeKind: "api",
    });

    const infeasible = allocate([
      normalizedTask("cap-plus-one-infeasible", 0, [cappedRoute(1_000_001)]),
    ]);
    expect(infeasible.tasks[0]).toMatchObject({
      status: "infeasible",
      infeasibleReason: "no-compatible-confirmed-route",
    });
  });

  it("keeps Low, Expected, and High quota ledgers independent", () => {
    const route = subscriptionRoute({
      suffix: "scenario-independence",
      availableMicrounits: 10_000_000,
      demandMicrounits: {
        low: 4_000_000,
        expected: 7_000_000,
        high: 12_000_000,
      },
      overage: {
        rateUsdPerUnit: { coefficient: "1", decimalScale: 0 },
        maxOverageMicrounits: null,
      },
    });
    const plan = allocate(
      [normalizedTask("scenario-independence", 0, [route])],
      1_000_000,
    );

    expect(plan.tasks[0]).toMatchObject({
      status: "active",
      variableCashMicroUsd: { low: 0, expected: 0, high: 2_000_000 },
    });
    expect(plan.cash.paidOverageMicroUsd).toEqual({
      low: 0,
      expected: 0,
      high: 2_000_000,
    });
    expect(plan.expectedWithinBudget).toBe(true);
    expect(plan.highExceedsBudget).toBe(true);
  });

  it("rejects overage cash beyond the safe integer boundary", () => {
    const largestSafeDemandAtTwoUsd = Math.floor(MAX_SAFE_MICRO_VALUE / 2);
    const rate = {
      rateUsdPerUnit: { coefficient: "2", decimalScale: 0 },
      maxOverageMicrounits: null,
    } satisfies BestFitSubscriptionOverageProfile;

    const boundary = allocate([
      normalizedTask("safe-cash-boundary", 0, [
        subscriptionRoute({
          suffix: "safe-cash-boundary",
          availableMicrounits: 0,
          demandMicrounits: scenario(largestSafeDemandAtTwoUsd),
          overage: rate,
        }),
      ]),
    ]);
    expect(boundary.tasks[0]).toMatchObject({
      status: "active",
      variableCashMicroUsd: scenario(largestSafeDemandAtTwoUsd * 2),
    });

    const overflow = allocate([
      normalizedTask("unsafe-cash-overflow", 0, [
        subscriptionRoute({
          suffix: "unsafe-cash-overflow",
          availableMicrounits: 0,
          demandMicrounits: scenario(largestSafeDemandAtTwoUsd + 1),
          overage: rate,
        }),
      ]),
    ]);
    expect(overflow.tasks[0]).toMatchObject({
      status: "infeasible",
      infeasibleReason: "no-compatible-confirmed-route",
    });

    expect(() =>
      allocate([
        normalizedTask("unsafe-source-value", 0, [
          subscriptionRoute({
            suffix: "unsafe-source-value",
            availableMicrounits: 0,
            demandMicrounits: scenario(MAX_SAFE_MICRO_VALUE + 1),
            overage: rate,
          }),
        ]),
      ]),
    ).toThrow(/non-negative safe integer/);
  });
});

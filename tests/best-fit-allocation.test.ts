import { describe, expect, it } from "vitest";

import { allocateNormalizedBestFitPlan } from "@/lib/planning/best-fit-allocator";
import { registeredAccessProviderId } from "@/lib/offerings/route-identity";
import type {
  BestFitApiRouteCandidate,
  BestFitConfirmedRouteCandidate,
  BestFitScenarioMicroUsd,
  BestFitSubscriptionResourceProfile,
  BestFitSubscriptionRouteCandidate,
  NormalizedBestFitTask,
} from "@/types/best-fit";
import type { TaskAnalysis, TaskInput } from "@/types/domain";
import type {
  ApiRouteIdentity,
  ConditionalAlternative,
  SubscriptionRouteIdentity,
} from "@/types/offerings";
import type { PlanningQualityTier } from "@/types/workload";

const PRICING_AS_OF = "2026-07-17";
const PLANNING_AS_OF = "2026-07-17T12:00:00.000Z";
const openai = registeredAccessProviderId("openai");
const anthropic = registeredAccessProviderId("anthropic");

function scenario(
  low: number,
  expected = low,
  high = expected,
): BestFitScenarioMicroUsd {
  return { low, expected, high };
}

function apiIdentity(
  offeringId: string,
  providerId = openai,
): ApiRouteIdentity {
  return { providerId, offeringId, resourceId: null };
}

function apiRoute(
  offeringId: string,
  qualityTier: PlanningQualityTier,
  variableCashMicroUsd: BestFitScenarioMicroUsd,
  providerId = openai,
): BestFitApiRouteCandidate {
  return {
    mode: "api",
    routeIdentity: apiIdentity(offeringId, providerId),
    qualityTier,
    modelId: `model.${offeringId}`,
    variableCashMicroUsd,
  };
}

function subscriptionIdentity(
  offeringId: string,
  resourceId: string,
): SubscriptionRouteIdentity {
  return { providerId: openai, offeringId, resourceId };
}

function subscriptionResource(
  routeIdentity: SubscriptionRouteIdentity,
  patch: Partial<BestFitSubscriptionResourceProfile> = {},
): BestFitSubscriptionResourceProfile {
  return {
    routeIdentity,
    ownership: "owned",
    quotaUnit: "credit",
    availableMicrounits: 10_000_000,
    fullPlanPeriodFeeMicroUsd: 0,
    overage: null,
    ...patch,
  };
}

function subscriptionRoute(
  resource: BestFitSubscriptionResourceProfile,
  qualityTier: PlanningQualityTier,
  demand = scenario(1_000_000),
): BestFitSubscriptionRouteCandidate {
  return {
    mode: "subscription",
    routeIdentity: resource.routeIdentity,
    qualityTier,
    modelId: null,
    resource,
    demandMicrounits: { unit: resource.quotaUnit, ...demand },
  };
}

function sourceTask(
  id: string,
  patch: Partial<TaskInput> = {},
): TaskInput {
  return {
    id,
    name: id,
    description: `Planning fixture for ${id}`,
    priority: "medium",
    deadlineDate: null,
    failureImpact: "medium",
    ...patch,
  };
}

function analysis(
  taskId: string,
  patch: Partial<TaskAnalysis> = {},
): TaskAnalysis {
  return {
    taskId,
    taskType: "software-development",
    complexity: "medium",
    reasoningDepth: "moderate",
    expectedIterations: 1,
    estimatedInputSize: "m",
    estimatedOutputSize: "m",
    uncertainty: "medium",
    recommendedModelTier: "economy",
    workMode: "interactive",
    requiredQualityTier: "economy",
    requiredCapabilities: [],
    upgradeConditions: [],
    failureRisk: "medium",
    riskFactors: [],
    rationale: `Analysis fixture for ${taskId}`,
    ...patch,
  };
}

function normalizedTask(
  id: string,
  originalIndex: number,
  confirmedRoutes: readonly BestFitConfirmedRouteCandidate[],
  options: {
    task?: Partial<TaskInput>;
    analysis?: Partial<TaskAnalysis>;
    conditionalAlternatives?: readonly ConditionalAlternative[];
  } = {},
): NormalizedBestFitTask {
  return {
    task: sourceTask(id, options.task),
    analysis: analysis(id, options.analysis),
    originalIndex,
    confirmedRoutes,
    conditionalAlternatives: options.conditionalAlternatives ?? [],
  };
}

function allocate(
  tasks: readonly NormalizedBestFitTask[],
  patch: Partial<{
    strategy: "cost-saver" | "balanced" | "quality-first";
    incrementalCashBudgetMicroUsd: number;
  }> = {},
) {
  return allocateNormalizedBestFitPlan({
    tasks,
    strategy: patch.strategy ?? "cost-saver",
    planningAsOf: PLANNING_AS_OF,
    pricingAsOf: PRICING_AS_OF,
    incrementalCashBudgetMicroUsd:
      patch.incrementalCashBudgetMicroUsd ?? 100_000_000,
  });
}

function resultFor(
  plan: ReturnType<typeof allocate>,
  taskId: string,
) {
  const result = plan.tasks.find((task) => task.taskId === taskId);
  if (result === undefined) throw new Error(`Missing result for ${taskId}`);
  return result;
}

describe("Best-fit complete allocation", () => {
  it("chooses one shared $10 subscription for two $6 API tasks, but keeps one $6 API task", () => {
    const identity = subscriptionIdentity(
      "subscription.openai.shared",
      "resource.openai.shared-0001",
    );
    const resource = subscriptionResource(identity, {
      ownership: "candidate-new",
      availableMicrounits: 2_000_000,
      fullPlanPeriodFeeMicroUsd: 10_000_000,
    });
    const routes = (taskNumber: number): BestFitConfirmedRouteCandidate[] => [
      apiRoute(
        `api.openai.economy-${taskNumber}`,
        "economy",
        scenario(6_000_000),
      ),
      subscriptionRoute(resource, "economy"),
    ];

    const shared = allocate([
      normalizedTask("task-shared-1", 0, routes(1)),
      normalizedTask("task-shared-2", 1, routes(2)),
    ]);
    expect(shared).toMatchObject({
      activeTaskCount: 2,
      heldTaskCount: 0,
      cash: {
        expectedMicroUsd: 10_000_000,
        subscriptionFeeMicroUsd: 10_000_000,
      },
      activatedSubscriptionRoutes: [identity],
    });
    expect(shared.tasks.every(
      (task) => task.status === "active" && task.routeIdentity.resourceId !== null,
    )).toBe(true);

    const single = allocate([
      normalizedTask("task-single", 0, routes(1)),
    ]);
    expect(single).toMatchObject({
      cash: {
        expectedMicroUsd: 6_000_000,
        subscriptionFeeMicroUsd: 0,
      },
      activatedSubscriptionRoutes: [],
    });
    expect(resultFor(single, "task-single")).toMatchObject({
      status: "active",
      routeIdentity: apiIdentity("api.openai.economy-1"),
    });
  });

  it("classifies an unaffordable confirmed new subscription as held without charging its unused fee", () => {
    const identity = subscriptionIdentity(
      "subscription.openai.unaffordable",
      "resource.openai.unaffordable-0001",
    );
    const resource = subscriptionResource(identity, {
      ownership: "candidate-new",
      availableMicrounits: 1_000_000,
      fullPlanPeriodFeeMicroUsd: 10_000_000,
    });

    const plan = allocate(
      [
        normalizedTask("task-unaffordable-subscription", 0, [
          subscriptionRoute(resource, "economy"),
        ]),
      ],
      { incrementalCashBudgetMicroUsd: 5_000_000 },
    );

    expect(resultFor(plan, "task-unaffordable-subscription")).toMatchObject({
      status: "held",
      holdReason: "incremental-cash-budget-exhausted",
    });
    expect(plan).toMatchObject({
      expectedWithinBudget: true,
      heldTaskCount: 1,
      infeasibleTaskCount: 0,
      activatedSubscriptionRoutes: [],
      cash: {
        expectedMicroUsd: 0,
        subscriptionFeeMicroUsd: 0,
      },
    });
  });

  it("rebuilds after add-one activation so an unused subscription cannot remain an alternative", () => {
    const routeFor = (
      suffix: string,
      feeMicroUsd: number,
      capacityTasks: number,
    ) => {
      const identity = subscriptionIdentity(
        `subscription.openai.${suffix}`,
        `resource.openai.${suffix}-0001`,
      );
      return subscriptionRoute(
        subscriptionResource(identity, {
          ownership: "candidate-new",
          availableMicrounits: capacityTasks * 1_000_000,
          fullPlanPeriodFeeMicroUsd: feeMicroUsd,
        }),
        "economy",
      );
    };
    const routeA = routeFor("activation-a", 1_000_000, 1);
    const routeB = routeFor("activation-b", 12_000_000, 3);
    const routeC = routeFor("activation-c", 8_000_000, 2);
    const apiFor = (suffix: string) =>
      apiRoute(`api.openai.activation-${suffix}`, "economy", scenario(12_000_000));

    const plan = allocate([
      normalizedTask("task-activation-0", 0, [apiFor("0"), routeB, routeC]),
      normalizedTask("task-activation-1", 1, [apiFor("1"), routeA, routeC]),
      normalizedTask("task-activation-2", 2, [apiFor("2"), routeB]),
    ]);

    expect(plan.cash.expectedMicroUsd).toBe(13_000_000);
    expect(plan.activatedSubscriptionRoutes).toEqual([
      routeA.routeIdentity,
      routeB.routeIdentity,
    ]);
    expect(
      plan.tasks.every(
        (task) =>
          task.status !== "active" ||
          task.alternativeRouteIdentity === null ||
          task.alternativeRouteIdentity.offeringId !==
            routeC.routeIdentity.offeringId,
      ),
    ).toBe(true);
  });

  it("ignores an optional add-one subscription whose aggregate cash exceeds the safe range", () => {
    const identity = subscriptionIdentity(
      "subscription.openai.overflow-trial",
      "resource.openai.overflow-trial-0001",
    );
    const overflowTrial = subscriptionRoute(
      subscriptionResource(identity, {
        ownership: "candidate-new",
        availableMicrounits: 1_000_000,
        fullPlanPeriodFeeMicroUsd: Number.MAX_SAFE_INTEGER,
      }),
      "economy",
    );
    const firstApi = apiRoute("api.openai.overflow-first", "economy", scenario(1));
    const secondApi = apiRoute("api.openai.overflow-second", "economy", scenario(1));

    const plan = allocate(
      [
        normalizedTask("task-overflow-first", 0, [firstApi, overflowTrial]),
        normalizedTask("task-overflow-second", 1, [secondApi]),
      ],
      { incrementalCashBudgetMicroUsd: 100 },
    );

    expect(plan.cash.expectedMicroUsd).toBe(2);
    expect(plan.activatedSubscriptionRoutes).toEqual([]);
    expect(resultFor(plan, "task-overflow-first")).toMatchObject({
      status: "active",
      routeIdentity: firstApi.routeIdentity,
    });
  });

  it("relieves an overflowing base API plan instead of throwing", () => {
    const largest = apiRoute(
      "api.openai.base-overflow-largest",
      "economy",
      scenario(Number.MAX_SAFE_INTEGER),
    );
    const smallest = apiRoute(
      "api.openai.base-overflow-smallest",
      "economy",
      scenario(1),
    );

    const plan = allocate(
      [
        normalizedTask("task-base-overflow-largest", 0, [largest], {
          task: { priority: "low" },
        }),
        normalizedTask("task-base-overflow-smallest", 1, [smallest], {
          task: { priority: "high" },
        }),
      ],
      { incrementalCashBudgetMicroUsd: 100 },
    );

    expect(resultFor(plan, "task-base-overflow-largest")).toMatchObject({
      status: "held",
    });
    expect(resultFor(plan, "task-base-overflow-smallest")).toMatchObject({
      status: "active",
      routeIdentity: smallest.routeIdentity,
    });
    expect(plan.cash.expectedMicroUsd).toBe(1);
  });

  it("uses exact BigInt cash to complete multiple relief steps while totals still overflow", () => {
    const routesFor = (suffix: string) => [
      apiRoute(
        `api.openai.overflow-balanced-${suffix}`,
        "balanced",
        scenario(Number.MAX_SAFE_INTEGER),
      ),
      apiRoute(
        `api.openai.overflow-economy-${suffix}`,
        "economy",
        scenario(1),
      ),
    ];
    const plan = allocate(
      [
        normalizedTask("task-overflow-step-1", 0, routesFor("1"), {
          analysis: { upgradeConditions: ["deep-reasoning"] },
        }),
        normalizedTask("task-overflow-step-2", 1, routesFor("2"), {
          analysis: { upgradeConditions: ["deep-reasoning"] },
        }),
      ],
      {
        strategy: "quality-first",
        incrementalCashBudgetMicroUsd: 100,
      },
    );

    expect(plan.activeTaskCount).toBe(2);
    expect(plan.heldTaskCount).toBe(0);
    expect(plan.cash.expectedMicroUsd).toBe(2);
    expect(
      plan.tasks.every(
        (task) => task.status === "active" && task.qualityTier === "economy",
      ),
    ).toBe(true);
  });

  it("accepts an exact safe-range boundary reached from an overflowing plan", () => {
    const balanced = apiRoute(
      "api.openai.safe-boundary-balanced",
      "balanced",
      scenario(Number.MAX_SAFE_INTEGER),
    );
    const economy = apiRoute(
      "api.openai.safe-boundary-economy",
      "economy",
      scenario(Number.MAX_SAFE_INTEGER - 1),
    );
    const one = apiRoute("api.openai.safe-boundary-one", "economy", scenario(1));
    const plan = allocate(
      [
        normalizedTask("task-safe-boundary-main", 0, [balanced, economy], {
          analysis: { upgradeConditions: ["deep-reasoning"] },
        }),
        normalizedTask("task-safe-boundary-one", 1, [one]),
      ],
      {
        strategy: "quality-first",
        incrementalCashBudgetMicroUsd: Number.MAX_SAFE_INTEGER,
      },
    );

    expect(plan.activeTaskCount).toBe(2);
    expect(plan.heldTaskCount).toBe(0);
    expect(plan.cash.expectedMicroUsd).toBe(Number.MAX_SAFE_INTEGER);
    expect(resultFor(plan, "task-safe-boundary-main")).toMatchObject({
      status: "active",
      routeIdentity: economy.routeIdentity,
    });
  });

  it("keeps Expected work active when only the High scenario aggregate overflows", () => {
    const highRange = (suffix: string) =>
      apiRoute(
        `api.openai.high-overflow-${suffix}`,
        "economy",
        scenario(1, 1, Number.MAX_SAFE_INTEGER),
      );
    const plan = allocate(
      [
        normalizedTask("task-high-overflow-1", 0, [highRange("1")]),
        normalizedTask("task-high-overflow-2", 1, [highRange("2")]),
      ],
      { incrementalCashBudgetMicroUsd: 100 },
    );

    expect(plan).toMatchObject({
      activeTaskCount: 2,
      heldTaskCount: 0,
      expectedWithinBudget: true,
      highExceedsBudget: true,
      cash: {
        expectedMicroUsd: 2,
        highMicroUsd: Number.MAX_SAFE_INTEGER,
        scenarioOverflow: { low: false, expected: false, high: true },
      },
    });
  });

  it("uses exact High cash to break Cost Saver ties after numeric projection saturates", () => {
    const identity = subscriptionIdentity(
      "subscription.openai.exact-high",
      "resource.openai.exact-high-0001",
    );
    const subscription = subscriptionRoute(
      subscriptionResource(identity, {
        ownership: "candidate-new",
        availableMicrounits: 1_000_000,
        fullPlanPeriodFeeMicroUsd: 1,
      }),
      "economy",
    );
    const firstApi = apiRoute(
      "api.openai.exact-high-first",
      "economy",
      scenario(1, 1, Number.MAX_SAFE_INTEGER),
    );
    const secondApi = apiRoute(
      "api.openai.exact-high-second",
      "economy",
      scenario(1, 1, Number.MAX_SAFE_INTEGER),
    );
    const plan = allocate(
      [
        normalizedTask("task-exact-high-first", 0, [firstApi, subscription]),
        normalizedTask("task-exact-high-second", 1, [secondApi]),
      ],
      { incrementalCashBudgetMicroUsd: 100 },
    );

    expect(plan.activatedSubscriptionRoutes).toEqual([identity]);
    expect(resultFor(plan, "task-exact-high-first")).toMatchObject({
      status: "active",
      routeIdentity: identity,
    });
    expect(plan.cash).toMatchObject({
      expectedMicroUsd: 2,
      highMicroUsd: Number.MAX_SAFE_INTEGER,
      scenarioOverflow: { high: true },
    });
  });

  it("keeps Cost Saver cash-first: $0 owned Balanced beats $1 Economy, while equal cash selects Economy", () => {
    const identity = subscriptionIdentity(
      "subscription.openai.owned-balanced",
      "resource.openai.owned-balanced-0001",
    );
    const owned = subscriptionRoute(
      subscriptionResource(identity),
      "balanced",
    );
    const economyOne = apiRoute(
      "api.openai.economy-one",
      "economy",
      scenario(1),
    );
    const cheaper = allocate([
      normalizedTask("task-owned-cheaper", 0, [economyOne, owned]),
    ]);
    expect(resultFor(cheaper, "task-owned-cheaper")).toMatchObject({
      status: "active",
      routeIdentity: identity,
      qualityTier: "balanced",
      whyEnough: "higher-tier-saved-cash",
    });

    const economyFree = apiRoute(
      "api.openai.economy-free",
      "economy",
      scenario(0),
    );
    const equal = allocate([
      normalizedTask("task-equal-cash", 0, [owned, economyFree]),
    ]);
    expect(resultFor(equal, "task-equal-cash")).toMatchObject({
      status: "active",
      routeIdentity: economyFree.routeIdentity,
      qualityTier: "economy",
    });
  });

  it("does not treat an owned paid-overage route as a new subscription activation", () => {
    const ownedIdentity = subscriptionIdentity(
      "subscription.openai.z-owned",
      "resource.openai.z-owned-0001",
    );
    const owned = subscriptionRoute(
      subscriptionResource(ownedIdentity, {
        availableMicrounits: 0,
        overage: {
          rateUsdPerUnit: { coefficient: "1", decimalScale: 0 },
          maxOverageMicrounits: null,
        },
      }),
      "economy",
    );
    const candidateIdentity = subscriptionIdentity(
      "subscription.openai.a-new",
      "resource.openai.a-new-0001",
    );
    const candidate = subscriptionRoute(
      subscriptionResource(candidateIdentity, {
        ownership: "candidate-new",
        availableMicrounits: 1_000_000,
        fullPlanPeriodFeeMicroUsd: 1_000_000,
      }),
      "economy",
    );

    const plan = allocate([
      normalizedTask("task-owned-not-activated", 0, [candidate, owned]),
    ], { strategy: "balanced" });

    expect(resultFor(plan, "task-owned-not-activated")).toMatchObject({
      status: "active",
      routeIdentity: ownedIdentity,
      routeKind: "owned-paid-overage",
    });
    expect(plan.activatedSubscriptionRoutes).toEqual([]);
    expect(plan.cash).toMatchObject({
      expectedMicroUsd: 1_000_000,
      subscriptionFeeMicroUsd: 0,
      paidOverageMicroUsd: scenario(1_000_000),
    });
  });

  it("applies Quality First only for closed triggers, excludes untriggered Premium, and permits the minimum Premium fallback", () => {
    const economy = apiRoute("api.openai.economy", "economy", scenario(0));
    const balanced = apiRoute("api.openai.balanced", "balanced", scenario(2));
    const premium = apiRoute("api.openai.premium", "premium", scenario(1));

    const triggered = allocate([
      normalizedTask("task-triggered", 0, [economy, premium, balanced], {
        analysis: { upgradeConditions: ["deep-reasoning"] },
      }),
    ], { strategy: "quality-first" });
    expect(resultFor(triggered, "task-triggered")).toMatchObject({
      status: "active",
      routeIdentity: balanced.routeIdentity,
      qualityTier: "balanced",
      strategyTargetTier: "balanced",
      appliedUpgradeTriggers: ["deep-reasoning"],
      whyEnough: "quality-headroom-triggered",
    });

    const untriggered = allocate([
      normalizedTask("task-untriggered", 0, [premium, economy]),
    ], { strategy: "quality-first" });
    expect(resultFor(untriggered, "task-untriggered")).toMatchObject({
      status: "active",
      routeIdentity: economy.routeIdentity,
      qualityTier: "economy",
      appliedUpgradeTriggers: [],
      whyNotPremium: "premium-not-triggered",
    });

    const fallback = allocate([
      normalizedTask("task-premium-fallback", 0, [premium]),
    ]);
    expect(resultFor(fallback, "task-premium-fallback")).toMatchObject({
      status: "active",
      routeIdentity: premium.routeIdentity,
      qualityTier: "premium",
      appliedUpgradeTriggers: ["minimum-quality-requires-premium"],
      whyEnough: "minimum-quality-requires-premium",
    });
  });

  it("keeps a Premium hard floor separate from the compatibility fallback trigger", () => {
    const premium = apiRoute(
      "api.openai.premium-hard-floor",
      "premium",
      scenario(3),
    );

    for (const strategy of [
      "cost-saver",
      "balanced",
      "quality-first",
    ] as const) {
      const plan = allocate([
        normalizedTask(`task-premium-floor-${strategy}`, 0, [premium], {
          analysis: { requiredQualityTier: "premium" },
        }),
      ], { strategy });
      expect(resultFor(plan, `task-premium-floor-${strategy}`)).toMatchObject({
        status: "active",
        routeIdentity: premium.routeIdentity,
        appliedUpgradeTriggers: [],
        whyEnough: "minimum-quality-met",
      });
    }

    const belowFloor = allocate([
      normalizedTask(
        "task-premium-floor-unavailable",
        0,
        [apiRoute("api.openai.balanced-only", "balanced", scenario(1))],
        { analysis: { requiredQualityTier: "premium" } },
      ),
    ]);
    expect(resultFor(belowFloor, "task-premium-floor-unavailable")).toMatchObject({
      status: "infeasible",
      appliedUpgradeTriggers: [],
    });
  });

  it("does not invent a Premium fallback trigger from a relief-only route ban", () => {
    const economy = apiRoute(
      "api.openai.relief-untriggered-economy",
      "economy",
      scenario(10),
    );
    const premium = apiRoute(
      "api.openai.relief-untriggered-premium",
      "premium",
      scenario(1),
    );

    const plan = allocate([
      normalizedTask("task-relief-untriggered-premium", 0, [premium, economy]),
    ], { incrementalCashBudgetMicroUsd: 5 });

    expect(resultFor(plan, "task-relief-untriggered-premium")).toMatchObject({
      status: "held",
      appliedUpgradeTriggers: [],
    });
    expect(plan).toMatchObject({
      activeTaskCount: 0,
      heldTaskCount: 1,
      cash: { expectedMicroUsd: 0 },
    });
  });

  it("reserves scarce owned quota by priority regardless of input enumeration", () => {
    const identity = subscriptionIdentity(
      "subscription.openai.scarce",
      "resource.openai.scarce-0001",
    );
    const resource = subscriptionResource(identity, {
      availableMicrounits: 1_000_000,
    });
    const owned = subscriptionRoute(resource, "economy");
    const lowApi = apiRoute("api.openai.low-fallback", "economy", scenario(5_000_000));
    const highApi = apiRoute("api.openai.high-fallback", "economy", scenario(5_000_000));
    const tasks = [
      normalizedTask("task-low", 0, [owned, lowApi], {
        task: { priority: "low" },
      }),
      normalizedTask("task-high", 1, [owned, highApi], {
        task: { priority: "high" },
      }),
    ];

    const result = allocate([...tasks].reverse());
    expect(result.reservationOrderTaskIds).toEqual(["task-high", "task-low"]);
    expect(result.reliefOrderTaskIds).toEqual(["task-low", "task-high"]);
    expect(resultFor(result, "task-high")).toMatchObject({
      status: "active",
      routeIdentity: identity,
    });
    expect(resultFor(result, "task-low")).toMatchObject({
      status: "active",
      routeIdentity: lowApi.routeIdentity,
    });
  });

  it("keeps Low, Expected, and High quota ledgers independent and enforces the cumulative cap", () => {
    const identity = subscriptionIdentity(
      "subscription.openai.overage",
      "resource.openai.overage-0001",
    );
    const resource = subscriptionResource(identity, {
      availableMicrounits: 3_000_000,
      overage: {
        rateUsdPerUnit: { coefficient: "1", decimalScale: 0 },
        maxOverageMicrounits: null,
      },
    });
    const demand = scenario(1_000_000, 2_000_000, 3_000_000);
    const owned = subscriptionRoute(resource, "economy", demand);
    const expensiveApi = (suffix: string) =>
      apiRoute(`api.openai.overage-fallback-${suffix}`, "economy", scenario(10_000_000));
    const independent = allocate([
      normalizedTask("task-overage-1", 0, [owned, expensiveApi("1")]),
      normalizedTask("task-overage-2", 1, [owned, expensiveApi("2")]),
    ]);
    expect(independent.cash.paidOverageMicroUsd).toEqual({
      low: 0,
      expected: 1_000_000,
      high: 3_000_000,
    });
    expect(independent.tasks.every((task) => task.status === "active" && task.routeIdentity.resourceId !== null)).toBe(true);

    const cappedResource = subscriptionResource(identity, {
      availableMicrounits: 3_000_000,
      overage: {
        rateUsdPerUnit: { coefficient: "1", decimalScale: 0 },
        maxOverageMicrounits: 2_000_000,
      },
    });
    const capped = subscriptionRoute(cappedResource, "economy", demand);
    const capResult = allocate([
      normalizedTask("task-cap-1", 0, [capped, expensiveApi("cap-1")]),
      normalizedTask("task-cap-2", 1, [capped, expensiveApi("cap-2")]),
    ]);
    expect(resultFor(capResult, "task-cap-1")).toMatchObject({
      status: "active",
      routeIdentity: identity,
    });
    expect(resultFor(capResult, "task-cap-2")).toMatchObject({
      status: "active",
      routeIdentity: expensiveApi("cap-2").routeIdentity,
    });
    expect(capResult.cash.paidOverageMicroUsd).toEqual(scenario(0));
  });

  it("classifies rounded-zero Expected overage by quota use rather than cash delta", () => {
    const identity = subscriptionIdentity(
      "subscription.openai.rounded-overage",
      "resource.openai.rounded-overage-0001",
    );
    const resource = subscriptionResource(identity, {
      availableMicrounits: 500_000,
      overage: {
        rateUsdPerUnit: { coefficient: "1", decimalScale: 6 },
        maxOverageMicrounits: null,
      },
    });
    const firstRoute = subscriptionRoute(
      resource,
      "economy",
      scenario(500_000, 1_000_000, 1_000_000),
    );
    const secondRoute = subscriptionRoute(
      resource,
      "economy",
      scenario(500_000),
    );
    const freeApi = apiRoute(
      "api.openai.rounded-overage-fallback",
      "economy",
      scenario(0),
    );

    const plan = allocate(
      [
        normalizedTask("task-rounded-overage-first", 0, [firstRoute], {
          task: { priority: "high" },
        }),
        normalizedTask("task-rounded-overage-second", 1, [
          secondRoute,
          freeApi,
        ], {
          task: { priority: "low" },
        }),
      ],
      { strategy: "balanced" },
    );

    expect(resultFor(plan, "task-rounded-overage-second")).toMatchObject({
      status: "active",
      routeIdentity: freeApi.routeIdentity,
      routeKind: "api",
    });
  });

  it("enables the Premium compatibility fallback only after scarce sub-Premium quota is exhausted", () => {
    const identity = subscriptionIdentity(
      "subscription.openai.premium-fallback-quota",
      "resource.openai.premium-fallback-quota-0001",
    );
    const economy = subscriptionRoute(
      subscriptionResource(identity, { availableMicrounits: 1_000_000 }),
      "economy",
    );
    const premiumFor = (suffix: string) =>
      apiRoute(`api.openai.premium-${suffix}`, "premium", scenario(2));

    const plan = allocate([
      normalizedTask("task-quota-high", 0, [economy, premiumFor("high")], {
        task: { priority: "high" },
      }),
      normalizedTask("task-quota-low", 1, [economy, premiumFor("low")], {
        task: { priority: "low" },
      }),
    ]);

    expect(resultFor(plan, "task-quota-high")).toMatchObject({
      status: "active",
      routeIdentity: identity,
      qualityTier: "economy",
    });
    expect(resultFor(plan, "task-quota-low")).toMatchObject({
      status: "active",
      routeIdentity: premiumFor("low").routeIdentity,
      qualityTier: "premium",
      appliedUpgradeTriggers: ["minimum-quality-requires-premium"],
    });
  });

  it("reassigns a route before holding, then holds in inverse business order when no route fits", () => {
    const economy = apiRoute("api.openai.relief-economy", "economy", scenario(4_000_000));
    const balanced = apiRoute("api.openai.relief-balanced", "balanced", scenario(6_000_000));
    const reassigned = allocate([
      normalizedTask("task-reassign", 0, [balanced, economy]),
    ], {
      strategy: "balanced",
      incrementalCashBudgetMicroUsd: 5_000_000,
    });
    expect(resultFor(reassigned, "task-reassign")).toMatchObject({
      status: "active",
      routeIdentity: economy.routeIdentity,
    });
    expect(reassigned).toMatchObject({
      expectedWithinBudget: true,
      heldTaskCount: 0,
      cash: { expectedMicroUsd: 4_000_000 },
    });

    const highRoute = apiRoute("api.openai.high", "economy", scenario(4_000_000));
    const lowRoute = apiRoute("api.openai.low", "economy", scenario(4_000_000));
    const held = allocate([
      normalizedTask("task-high", 0, [highRoute], {
        task: { priority: "high", failureImpact: "high" },
        analysis: { failureRisk: "high" },
      }),
      normalizedTask("task-low", 1, [lowRoute], {
        task: { priority: "low", failureImpact: "unspecified" },
        analysis: { failureRisk: "low" },
      }),
    ], { incrementalCashBudgetMicroUsd: 4_000_000 });
    expect(held.reliefOrderTaskIds).toEqual(["task-low", "task-high"]);
    expect(resultFor(held, "task-low")).toMatchObject({ status: "held" });
    expect(resultFor(held, "task-high")).toMatchObject({
      status: "active",
      routeIdentity: highRoute.routeIdentity,
    });
    expect(held.cash.expectedMicroUsd).toBe(4_000_000);
  });

  it("checks every compatible route before holding when an intermediate alternative costs more", () => {
    const balanced = apiRoute(
      "api.openai.relief-balanced-10",
      "balanced",
      scenario(10),
    );
    const premium = apiRoute(
      "api.openai.relief-premium-12",
      "premium",
      scenario(12),
    );
    const economy = apiRoute(
      "api.openai.relief-economy-5",
      "economy",
      scenario(5),
    );
    const routes = [balanced, premium, economy] as const;
    const task = (confirmedRoutes: readonly BestFitConfirmedRouteCandidate[]) =>
      normalizedTask("task-progressive-relief", 0, confirmedRoutes, {
        analysis: { upgradeConditions: ["deep-reasoning"] },
      });
    const options = {
      strategy: "quality-first" as const,
      incrementalCashBudgetMicroUsd: 6,
    };

    const plan = allocate([task(routes)], options);
    const permuted = allocate([task([...routes].reverse())], options);

    expect(permuted).toEqual(plan);
    expect(resultFor(plan, "task-progressive-relief")).toMatchObject({
      status: "active",
      routeIdentity: economy.routeIdentity,
      qualityTier: "economy",
      appliedUpgradeTriggers: ["deep-reasoning"],
      whyEnough: "minimum-quality-met",
    });
    expect(plan).toMatchObject({
      expectedWithinBudget: true,
      heldTaskCount: 0,
      cash: { expectedMicroUsd: 5 },
    });
  });

  it("rebuilds surviving work from its preferred routes after a lower-priority hold", () => {
    const lowOnly = apiRoute(
      "api.openai.low-only",
      "economy",
      scenario(5),
    );
    const mediumEconomy = apiRoute(
      "api.openai.medium-economy",
      "economy",
      scenario(4),
    );
    const mediumBalanced = apiRoute(
      "api.openai.medium-balanced",
      "balanced",
      scenario(6),
    );
    const plan = allocate(
      [
        normalizedTask("task-low-hold", 0, [lowOnly], {
          task: { priority: "low" },
        }),
        normalizedTask(
          "task-medium-survivor",
          1,
          [mediumEconomy, mediumBalanced],
          {
            task: { priority: "medium" },
            analysis: { upgradeConditions: ["deep-reasoning"] },
          },
        ),
      ],
      {
        strategy: "quality-first",
        incrementalCashBudgetMicroUsd: 6,
      },
    );

    expect(resultFor(plan, "task-low-hold")).toMatchObject({ status: "held" });
    expect(resultFor(plan, "task-medium-survivor")).toMatchObject({
      status: "active",
      routeIdentity: mediumBalanced.routeIdentity,
      qualityTier: "balanced",
    });
    expect(plan.cash.expectedMicroUsd).toBe(6);
  });

  it("keeps conditional subscriptions diagnostic-only and never promotes them to primary", () => {
    const fallback = apiRoute("api.openai.conditional-fallback", "economy", scenario(2_000_000));
    const conditionalIdentity = subscriptionIdentity(
      "subscription.openai.conditional",
      "resource.openai.conditional-0001",
    );
    const conditional: ConditionalAlternative = {
      routeIdentity: conditionalIdentity,
      reasonCodes: ["availability-uncertain"],
      fallbackRouteIdentity: fallback.routeIdentity,
    };

    const withFallback = allocate([
      normalizedTask("task-conditional-fallback", 0, [fallback], {
        conditionalAlternatives: [conditional],
      }),
    ]);
    expect(resultFor(withFallback, "task-conditional-fallback")).toMatchObject({
      status: "active",
      routeIdentity: fallback.routeIdentity,
      conditionalAlternatives: [conditional],
    });

    const conditionalOnly = allocate([
      normalizedTask("task-conditional-only", 0, [fallback], {
        analysis: { requiredQualityTier: "balanced" },
        conditionalAlternatives: [conditional],
      }),
    ]);
    expect(resultFor(conditionalOnly, "task-conditional-only")).toMatchObject({
      status: "infeasible",
      routeIdentity: null,
      conditionalAlternatives: [conditional],
    });

    const unorderedReasons: ConditionalAlternative = {
      ...conditional,
      reasonCodes: ["quota-opaque", "profile-unverified", "quota-opaque"],
    };
    const canonicalReasons: ConditionalAlternative = {
      ...conditional,
      reasonCodes: ["profile-unverified", "quota-opaque"],
    };
    const unorderedPlan = allocate([
      normalizedTask("task-conditional-reasons", 0, [fallback], {
        conditionalAlternatives: [unorderedReasons],
      }),
    ]);
    const canonicalPlan = allocate([
      normalizedTask("task-conditional-reasons", 0, [fallback], {
        conditionalAlternatives: [canonicalReasons],
      }),
    ]);
    expect(unorderedPlan).toEqual(canonicalPlan);
    expect(
      resultFor(unorderedPlan, "task-conditional-reasons")
        .conditionalAlternatives[0]?.reasonCodes,
    ).toEqual(["profile-unverified", "quota-opaque"]);
  });

  it("is deterministic across task and confirmed-route enumeration order", () => {
    const routesA = [
      apiRoute("api.openai.z", "economy", scenario(1_000_000)),
      apiRoute("api.openai.a", "economy", scenario(1_000_000)),
      apiRoute("api.openai.premium-a", "premium", scenario(4_000_000)),
    ];
    const routesB = [
      apiRoute("api.openai.y", "economy", scenario(2_000_000)),
      apiRoute("api.openai.b", "economy", scenario(2_000_000)),
      apiRoute("api.openai.premium-b", "premium", scenario(5_000_000)),
    ];
    const first = [
      normalizedTask("task-a", 0, routesA),
      normalizedTask("task-b", 1, routesB),
    ];
    const second = [
      normalizedTask("task-b", 1, [...routesB].reverse()),
      normalizedTask("task-a", 0, [...routesA].reverse()),
    ];

    expect(allocate(second)).toEqual(allocate(first));
    expect(resultFor(allocate(first), "task-a")).toMatchObject({
      routeIdentity: apiIdentity("api.openai.a"),
    });
  });

  it("uses the cheapest canonical Premium API baseline and returns null when any active task lacks one", () => {
    const primary = apiRoute("api.openai.primary", "economy", scenario(1_000_000));
    const premiumExpensive = apiRoute(
      "api.openai.premium-expensive",
      "premium",
      scenario(7_000_000),
    );
    const premiumTieLater = apiRoute(
      "api.openai.premium-tie-later",
      "premium",
      scenario(5_000_000),
    );
    const premiumTieEarlier = apiRoute(
      "api.anthropic.premium-tie-earlier",
      "premium",
      scenario(5_000_000),
      anthropic,
    );
    const baseline = allocate([
      normalizedTask("task-baseline", 0, [
        premiumExpensive,
        premiumTieLater,
        primary,
        premiumTieEarlier,
      ]),
    ]);
    expect(resultFor(baseline, "task-baseline")).toMatchObject({
      routeIdentity: primary.routeIdentity,
    });
    expect(baseline.premiumBaseline).toEqual([
      {
        taskId: "task-baseline",
        routeIdentity: premiumTieEarlier.routeIdentity,
        expectedCashMicroUsd: 5_000_000,
      },
    ]);
    expect(baseline.spendComparison).toMatchObject({
      premiumBaselineExpectedMicroUsd: 5_000_000,
      selectedExpectedIncrementalCashMicroUsd: 1_000_000,
      avoidedSpendMicroUsd: 4_000_000,
      additionalSpendMicroUsd: 0,
    });

    const missing = allocate([
      normalizedTask("task-with-premium", 0, [primary, premiumExpensive]),
      normalizedTask("task-without-premium", 1, [
        apiRoute("api.openai.no-premium", "economy", scenario(1_000_000)),
      ]),
    ]);
    expect(missing.premiumBaseline).toBeNull();
    expect(missing.spendComparison).toBeNull();
  });
});

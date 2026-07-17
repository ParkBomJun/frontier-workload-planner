import { describe, expect, it } from "vitest";

import { registeredAccessProviderId } from "@/lib/offerings/route-identity";
import {
  compareBestFitPlans,
  compareBestFitReliefOrder,
  compareBestFitReservationOrder,
  compareBestFitRoutes,
  qualityKey,
  sortBestFitPlans,
  sortBestFitReliefOrder,
  sortBestFitReservationOrder,
  sortBestFitRoutes,
  tierRank,
  type BestFitPlanOrderingCandidate,
  type BestFitPlanTaskOrderingCandidate,
  type BestFitRouteKind,
  type BestFitRouteOrderingCandidate,
  type BestFitTaskOrderInput,
} from "@/lib/planning/best-fit-ordering";
import type { PlanningStrategy } from "@/types/domain";
import type { PlanningQualityTier } from "@/types/workload";

const openai = registeredAccessProviderId("openai");
const anthropic = registeredAccessProviderId("anthropic");

function task(
  taskId: string,
  originalIndex: number,
  patch: Partial<BestFitTaskOrderInput> = {},
): BestFitTaskOrderInput {
  return {
    taskId,
    priority: "medium",
    deadlineDate: null,
    failureImpact: "medium",
    failureRisk: "medium",
    originalIndex,
    ...patch,
  };
}

function apiRoute(
  offeringId: string,
  qualityTier: PlanningQualityTier = "economy",
  expectedVariableCashMicroUsd = 0,
  providerId = openai,
): BestFitRouteOrderingCandidate {
  return {
    routeIdentity: { providerId, offeringId, resourceId: null },
    qualityTier,
    routeKind: "api",
    expectedVariableCashMicroUsd,
  };
}

function subscriptionRoute(
  offeringId: string,
  resourceId: string,
  qualityTier: PlanningQualityTier = "balanced",
  expectedVariableCashMicroUsd = 0,
  routeKind: Exclude<BestFitRouteKind, "api"> =
    "owned-within-included-quota",
): BestFitRouteOrderingCandidate {
  return {
    routeIdentity: { providerId: openai, offeringId, resourceId },
    qualityTier,
    routeKind,
    expectedVariableCashMicroUsd,
  };
}

function planTask(
  order: BestFitTaskOrderInput,
  route: BestFitRouteOrderingCandidate | null,
  patch: Partial<BestFitPlanTaskOrderingCandidate> = {},
): BestFitPlanTaskOrderingCandidate {
  return {
    ...order,
    status: route === null ? "held" : "active",
    targetQualityTier: "economy",
    route,
    ...patch,
  };
}

function plan(
  tasks: readonly BestFitPlanTaskOrderingCandidate[],
  patch: Partial<BestFitPlanOrderingCandidate> = {},
): BestFitPlanOrderingCandidate {
  return {
    expectedWithinBudget: true,
    expectedIncrementalCashMicroUsd: 0,
    highIncrementalCashMicroUsd: 0,
    tasks,
    activatedSubscriptionRoutes: [],
    ...patch,
  };
}

describe("Best-fit task ordering", () => {
  it("reserves by priority, deadline, impact, risk, then stable input index", () => {
    const fixtures = [
      task("task-priority-low", 0, { priority: "low" }),
      task("task-priority-high", 1, { priority: "high" }),
      task("task-priority-medium", 2),
    ];
    expect(sortBestFitReservationOrder(fixtures).map(({ taskId }) => taskId)).toEqual([
      "task-priority-high",
      "task-priority-medium",
      "task-priority-low",
    ]);

    const samePriority = [
      task("task-no-deadline", 0),
      task("task-later", 1, { deadlineDate: "2026-07-20" }),
      task("task-earlier", 2, { deadlineDate: "2026-07-18" }),
    ];
    expect(sortBestFitReservationOrder(samePriority).map(({ taskId }) => taskId)).toEqual([
      "task-earlier",
      "task-later",
      "task-no-deadline",
    ]);

    const sameDeadline = [
      task("task-impact-low", 0, { failureImpact: "low" }),
      task("task-impact-unspecified", 1, { failureImpact: "unspecified" }),
      task("task-impact-high", 2, { failureImpact: "high" }),
      task("task-impact-medium", 3, { failureImpact: "medium" }),
    ];
    expect(sortBestFitReservationOrder(sameDeadline).map(({ taskId }) => taskId)).toEqual([
      "task-impact-high",
      "task-impact-medium",
      "task-impact-low",
      "task-impact-unspecified",
    ]);

    const sameImpact = [
      task("task-risk-low", 0, { failureRisk: "low" }),
      task("task-risk-high", 1, { failureRisk: "high" }),
      task("task-risk-medium", 2, { failureRisk: "medium" }),
    ];
    expect(sortBestFitReservationOrder(sameImpact).map(({ taskId }) => taskId)).toEqual([
      "task-risk-high",
      "task-risk-medium",
      "task-risk-low",
    ]);

    const stable = [task("task-index-2", 2), task("task-index-0", 0), task("task-index-1", 1)];
    expect(sortBestFitReservationOrder(stable).map(({ originalIndex }) => originalIndex)).toEqual([
      0,
      1,
      2,
    ]);
  });

  it("reverses every business dimension for relief but keeps input index ascending", () => {
    const fixtures = [
      task("task-important", 0, {
        priority: "high",
        deadlineDate: "2026-07-18",
        failureImpact: "high",
        failureRisk: "high",
      }),
      task("task-middle", 1, {
        deadlineDate: "2026-07-20",
      }),
      task("task-relief-first", 2, {
        priority: "low",
        deadlineDate: null,
        failureImpact: "unspecified",
        failureRisk: "low",
      }),
    ];
    expect(sortBestFitReliefOrder(fixtures).map(({ taskId }) => taskId)).toEqual([
      "task-relief-first",
      "task-middle",
      "task-important",
    ]);

    const laterFirst = [
      task("task-earlier", 2, { deadlineDate: "2026-07-18" }),
      task("task-later", 1, { deadlineDate: "2026-07-20" }),
      task("task-none", 0, { deadlineDate: null }),
    ];
    expect(sortBestFitReliefOrder(laterFirst).map(({ taskId }) => taskId)).toEqual([
      "task-none",
      "task-later",
      "task-earlier",
    ]);

    const leastImpactFirst = [
      task("task-impact-high", 0, { failureImpact: "high" }),
      task("task-impact-medium", 1, { failureImpact: "medium" }),
      task("task-impact-low", 2, { failureImpact: "low" }),
      task("task-impact-unspecified", 3, { failureImpact: "unspecified" }),
    ];
    expect(sortBestFitReliefOrder(leastImpactFirst).map(({ taskId }) => taskId)).toEqual([
      "task-impact-unspecified",
      "task-impact-low",
      "task-impact-medium",
      "task-impact-high",
    ]);

    const leastRiskFirst = [
      task("task-risk-high", 0, { failureRisk: "high" }),
      task("task-risk-medium", 1, { failureRisk: "medium" }),
      task("task-risk-low", 2, { failureRisk: "low" }),
    ];
    expect(sortBestFitReliefOrder(leastRiskFirst).map(({ taskId }) => taskId)).toEqual([
      "task-risk-low",
      "task-risk-medium",
      "task-risk-high",
    ]);

    expect(
      compareBestFitReliefOrder(task("task-index-0", 0), task("task-index-1", 1)),
    ).toBeLessThan(0);
  });

  it("rejects unknown runtime enums, malformed dates, and duplicate stable task keys", () => {
    expect(() =>
      compareBestFitReservationOrder(
        task("task-a", 0, { priority: "urgent" as never }),
        task("task-b", 1),
      ),
    ).toThrow(/priority/);
    expect(() =>
      compareBestFitReservationOrder(
        task("task-a", 0, { failureImpact: "catastrophic" as never }),
        task("task-b", 1),
      ),
    ).toThrow(/impact/);
    expect(() =>
      compareBestFitReservationOrder(
        task("task-a", 0, { failureRisk: "unknown" as never }),
        task("task-b", 1),
      ),
    ).toThrow(/risk/);
    expect(() =>
      compareBestFitReservationOrder(
        task("task-a", 0, { deadlineDate: "2026-02-30" }),
        task("task-b", 1),
      ),
    ).toThrow(/deadline/);
    expect(() =>
      sortBestFitReservationOrder([task("task-a", 0), task("task-b", 0)]),
    ).toThrow(/unique/);
    expect(() =>
      sortBestFitReservationOrder([task("   ", 0)]),
    ).toThrow(/Task ID/);
  });
});

describe("Best-fit quality and route comparators", () => {
  it("uses directional quality keys: exact, above, below, then smallest excess", () => {
    expect(tierRank("economy")).toBe(0);
    expect(tierRank("balanced")).toBe(1);
    expect(tierRank("premium")).toBe(2);
    expect(qualityKey("balanced", "balanced")).toEqual([0, 0]);
    expect(qualityKey("premium", "balanced")).toEqual([0, 1]);
    expect(qualityKey("economy", "balanced")).toEqual([1, 0]);
    expect(
      ["economy", "premium", "balanced"]
        .sort((left, right) => {
          const a = qualityKey(left as PlanningQualityTier, "balanced");
          const b = qualityKey(right as PlanningQualityTier, "balanced");
          return a[0] - b[0] || a[1] - b[1];
        }),
    ).toEqual(["balanced", "premium", "economy"]);
    expect(() => tierRank("frontier" as never)).toThrow(/quality tier/);
  });

  it("keeps Cost Saver cash-first and uses quality only at equal cash", () => {
    const ownedBalanced = subscriptionRoute("subscription.openai.owned", "account-1");
    const oneMicroEconomy = apiRoute("api.openai.economy", "economy", 1);
    expect(
      compareBestFitRoutes(
        ownedBalanced,
        oneMicroEconomy,
        "cost-saver",
        "economy",
      ),
    ).toBeLessThan(0);

    const freeEconomy = apiRoute("api.openai.free-economy", "economy", 0);
    expect(
      compareBestFitRoutes(
        freeEconomy,
        ownedBalanced,
        "cost-saver",
        "economy",
      ),
    ).toBeLessThan(0);
  });

  it("uses Balanced ordering for Balanced and caller-targeted Quality First", () => {
    const ownedEconomy = subscriptionRoute(
      "subscription.openai.owned-economy",
      "account-1",
      "economy",
      0,
    );
    const exactBalancedApi = apiRoute("api.openai.balanced", "balanced", 10);
    for (const strategy of ["balanced", "quality-first"] as const) {
      expect(
        compareBestFitRoutes(
          exactBalancedApi,
          ownedEconomy,
          strategy,
          "balanced",
        ),
      ).toBeLessThan(0);
    }

    const ownedBalanced = subscriptionRoute(
      "subscription.openai.owned-balanced",
      "account-2",
      "balanced",
      10,
    );
    expect(
      compareBestFitRoutes(
        ownedBalanced,
        exactBalancedApi,
        "balanced",
        "balanced",
      ),
    ).toBeLessThan(0);
  });

  it("closes every strategy tie with route-kind and canonical identity", () => {
    for (const strategy of [
      "cost-saver",
      "balanced",
      "quality-first",
    ] as const) {
      const earlier = apiRoute("api.a", "balanced", 10, anthropic);
      const later = apiRoute("api.z", "balanced", 10, anthropic);
      expect(
        compareBestFitRoutes(earlier, later, strategy, "balanced"),
      ).toBeLessThan(0);
      expect(
        sortBestFitRoutes([later, earlier], strategy, "balanced").map(
          ({ routeIdentity }) => routeIdentity.offeringId,
        ),
      ).toEqual(["api.a", "api.z"]);
    }

    const api = apiRoute("route.same-quality", "balanced", 0);
    const paid = subscriptionRoute(
      "route.same-quality-subscription",
      "account-1",
      "balanced",
      0,
      "owned-paid-overage",
    );
    expect(compareBestFitRoutes(api, paid, "cost-saver", "balanced")).toBeLessThan(0);
  });

  it("rejects unsafe cash, unknown strategies and route kinds, and duplicate routes", () => {
    expect(() =>
      compareBestFitRoutes(
        apiRoute("api.bad-cash", "economy", -1),
        apiRoute("api.good", "economy", 0),
        "cost-saver",
        "economy",
      ),
    ).toThrow(/micro-USD/);
    expect(() =>
      compareBestFitRoutes(
        apiRoute("api.a"),
        apiRoute("api.b"),
        "fastest" as PlanningStrategy,
        "economy",
      ),
    ).toThrow(/strategy/);
    expect(() =>
      compareBestFitRoutes(
        { ...apiRoute("api.a"), routeKind: "free" as never },
        apiRoute("api.b"),
        "balanced",
        "economy",
      ),
    ).toThrow(/kind/);
    const duplicate = apiRoute("api.duplicate");
    expect(() =>
      sortBestFitRoutes([duplicate, { ...duplicate }], "balanced", "economy"),
    ).toThrow(/unique/);
  });
});

describe("Best-fit complete-plan comparator", () => {
  const important = task("task-important", 0, {
    priority: "high",
    deadlineDate: "2026-07-18",
    failureImpact: "high",
    failureRisk: "high",
  });
  const optional = task("task-optional", 1, {
    priority: "low",
    failureImpact: "unspecified",
    failureRisk: "low",
  });
  const importantRoute = apiRoute("api.important", "economy", 10);
  const optionalRoute = apiRoute("api.optional", "economy", 10);

  it("compares budget fit and reservation-ordered status before every strategy key", () => {
    const importantActive = plan([
      planTask(important, importantRoute),
      planTask(optional, null),
    ], {
      expectedIncrementalCashMicroUsd: 100,
      highIncrementalCashMicroUsd: 200,
    });
    const optionalActive = plan([
      planTask(important, null),
      planTask(optional, optionalRoute),
    ], {
      expectedIncrementalCashMicroUsd: 1,
      highIncrementalCashMicroUsd: 1,
    });
    const overBudget = plan(importantActive.tasks, {
      expectedWithinBudget: false,
      expectedIncrementalCashMicroUsd: 0,
      highIncrementalCashMicroUsd: 0,
    });

    for (const strategy of [
      "cost-saver",
      "balanced",
      "quality-first",
    ] as const) {
      expect(compareBestFitPlans(importantActive, optionalActive, strategy)).toBeLessThan(0);
      expect(compareBestFitPlans(importantActive, overBudget, strategy)).toBeLessThan(0);
    }
  });

  it("uses Cost Saver cash before quality and Balanced/Quality First quality before cash", () => {
    const economy = plan([
      planTask(important, apiRoute("api.economy", "economy", 10)),
      planTask(optional, optionalRoute),
    ], {
      expectedIncrementalCashMicroUsd: 20,
      highIncrementalCashMicroUsd: 30,
    });
    const balanced = plan([
      planTask(important, apiRoute("api.balanced", "balanced", 0)),
      planTask(optional, optionalRoute),
    ], {
      expectedIncrementalCashMicroUsd: 10,
      highIncrementalCashMicroUsd: 20,
    });

    expect(compareBestFitPlans(balanced, economy, "cost-saver")).toBeLessThan(0);
    expect(compareBestFitPlans(economy, balanced, "balanced")).toBeLessThan(0);
    expect(compareBestFitPlans(economy, balanced, "quality-first")).toBeLessThan(0);
  });

  it("uses High cash, sorted activation keys, then original-task assignments to close ties", () => {
    const baseTasks = [
      planTask(important, apiRoute("api.a", "economy", 0)),
      planTask(optional, apiRoute("api.z", "economy", 0)),
    ];
    const lowerHigh = plan(baseTasks, {
      expectedIncrementalCashMicroUsd: 10,
      highIncrementalCashMicroUsd: 19,
    });
    const higherHigh = plan(baseTasks, {
      expectedIncrementalCashMicroUsd: 10,
      highIncrementalCashMicroUsd: 20,
    });
    for (const strategy of [
      "cost-saver",
      "balanced",
      "quality-first",
    ] as const) {
      expect(compareBestFitPlans(lowerHigh, higherHigh, strategy)).toBeLessThan(0);
    }

    const activationA = subscriptionRoute("subscription.a", "account-a");
    const activationZ = subscriptionRoute("subscription.z", "account-z");
    const activatedA = plan(baseTasks, {
      expectedIncrementalCashMicroUsd: 10,
      highIncrementalCashMicroUsd: 20,
      activatedSubscriptionRoutes: [
        activationA.routeIdentity as Extract<typeof activationA.routeIdentity, { resourceId: string }>,
      ],
    });
    const activatedZ = plan(baseTasks, {
      expectedIncrementalCashMicroUsd: 10,
      highIncrementalCashMicroUsd: 20,
      activatedSubscriptionRoutes: [
        activationZ.routeIdentity as Extract<typeof activationZ.routeIdentity, { resourceId: string }>,
      ],
    });
    expect(compareBestFitPlans(activatedA, activatedZ, "balanced")).toBeLessThan(0);

    const assignmentA = plan(baseTasks, {
      expectedIncrementalCashMicroUsd: 10,
      highIncrementalCashMicroUsd: 20,
    });
    const assignmentZ = plan([
      planTask(important, apiRoute("api.z", "economy", 0)),
      planTask(optional, apiRoute("api.a", "economy", 0)),
    ], {
      expectedIncrementalCashMicroUsd: 10,
      highIncrementalCashMicroUsd: 20,
    });
    for (const strategy of [
      "cost-saver",
      "balanced",
      "quality-first",
    ] as const) {
      expect(compareBestFitPlans(assignmentA, assignmentZ, strategy)).toBeLessThan(0);
    }
  });

  it("is invariant to task, activation, and candidate enumeration order", () => {
    const activationA = subscriptionRoute("subscription.a", "account-a");
    const activationZ = subscriptionRoute("subscription.z", "account-z");
    const routes = [
      activationZ.routeIdentity,
      activationA.routeIdentity,
    ] as Extract<typeof activationA.routeIdentity, { resourceId: string }>[];
    const candidateA = plan([
      planTask(optional, optionalRoute),
      planTask(important, importantRoute),
    ], {
      activatedSubscriptionRoutes: routes,
    });
    const candidateAReordered = plan([
      planTask(important, importantRoute),
      planTask(optional, optionalRoute),
    ], {
      activatedSubscriptionRoutes: [...routes].reverse(),
    });
    expect(compareBestFitPlans(candidateA, candidateAReordered, "balanced")).toBe(0);

    const candidateB = plan([
      planTask(important, apiRoute("api.z", "economy", 10)),
      planTask(optional, optionalRoute),
    ]);
    const expected = sortBestFitPlans([candidateB, candidateA], "balanced");
    expect(sortBestFitPlans([candidateA, candidateB], "balanced")).toEqual(expected);
  });

  it("rejects unsafe plan cash, unknown statuses, mismatched task universes, and duplicate activations", () => {
    const valid = plan([planTask(important, importantRoute)]);
    expect(() =>
      compareBestFitPlans(
        { ...valid, expectedIncrementalCashMicroUsd: Number.MAX_SAFE_INTEGER + 1 },
        valid,
        "cost-saver",
      ),
    ).toThrow(/micro-USD/);
    expect(() =>
      compareBestFitPlans(
        plan([planTask(important, importantRoute, { status: "queued" as never })]),
        valid,
        "balanced",
      ),
    ).toThrow(/status/);
    expect(() =>
      compareBestFitPlans(
        valid,
        plan([planTask(task("task-other", 0), importantRoute)]),
        "balanced",
      ),
    ).toThrow(/same immutable/);

    const activation = subscriptionRoute("subscription.duplicate", "account-1");
    const subscriptionIdentity = activation.routeIdentity as Extract<
      typeof activation.routeIdentity,
      { resourceId: string }
    >;
    expect(() =>
      compareBestFitPlans(
        plan(valid.tasks, {
          activatedSubscriptionRoutes: [subscriptionIdentity, subscriptionIdentity],
        }),
        valid,
        "balanced",
      ),
    ).toThrow(/unique/);
    expect(() =>
      sortBestFitPlans(
        [{ ...valid, highIncrementalCashMicroUsd: -1 }],
        "balanced",
      ),
    ).toThrow(/micro-USD/);
  });
});

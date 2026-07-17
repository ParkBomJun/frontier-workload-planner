import { describe, expect, it } from "vitest";

import { resolveApiCatalogEntry } from "@/lib/offerings/provider-catalog-adapter";
import {
  calculateBestFitPlanCash,
  calculatePremiumBaseline,
  type BestFitCashTaskInput,
  type BestFitSubscriptionCashSource,
  type PremiumApiBaselineCandidate,
  type PremiumBaselineTaskInput,
  type ScenarioCashMicroUsd,
} from "@/lib/planning/best-fit-cash";
import type {
  ApiRouteIdentity,
  SubscriptionRouteIdentity,
} from "@/types/offerings";

const BUDGET = 100_000_000;

function cash(
  low: number,
  expected = low,
  high = expected,
): ScenarioCashMicroUsd {
  return { low, expected, high };
}

function apiRoute(
  providerId: "openai" | "anthropic" | "google" = "openai",
  tier: "economy" | "balanced" | "frontier" = "economy",
): ApiRouteIdentity {
  return resolveApiCatalogEntry(providerId, tier).routeIdentity;
}

function subscriptionRoute(
  resourceId = "resource.openai.plan-0001",
): SubscriptionRouteIdentity {
  return {
    providerId: apiRoute().providerId,
    offeringId: "subscription.openai.shared-plan",
    resourceId,
  };
}

function activeApi(
  taskId: string,
  scenarioCash: ScenarioCashMicroUsd,
  routeIdentity: ApiRouteIdentity = apiRoute(),
): BestFitCashTaskInput {
  return {
    taskId,
    status: "active",
    routeIdentity,
    apiCashMicroUsd: scenarioCash,
  };
}

function activeSubscription(
  taskId: string,
  routeIdentity: SubscriptionRouteIdentity,
): BestFitCashTaskInput {
  return {
    taskId,
    status: "active",
    routeIdentity,
    apiCashMicroUsd: null,
  };
}

function excludedTask(
  taskId: string,
  status: "held" | "infeasible",
): BestFitCashTaskInput {
  return { taskId, status, routeIdentity: null, apiCashMicroUsd: null };
}

function candidateSource(
  routeIdentity: SubscriptionRouteIdentity,
  fullPlanPeriodFeeMicroUsd: number,
  overage: ScenarioCashMicroUsd | null = null,
): BestFitSubscriptionCashSource {
  return {
    routeIdentity,
    ownership: "candidate-new",
    fullPlanPeriodFeeMicroUsd,
    paidOverage:
      overage === null
        ? { kind: "none" }
        : { kind: "source-backed", cashMicroUsd: overage },
  };
}

function ownedSource(
  routeIdentity: SubscriptionRouteIdentity,
  existingPlanPeriodFeeMicroUsd: number,
  overage: ScenarioCashMicroUsd | null = null,
): BestFitSubscriptionCashSource {
  return {
    routeIdentity,
    ownership: "owned",
    existingPlanPeriodFeeMicroUsd,
    paidOverage:
      overage === null
        ? { kind: "none" }
        : { kind: "source-backed", cashMicroUsd: overage },
  };
}

function plan(
  tasks: readonly BestFitCashTaskInput[],
  subscriptionCashSources: readonly BestFitSubscriptionCashSource[] = [],
  incrementalCashBudgetMicroUsd = BUDGET,
) {
  return calculateBestFitPlanCash({
    tasks,
    subscriptionCashSources,
    incrementalCashBudgetMicroUsd,
  });
}

function compatiblePremium(
  routeIdentity: ApiRouteIdentity,
  expectedCashMicroUsd: number,
): PremiumApiBaselineCandidate {
  return {
    compatibility: "compatible",
    qualityTier: "premium",
    routeIdentity,
    expectedCashMicroUsd,
  };
}

describe("Best-fit plan cash", () => {
  it("shows why two $6 API tasks can prefer one shared $10 subscription", () => {
    const route = subscriptionRoute();
    const apiPlan = plan([
      activeApi("task-1", cash(6_000_000)),
      activeApi("task-2", cash(6_000_000)),
    ]);
    const subscriptionPlan = plan(
      [
        activeSubscription("task-1", route),
        activeSubscription("task-2", route),
      ],
      [candidateSource(route, 10_000_000)],
    );

    expect(apiPlan.totalIncrementalCashMicroUsd.expected).toBe(12_000_000);
    expect(subscriptionPlan.totalIncrementalCashMicroUsd.expected).toBe(
      10_000_000,
    );
    expect(subscriptionPlan.newSubscriptionCommitmentMicroUsd).toBe(10_000_000);
    expect(subscriptionPlan.activatedCandidateSubscriptionRoutes).toEqual([route]);
  });

  it("keeps one $6 API task cheaper than activating the same $10 subscription", () => {
    const route = subscriptionRoute();
    const apiPlan = plan([activeApi("task-1", cash(6_000_000))]);
    const subscriptionPlan = plan(
      [activeSubscription("task-1", route)],
      [candidateSource(route, 10_000_000)],
    );

    expect(apiPlan.totalIncrementalCashMicroUsd.expected).toBe(6_000_000);
    expect(subscriptionPlan.totalIncrementalCashMicroUsd.expected).toBe(
      10_000_000,
    );
  });

  it("removes a fee after the last active primary assignment and excludes fallback-only or unused sources", () => {
    const used = subscriptionRoute("resource.openai.used-0001");
    const unused = subscriptionRoute("resource.openai.unused-0001");
    const sources = [
      candidateSource(used, 10_000_000),
      candidateSource(unused, 20_000_000),
    ];

    expect(
      plan(
        [activeSubscription("task-active", used), excludedTask("task-held", "held")],
        sources,
      ).newSubscriptionCommitmentMicroUsd,
    ).toBe(10_000_000);
    expect(
      plan(
        [
          activeApi("task-fallback", cash(2_000_000)),
          excludedTask("task-held", "held"),
          excludedTask("task-infeasible", "infeasible"),
        ],
        sources,
      ),
    ).toMatchObject({
      newSubscriptionCommitmentMicroUsd: 0,
      totalIncrementalCashMicroUsd: cash(2_000_000),
      activatedCandidateSubscriptionRoutes: [],
    });
  });

  it("keeps an owned plan-period fee outside incremental cash", () => {
    const route = subscriptionRoute("resource.openai.owned-0001");
    const result = plan(
      [activeSubscription("task-1", route)],
      [ownedSource(route, 25_000_000)],
    );

    expect(result).toMatchObject({
      newSubscriptionCommitmentMicroUsd: 0,
      paidOverageCashMicroUsd: cash(0),
      totalIncrementalCashMicroUsd: cash(0),
    });
  });

  it("adds one source-backed cumulative overage component per active resource", () => {
    const route = subscriptionRoute("resource.openai.overage-0001");
    const result = plan(
      [
        activeSubscription("task-1", route),
        activeSubscription("task-2", route),
      ],
      [ownedSource(route, 25_000_000, cash(1_000_000, 2_000_000, 3_000_000))],
    );

    expect(result.paidOverageCashMicroUsd).toEqual(
      cash(1_000_000, 2_000_000, 3_000_000),
    );
    expect(result.totalIncrementalCashMicroUsd).toEqual(
      cash(1_000_000, 2_000_000, 3_000_000),
    );
  });

  it("sums API, one shared fee, and source-backed overage in every scenario", () => {
    const route = subscriptionRoute("resource.openai.combined-0001");
    const result = plan(
      [
        activeApi("task-api", cash(1_000_000, 2_000_000, 3_000_000)),
        activeSubscription("task-subscription", route),
      ],
      [
        candidateSource(
          route,
          10_000_000,
          cash(4_000_000, 5_000_000, 6_000_000),
        ),
      ],
    );

    expect(result).toMatchObject({
      apiCashMicroUsd: cash(1_000_000, 2_000_000, 3_000_000),
      newSubscriptionCommitmentMicroUsd: 10_000_000,
      paidOverageCashMicroUsd: cash(4_000_000, 5_000_000, 6_000_000),
      totalIncrementalCashMicroUsd: cash(
        15_000_000,
        17_000_000,
        19_000_000,
      ),
    });
  });

  it("uses an inclusive Expected budget and a strict High warning boundary", () => {
    const exact = plan(
      [activeApi("task-1", cash(9_000_000, 10_000_000, 10_000_000))],
      [],
      10_000_000,
    );
    const highOver = plan(
      [activeApi("task-1", cash(9_000_000, 10_000_000, 10_000_001))],
      [],
      10_000_000,
    );

    expect(exact.expectedWithinBudget).toBe(true);
    expect(exact.highExceedsBudget).toBe(false);
    expect(highOver.expectedWithinBudget).toBe(true);
    expect(highOver.highExceedsBudget).toBe(true);
  });

  it("rejects component and aggregate micro-USD overflow", () => {
    expect(() =>
      plan([activeApi("task-1", cash(-1))]),
    ).toThrow(/non-negative safe integer/);
    expect(() =>
      plan([
        activeApi("task-1", cash(Number.MAX_SAFE_INTEGER)),
        activeApi("task-2", cash(1)),
      ]),
    ).toThrow(/safe micro-USD range/);

    const first = subscriptionRoute("resource.openai.fee-0001");
    const second = subscriptionRoute("resource.openai.fee-0002");
    expect(() =>
      plan(
        [activeSubscription("task-1", first), activeSubscription("task-2", second)],
        [
          candidateSource(first, Number.MAX_SAFE_INTEGER),
          candidateSource(second, 1),
        ],
      ),
    ).toThrow(/safe micro-USD range/);
  });

  it("rejects duplicate tasks, duplicate source routes, and missing active sources", () => {
    const route = subscriptionRoute();
    expect(() =>
      plan([activeApi("task-1", cash(1)), activeApi("task-1", cash(1))]),
    ).toThrow(/task IDs must be unique/);
    expect(() =>
      plan(
        [activeSubscription("task-1", route)],
        [candidateSource(route, 1), candidateSource(route, 1)],
      ),
    ).toThrow(/source route identities must be unique/);
    expect(() => plan([activeSubscription("task-1", route)])).toThrow(
      /requires one cash source/,
    );
  });
});

describe("Premium API baseline", () => {
  it("chooses the lowest Expected candidate and uses the canonical route for a tie", () => {
    const openAi = apiRoute("openai", "frontier");
    const google = apiRoute("google", "frontier");
    const anthropic = apiRoute("anthropic", "frontier");
    const result = calculatePremiumBaseline({
      selectedExpectedIncrementalCashMicroUsd: 4_000_000,
      tasks: [
        {
          taskId: "task-1",
          status: "active",
          candidates: [
            compatiblePremium(openAi, 6_000_000),
            compatiblePremium(google, 5_000_000),
            compatiblePremium(anthropic, 5_000_000),
          ],
        },
      ],
    });

    expect(result.premiumBaseline).toMatchObject({
      totalExpectedCashMicroUsd: 5_000_000,
      tasks: [{ taskId: "task-1", routeIdentity: anthropic }],
    });
    expect(result).toMatchObject({
      differenceMicroUsd: 1_000_000,
      avoidedSpendMicroUsd: 1_000_000,
      additionalSpendMicroUsd: 0,
    });
  });

  it("returns null when any active task lacks a compatible Premium API", () => {
    const premium = compatiblePremium(apiRoute("openai", "frontier"), 5_000_000);
    const result = calculatePremiumBaseline({
      selectedExpectedIncrementalCashMicroUsd: 4_000_000,
      tasks: [
        { taskId: "task-1", status: "active", candidates: [premium] },
        { taskId: "task-2", status: "active", candidates: [] },
      ],
    });

    expect(result).toEqual({
      activeTaskIds: ["task-1", "task-2"],
      premiumBaseline: null,
      differenceMicroUsd: null,
      avoidedSpendMicroUsd: null,
      additionalSpendMicroUsd: null,
    });
  });

  it("excludes held and infeasible tasks from both sides of the baseline", () => {
    const premium = compatiblePremium(apiRoute("openai", "frontier"), 8_000_000);
    const result = calculatePremiumBaseline({
      selectedExpectedIncrementalCashMicroUsd: 5_000_000,
      tasks: [
        { taskId: "task-active", status: "active", candidates: [premium] },
        { taskId: "task-held", status: "held", candidates: [] },
        { taskId: "task-infeasible", status: "infeasible", candidates: [] },
      ],
    });

    expect(result.activeTaskIds).toEqual(["task-active"]);
    expect(result.premiumBaseline?.tasks).toHaveLength(1);
    expect(result.premiumBaseline?.totalExpectedCashMicroUsd).toBe(8_000_000);
    expect(result.avoidedSpendMicroUsd).toBe(3_000_000);
  });

  it("returns null rather than a zero-saving claim when no guaranteed task is active", () => {
    expect(
      calculatePremiumBaseline({
        selectedExpectedIncrementalCashMicroUsd: 0,
        tasks: [
          { taskId: "task-held", status: "held", candidates: [] },
          { taskId: "task-infeasible", status: "infeasible", candidates: [] },
        ],
      }),
    ).toEqual({
      activeTaskIds: [],
      premiumBaseline: null,
      differenceMicroUsd: null,
      avoidedSpendMicroUsd: null,
      additionalSpendMicroUsd: null,
    });
  });

  it("reports a negative difference as additional spend", () => {
    const result = calculatePremiumBaseline({
      selectedExpectedIncrementalCashMicroUsd: 10_000_000,
      tasks: [
        {
          taskId: "task-1",
          status: "active",
          candidates: [
            compatiblePremium(apiRoute("openai", "frontier"), 5_000_000),
          ],
        },
      ],
    });

    expect(result).toMatchObject({
      differenceMicroUsd: -5_000_000,
      avoidedSpendMicroUsd: 0,
      additionalSpendMicroUsd: 5_000_000,
    });
  });

  it("ignores explicitly incompatible candidates and rejects unsafe baseline totals", () => {
    const incompatible: PremiumApiBaselineCandidate = {
      compatibility: "incompatible",
      qualityTier: "premium",
      routeIdentity: apiRoute("google", "frontier"),
      expectedCashMicroUsd: null,
    };
    expect(
      calculatePremiumBaseline({
        selectedExpectedIncrementalCashMicroUsd: 1,
        tasks: [{ taskId: "task-1", status: "active", candidates: [incompatible] }],
      }).premiumBaseline,
    ).toBeNull();

    const tasks: PremiumBaselineTaskInput[] = [
      {
        taskId: "task-1",
        status: "active",
        candidates: [
          compatiblePremium(
            apiRoute("openai", "frontier"),
            Number.MAX_SAFE_INTEGER,
          ),
        ],
      },
      {
        taskId: "task-2",
        status: "active",
        candidates: [compatiblePremium(apiRoute("google", "frontier"), 1)],
      },
    ];
    expect(() =>
      calculatePremiumBaseline({
        selectedExpectedIncrementalCashMicroUsd: 0,
        tasks,
      }),
    ).toThrow(/safe micro-USD range/);
  });
});

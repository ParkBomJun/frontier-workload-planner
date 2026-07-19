import { describe, expect, it } from "vitest";

import { createMockAnalysis } from "@/lib/ai/mock-response";
import { catalogOverrideTargetFor } from "@/lib/offerings/catalog-overrides";
import { allocateResolvedBestFitPlan } from "@/lib/planning/best-fit-allocator";
import {
  isResolvedBestFitTaskCandidateSet,
  isResolvedBestFitTaskCandidateSetFor,
  resolveBestFitTaskCandidates,
  type ResolveBestFitTaskCandidatesInput,
  type ResolvedBestFitTaskCandidateSet,
} from "@/lib/planning/best-fit-candidates";
import type { TaskInput } from "@/types/domain";
import type { ApiCatalogOverride } from "@/types/pricing";

const PRICING_AS_OF = "2026-07-18";
const PLANNING_AS_OF = "2026-07-18T12:00:00.000Z";
const task: TaskInput = {
  id: "task-1",
  name: "API 설계",
  description: "입력 검증이 있는 API를 설계한다.",
  priority: "high",
  deadlineDate: "2026-07-21",
  failureImpact: "high",
};

function candidateInput(
  originalIndex = 0,
): ResolveBestFitTaskCandidatesInput {
  return {
    task: structuredClone(task),
    analysis: structuredClone(createMockAnalysis([task]).tasks[0]),
    originalIndex,
    planningAsOf: PLANNING_AS_OF,
    pricingAsOf: PRICING_AS_OF,
  };
}

function apiOverride(
  providerId: "anthropic" | "google" | "openai",
  tier: "economy" | "balanced" | "frontier",
  patch: Pick<ApiCatalogOverride, "planningTier" | "standardTextPrice">,
  effectiveFrom = PRICING_AS_OF,
): ApiCatalogOverride {
  return {
    kind: "api-catalog-override",
    provenance: "user-supplied",
    target: catalogOverrideTargetFor(providerId, tier),
    effectiveFrom,
    recordedAt: PLANNING_AS_OF,
    ...(patch.planningTier === undefined
      ? {}
      : { planningTier: patch.planningTier }),
    ...(patch.standardTextPrice === undefined
      ? {}
      : { standardTextPrice: patch.standardTextPrice }),
  };
}

function allocate(
  tasks: readonly ResolvedBestFitTaskCandidateSet[],
  apiOverrides: readonly ApiCatalogOverride[] = [],
) {
  return allocateResolvedBestFitPlan({
    tasks,
    strategy: "balanced",
    planningAsOf: PLANNING_AS_OF,
    pricingAsOf: PRICING_AS_OF,
    incrementalCashBudgetMicroUsd: 0,
    apiOverrides,
  });
}

function apiExclusion(
  providerId: "anthropic" | "google" | "openai",
  modelId: string,
  reasonCode: "below-minimum-quality" | "required-capability-missing",
) {
  return {
    routeIdentity: {
      providerId,
      offeringId: `api.${providerId}.${modelId}.standard-text`,
      resourceId: null,
    },
    status: "ineligible",
    reasonCodes: [reasonCode],
  };
}

describe("Best-fit resolver-issued task candidates", () => {
  it("confirms documented API routes and keeps incompatible routes excluded in canonical order", () => {
    const first = resolveBestFitTaskCandidates(candidateInput());
    const second = resolveBestFitTaskCandidates(candidateInput());

    expect(
      first.confirmedRoutes.map(({ routeIdentity }) => routeIdentity.offeringId),
    ).toEqual([
      "api.openai.gpt-5.6-sol.standard-text",
      "api.openai.gpt-5.6-terra.standard-text",
    ]);
    expect(first.conditionalAlternatives).toEqual([]);
    expect(first.excludedRoutes).toEqual([
      apiExclusion("anthropic", "claude-fable-5", "required-capability-missing"),
      apiExclusion("anthropic", "claude-haiku-4-5", "below-minimum-quality"),
      apiExclusion("anthropic", "claude-sonnet-5", "required-capability-missing"),
      apiExclusion("google", "gemini-3-flash-preview", "required-capability-missing"),
      apiExclusion("google", "gemini-3.1-flash-lite", "below-minimum-quality"),
      apiExclusion("google", "gemini-3.1-pro-preview", "required-capability-missing"),
      apiExclusion("openai", "gpt-5.6-luna", "below-minimum-quality"),
    ]);
    expect(second.excludedRoutes).toEqual(first.excludedRoutes);
    expect(first.excludedRoutes.filter(({ status }) => status === "conditional"))
      .toHaveLength(0);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.excludedRoutes)).toBe(true);
    expect(Object.isFrozen(first.excludedRoutes[0]?.reasonCodes)).toBe(true);
  });

  it("does not freeze caller-owned analysis arrays while issuing an immutable candidate set", () => {
    const input = candidateInput();
    const capabilities = input.analysis.requiredCapabilities;
    const upgrades = input.analysis.upgradeConditions;
    const risks = input.analysis.riskFactors;

    const issued = resolveBestFitTaskCandidates(input);

    expect(Object.isFrozen(issued)).toBe(true);
    expect(Object.isFrozen(issued.analysis.requiredCapabilities)).toBe(true);
    expect(Object.isFrozen(capabilities)).toBe(false);
    expect(Object.isFrozen(upgrades)).toBe(false);
    expect(Object.isFrozen(risks)).toBe(false);
  });

  it("binds an issued set to its task identities, original index, and pricing date", () => {
    const input = candidateInput();
    const issued = resolveBestFitTaskCandidates(input);

    expect(isResolvedBestFitTaskCandidateSet(issued)).toBe(true);
    expect(isResolvedBestFitTaskCandidateSetFor(issued, input)).toBe(true);
    expect(
      isResolvedBestFitTaskCandidateSetFor(issued, {
        ...input,
        task: { ...input.task, id: "task-other" },
      }),
    ).toBe(false);
    expect(
      isResolvedBestFitTaskCandidateSetFor(issued, {
        ...input,
        analysis: { ...input.analysis, taskId: "task-other" },
      }),
    ).toBe(false);
    expect(
      isResolvedBestFitTaskCandidateSetFor(issued, {
        ...input,
        originalIndex: 1,
      }),
    ).toBe(false);
    expect(
      isResolvedBestFitTaskCandidateSetFor(issued, {
        ...input,
        planningAsOf: "2026-07-19T12:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      isResolvedBestFitTaskCandidateSetFor(issued, {
        ...input,
        pricingAsOf: "2026-07-19",
      }),
    ).toBe(false);

    expect(() =>
      resolveBestFitTaskCandidates({
        ...candidateInput(),
        analysis: { ...input.analysis, taskId: "task-other" },
      }),
    ).toThrow(/matching task identity and index/);
    for (const originalIndex of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        resolveBestFitTaskCandidates({ ...candidateInput(), originalIndex }),
      ).toThrow(/matching task identity and index/);
    }
  });

  it("binds issued candidates to canonical override source state", () => {
    const luna = apiOverride("openai", "economy", {
      planningTier: "balanced",
      standardTextPrice: { inputUsdPerMillion: 0.75, outputUsdPerMillion: 4 },
    });
    const sonnet = apiOverride("anthropic", "balanced", {
      planningTier: undefined,
      standardTextPrice: { inputUsdPerMillion: 2.25, outputUsdPerMillion: 11 },
    });
    const input = { ...candidateInput(), apiOverrides: [luna, sonnet] };
    const issued = resolveBestFitTaskCandidates(input);

    expect(isResolvedBestFitTaskCandidateSetFor(issued, input)).toBe(true);
    expect(
      isResolvedBestFitTaskCandidateSetFor(issued, {
        ...input,
        apiOverrides: [sonnet, luna],
      }),
    ).toBe(true);
    expect(
      isResolvedBestFitTaskCandidateSetFor(issued, {
        ...input,
        apiOverrides: [
          { ...luna, standardTextPrice: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 3 } },
          sonnet,
        ],
      }),
    ).toBe(false);
    expect(
      isResolvedBestFitTaskCandidateSetFor(issued, candidateInput()),
    ).toBe(false);

    expect(() => allocate([issued], [sonnet, luna])).not.toThrow();

    const secondTask = {
      ...task,
      id: "task-2",
      name: "두 번째 API 설계",
    };
    const secondBaseInput = candidateInput(1);
    const issuedWithDifferentOverrides = resolveBestFitTaskCandidates({
      ...secondBaseInput,
      task: secondTask,
      analysis: {
        ...secondBaseInput.analysis,
        taskId: secondTask.id,
      },
      apiOverrides: [sonnet],
    });

    expect(() =>
      allocate([issued, issuedWithDifferentOverrides], [luna, sonnet]),
    ).toThrow(/exact resolver-issued candidate sets/);
  });

  it("requires one explicit override source array for every candidate in a plan", () => {
    const luna = apiOverride("openai", "economy", {
      planningTier: "balanced",
      standardTextPrice: { inputUsdPerMillion: 0.75, outputUsdPerMillion: 4 },
    });
    const sonnet = apiOverride("anthropic", "balanced", {
      planningTier: undefined,
      standardTextPrice: { inputUsdPerMillion: 2.25, outputUsdPerMillion: 11 },
    });
    const firstInput = { ...candidateInput(), apiOverrides: [luna, sonnet] };
    const first = resolveBestFitTaskCandidates(firstInput);
    const secondTask = {
      ...task,
      id: "task-2",
      name: "두 번째 API 설계",
    };
    const secondBaseInput = candidateInput(1);
    const second = resolveBestFitTaskCandidates({
      ...secondBaseInput,
      task: secondTask,
      analysis: { ...secondBaseInput.analysis, taskId: secondTask.id },
      apiOverrides: [sonnet],
    });

    const missingOverrides = {
      tasks: [first],
      strategy: "balanced",
      planningAsOf: PLANNING_AS_OF,
      pricingAsOf: PRICING_AS_OF,
      incrementalCashBudgetMicroUsd: 0,
    } as unknown as Parameters<typeof allocateResolvedBestFitPlan>[0];
    expect(() => allocateResolvedBestFitPlan(missingOverrides)).toThrow(
      /explicit API catalog override array/,
    );

    const mixedMissingOverrides = {
      ...missingOverrides,
      tasks: [first, second],
    } as unknown as Parameters<typeof allocateResolvedBestFitPlan>[0];
    expect(() => allocateResolvedBestFitPlan(mixedMissingOverrides)).toThrow(
      /explicit API catalog override array/,
    );

    expect(() => allocate([first], [
      structuredClone(sonnet),
      structuredClone(luna),
    ])).not.toThrow();
    expect(() => allocate([first, second], [luna, sonnet])).toThrow(
      /exact resolver-issued candidate sets/,
    );
  });

  it("applies an exact user planning-tier override on top of confirmed API facts", () => {
    const luna = apiOverride("openai", "economy", {
      planningTier: "premium",
      standardTextPrice: { inputUsdPerMillion: 0.75, outputUsdPerMillion: 4 },
    });
    const issued = resolveBestFitTaskCandidates({
      ...candidateInput(),
      apiOverrides: [luna],
    });
    const lunaRoute = issued.confirmedRoutes.find(
      ({ routeIdentity }) =>
        routeIdentity.offeringId === "api.openai.gpt-5.6-luna.standard-text",
    );

    expect(lunaRoute).toMatchObject({
      mode: "api",
      modelId: "gpt-5.6-luna",
      qualityTier: "premium",
      routeIdentity: {
        providerId: "openai",
        offeringId: "api.openai.gpt-5.6-luna.standard-text",
        resourceId: null,
      },
    });
    expect(issued.excludedRoutes).not.toContainEqual(
      expect.objectContaining({
        routeIdentity: expect.objectContaining({
          offeringId: "api.openai.gpt-5.6-luna.standard-text",
        }),
      }),
    );

    expect(
      () =>
        resolveBestFitTaskCandidates({
          ...candidateInput(),
          apiOverrides: [
            {
              ...luna,
              effectiveFrom: "2026-07-19",
              recordedAt: "2026-07-20T12:00:00.000Z",
            },
          ],
        }),
    ).toThrow(/invalid-user-override/);
  });

  it("rejects invalid and duplicate catalog override targets", () => {
    const luna = apiOverride("openai", "economy", {
      planningTier: "balanced",
      standardTextPrice: undefined,
    });
    expect(() =>
      resolveBestFitTaskCandidates({
        ...candidateInput(),
        apiOverrides: [luna, { ...luna }],
      }),
    ).toThrow(/one value per catalog target/);
    expect(() =>
      resolveBestFitTaskCandidates({
        ...candidateInput(),
        apiOverrides: [
          {
            ...luna,
            target: { ...luna.target, entryId: "unknown-model" },
          },
        ],
      }),
    ).toThrow(/override-target-unresolved/);
    expect(
      isResolvedBestFitTaskCandidateSetFor(
        resolveBestFitTaskCandidates(candidateInput()),
        {
          ...candidateInput(),
          apiOverrides: [
            {
              ...luna,
              target: { ...luna.target, entryId: "unknown-model" },
            },
          ],
        },
      ),
    ).toBe(false);
  });

  it("accepts the exact issued set and holds a confirmed route when cash is zero", () => {
    const issued = resolveBestFitTaskCandidates(candidateInput());
    const plan = allocate([issued]);

    expect(plan).toMatchObject({
      contractVersion: "best-fit-plan-v1",
      planningAsOf: PLANNING_AS_OF,
      pricingAsOf: PRICING_AS_OF,
      incrementalCashBudgetMicroUsd: 0,
      activeTaskCount: 0,
      heldTaskCount: 1,
      infeasibleTaskCount: 0,
      expectedWithinBudget: true,
      highExceedsBudget: false,
      premiumBaseline: null,
      spendComparison: null,
    });
    expect(plan.tasks).toEqual([
      {
        status: "held",
        taskId: task.id,
        originalIndex: 0,
        routeIdentity: null,
        strategyTargetTier: "balanced",
        holdReason: "incremental-cash-budget-exhausted",
        appliedUpgradeTriggers: ["high-failure-exposure"],
        conditionalAlternatives: [],
      },
    ]);
    expect(plan.reservationOrderTaskIds).toEqual([task.id]);
    expect(plan.reliefOrderTaskIds).toEqual([task.id]);
    expect(plan.cash).toEqual({
      lowMicroUsd: 0,
      expectedMicroUsd: 0,
      highMicroUsd: 0,
      apiMicroUsd: { low: 0, expected: 0, high: 0 },
      subscriptionFeeMicroUsd: 0,
      paidOverageMicroUsd: { low: 0, expected: 0, high: 0 },
      scenarioOverflow: { low: false, expected: false, high: false },
    });
  });

  it("rejects clones and mismatched planning or pricing dates", () => {
    const issued = resolveBestFitTaskCandidates(candidateInput());
    const shallowClone = { ...issued } as ResolvedBestFitTaskCandidateSet;
    const deepClone = structuredClone(issued) as ResolvedBestFitTaskCandidateSet;

    expect(isResolvedBestFitTaskCandidateSet(shallowClone)).toBe(false);
    expect(isResolvedBestFitTaskCandidateSet(deepClone)).toBe(false);
    expect(() => allocate([shallowClone])).toThrow(/exact resolver-issued candidate sets/);
    expect(() => allocate([deepClone])).toThrow(/exact resolver-issued candidate sets/);
    expect(() =>
      allocateResolvedBestFitPlan({
        tasks: [issued],
        strategy: "balanced",
        planningAsOf: "2026-07-19T12:00:00.000Z",
        pricingAsOf: PRICING_AS_OF,
        incrementalCashBudgetMicroUsd: 0,
        apiOverrides: [],
      }),
    ).toThrow(/exact resolver-issued candidate sets/);
    expect(() =>
      allocateResolvedBestFitPlan({
        tasks: [issued],
        strategy: "balanced",
        planningAsOf: PLANNING_AS_OF,
        pricingAsOf: "2026-07-19",
        incrementalCashBudgetMicroUsd: 0,
        apiOverrides: [],
      }),
    ).toThrow(/exact resolver-issued candidate sets/);
  });

  it("rejects duplicate task identities and non-contiguous issued indexes", () => {
    const indexZero = resolveBestFitTaskCandidates(candidateInput(0));
    const duplicateTaskAtIndexOne = resolveBestFitTaskCandidates(candidateInput(1));

    expect(() => allocate([indexZero, duplicateTaskAtIndexOne])).toThrow(
      /task IDs and original indexes must be unique/,
    );
    expect(() => allocate([duplicateTaskAtIndexOne])).toThrow(
      /original task indexes must be contiguous from zero/,
    );
  });
});

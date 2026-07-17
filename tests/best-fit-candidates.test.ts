import { describe, expect, it } from "vitest";

import { createMockAnalysis } from "@/lib/ai/mock-response";
import { allocateResolvedBestFitPlan } from "@/lib/planning/best-fit-allocator";
import {
  isResolvedBestFitTaskCandidateSet,
  isResolvedBestFitTaskCandidateSetFor,
  resolveBestFitTaskCandidates,
  type ResolveBestFitTaskCandidatesInput,
  type ResolvedBestFitTaskCandidateSet,
} from "@/lib/planning/best-fit-candidates";
import type { TaskInput } from "@/types/domain";

const PRICING_AS_OF = "2026-07-17";
const PLANNING_AS_OF = "2026-07-17T12:00:00.000Z";
const task: TaskInput = {
  id: "task-1",
  name: "API 설계",
  description: "입력 검증이 있는 API를 설계한다.",
  priority: "high",
  deadlineDate: "2026-07-21",
  failureImpact: "high",
};

const conditionalReasons = [
  "evidence-authority-invalid",
  "access-limits-incomplete",
  "model-capabilities-incomplete",
  "access-capabilities-incomplete",
] as const;

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

function allocate(tasks: readonly ResolvedBestFitTaskCandidateSet[]) {
  return allocateResolvedBestFitPlan({
    tasks,
    strategy: "balanced",
    planningAsOf: PLANNING_AS_OF,
    pricingAsOf: PRICING_AS_OF,
    incrementalCashBudgetMicroUsd: 0,
  });
}

function apiExclusion(
  providerId: "anthropic" | "google" | "openai",
  modelId: string,
  status: "conditional" | "ineligible",
) {
  return {
    routeIdentity: {
      providerId,
      offeringId: `api.${providerId}.${modelId}.standard-text`,
      resourceId: null,
    },
    status,
    reasonCodes:
      status === "conditional" ? conditionalReasons : ["below-minimum-quality"],
  };
}

describe("Best-fit resolver-issued task candidates", () => {
  it("keeps the current production API catalog excluded in canonical order", () => {
    const first = resolveBestFitTaskCandidates(candidateInput());
    const second = resolveBestFitTaskCandidates(candidateInput());

    expect(first.confirmedRoutes).toEqual([]);
    expect(first.conditionalAlternatives).toEqual([]);
    expect(first.excludedRoutes).toEqual([
      apiExclusion("anthropic", "claude-fable-5", "conditional"),
      apiExclusion("anthropic", "claude-haiku-4-5", "ineligible"),
      apiExclusion("anthropic", "claude-sonnet-5", "conditional"),
      apiExclusion("google", "gemini-3-flash-preview", "conditional"),
      apiExclusion("google", "gemini-3.1-flash-lite", "ineligible"),
      apiExclusion("google", "gemini-3.1-pro-preview", "conditional"),
      apiExclusion("openai", "gpt-5.6-luna", "ineligible"),
      apiExclusion("openai", "gpt-5.6-sol", "conditional"),
      apiExclusion("openai", "gpt-5.6-terra", "conditional"),
    ]);
    expect(second.excludedRoutes).toEqual(first.excludedRoutes);
    expect(first.excludedRoutes.filter(({ status }) => status === "conditional"))
      .toHaveLength(6);
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
        planningAsOf: "2026-07-18T12:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      isResolvedBestFitTaskCandidateSetFor(issued, {
        ...input,
        pricingAsOf: "2026-07-18",
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

  it("accepts the exact issued set and returns an infeasible current-catalog plan", () => {
    const issued = resolveBestFitTaskCandidates(candidateInput());
    const plan = allocate([issued]);

    expect(plan).toMatchObject({
      contractVersion: "best-fit-plan-v1",
      planningAsOf: PLANNING_AS_OF,
      pricingAsOf: PRICING_AS_OF,
      incrementalCashBudgetMicroUsd: 0,
      activeTaskCount: 0,
      heldTaskCount: 0,
      infeasibleTaskCount: 1,
      expectedWithinBudget: true,
      highExceedsBudget: false,
      premiumBaseline: null,
      spendComparison: null,
    });
    expect(plan.tasks).toEqual([
      {
        status: "infeasible",
        taskId: task.id,
        originalIndex: 0,
        routeIdentity: null,
        strategyTargetTier: "balanced",
        infeasibleReason: "no-compatible-confirmed-route",
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
        planningAsOf: "2026-07-18T12:00:00.000Z",
        pricingAsOf: PRICING_AS_OF,
        incrementalCashBudgetMicroUsd: 0,
      }),
    ).toThrow(/exact resolver-issued candidate sets/);
    expect(() =>
      allocateResolvedBestFitPlan({
        tasks: [issued],
        strategy: "balanced",
        planningAsOf: PLANNING_AS_OF,
        pricingAsOf: "2026-07-18",
        incrementalCashBudgetMicroUsd: 0,
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

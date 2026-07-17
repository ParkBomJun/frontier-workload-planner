import { describe, expect, it } from "vitest";

import { allocateBudget, strategyTargetTier } from "@/lib/calculation/allocate-budget";
import type { PlanningSettings, TaskAnalysis, TaskInput } from "@/types/domain";

const tasks: TaskInput[] = [
  { id: "task-low", name: "간단한 초안", description: "짧은 초안을 작성한다." },
  { id: "task-high", name: "핵심 설계", description: "중요한 시스템을 설계한다." },
];

const baseAnalysis: TaskAnalysis = {
  taskId: "task-low",
  taskType: "writing",
  complexity: "low",
  reasoningDepth: "light",
  expectedIterations: 2,
  estimatedInputSize: "m",
  estimatedOutputSize: "m",
  uncertainty: "low",
  recommendedModelTier: "balanced",
  riskFactors: [],
  rationale: "Fixture",
};

const analyses: TaskAnalysis[] = [
  baseAnalysis,
  {
    ...baseAnalysis,
    taskId: "task-high",
    taskType: "software-development",
    complexity: "high",
    reasoningDepth: "deep",
    uncertainty: "high",
  },
];

const settings: PlanningSettings = {
  budgetUsd: 5,
  deadlineDays: 7,
  strategy: "balanced",
};

describe("strategyTargetTier", () => {
  it("shifts one explainable tier and respects the endpoints", () => {
    expect(strategyTargetTier("frontier", "cost-saver")).toBe("balanced");
    expect(strategyTargetTier("economy", "cost-saver")).toBe("economy");
    expect(strategyTargetTier("balanced", "balanced")).toBe("balanced");
    expect(strategyTargetTier("balanced", "quality-first")).toBe("frontier");
    expect(strategyTargetTier("frontier", "quality-first")).toBe("frontier");
  });
});

describe("allocateBudget", () => {
  it("keeps strategy targets when the Expected total fits", () => {
    const plan = allocateBudget(tasks, analyses, settings);

    expect(plan.tasks.map((task) => task.assignedTier)).toEqual(["balanced", "balanced"]);
    expect(plan.totals.expectedUsd).toBeCloseTo(0.4);
    expect(plan.expectedWithinBudget).toBe(true);
    expect(plan.downgradedTaskCount).toBe(0);
  });

  it("downgrades the lower-need task first until Expected fits", () => {
    const plan = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.28 });

    expect(plan.tasks.map((task) => task.assignedTier)).toEqual(["economy", "balanced"]);
    expect(plan.totals.expectedUsd).toBeCloseTo(0.28);
    expect(plan.expectedWithinBudget).toBe(true);
    expect(plan.highExceedsBudget).toBe(true);
    expect(plan.downgradedTaskCount).toBe(1);
  });

  it("flags a budget that cannot cover the all-economy minimum", () => {
    const plan = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.01 });

    expect(plan.tasks.every((task) => task.assignedTier === "economy")).toBe(true);
    expect(plan.minimumExpectedCostUsd).toBeCloseTo(0.16);
    expect(plan.expectedWithinBudget).toBe(false);
    expect(plan.warnings[0]).toContain("Economy");
  });

  it("rejects mismatched task identities instead of returning a partial plan", () => {
    expect(() => allocateBudget(tasks, analyses.slice(0, 1), settings)).toThrow(
      "same non-zero length",
    );
  });

  it("treats an exact micro-USD budget boundary as fitting", () => {
    const plan = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.28 });

    expect(plan.totals.expectedUsd).toBe(0.28);
    expect(plan.expectedWithinBudget).toBe(true);
    expect(plan.tasks.map((task) => task.assignedTier)).toEqual(["economy", "balanced"]);
  });

  it("sums float-sensitive task costs without an extra downgrade", () => {
    const threeTasks = Array.from({ length: 3 }, (_, index) => ({
      id: `task-${index + 1}`,
      name: `작업 ${index + 1}`,
      description: "Fixture",
    }));
    const threeAnalyses = threeTasks.map((task) => ({
      ...baseAnalysis,
      taskId: task.id,
    }));
    const plan = allocateBudget(threeTasks, threeAnalyses, {
      ...settings,
      budgetUsd: 0.24,
      strategy: "cost-saver",
    });

    expect(plan.totals.expectedUsd).toBe(0.24);
    expect(plan.expectedWithinBudget).toBe(true);
  });

  it("uses input order for complete ties and can lower the same task twice", () => {
    const tiedAnalyses = analyses.map((analysis) => ({
      ...analysis,
      complexity: "medium" as const,
      reasoningDepth: "moderate" as const,
      uncertainty: "medium" as const,
      recommendedModelTier: "frontier" as const,
    }));
    const plan = allocateBudget(tasks, tiedAnalyses, { ...settings, budgetUsd: 0.48 });

    expect(plan.tasks.map((task) => task.assignedTier)).toEqual(["economy", "frontier"]);
    expect(plan.totals.expectedUsd).toBe(0.48);
  });

  it("joins analyses by taskId even when their array order changes", () => {
    const plan = allocateBudget(tasks, [...analyses].reverse(), settings);

    expect(plan.tasks.map((task) => task.taskId)).toEqual(["task-low", "task-high"]);
    expect(plan.tasks.map((task) => task.analysis.taskId)).toEqual(["task-low", "task-high"]);
  });

  it("does not treat High equal to the budget as an overrun", () => {
    const oneTask = [tasks[0]];
    const oneAnalysis = [{ ...baseAnalysis, recommendedModelTier: "economy" as const }];
    const plan = allocateBudget(oneTask, oneAnalysis, { ...settings, budgetUsd: 0.24 });

    expect(plan.totals.highUsd).toBe(0.24);
    expect(plan.highExceedsBudget).toBe(false);
  });

  it("keeps cost and tier results independent from the reference deadline", () => {
    const sevenDays = allocateBudget(tasks, analyses, settings);
    const thirtyDays = allocateBudget(tasks, analyses, { ...settings, deadlineDays: 30 });

    expect(thirtyDays.totals).toEqual(sevenDays.totals);
    expect(thirtyDays.tasks.map((task) => task.assignedTier)).toEqual(
      sevenDays.tasks.map((task) => task.assignedTier),
    );
  });

  it("rejects duplicate task and analysis identities", () => {
    expect(() =>
      allocateBudget([{ ...tasks[0] }, { ...tasks[1], id: tasks[0].id }], analyses, settings),
    ).toThrow("exactly one matching analysis");
    expect(() =>
      allocateBudget(tasks, [{ ...analyses[0] }, { ...analyses[1], taskId: analyses[0].taskId }], settings),
    ).toThrow("exactly one matching analysis");
  });

  it("rejects settings outside the supported UI bounds", () => {
    expect(() => allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.001 })).toThrow(
      "at least 0.01",
    );
    expect(() => allocateBudget(tasks, analyses, { ...settings, budgetUsd: 10_001 })).toThrow(
      "at most 10,000",
    );
    expect(() => allocateBudget(tasks, analyses, { ...settings, deadlineDays: 1.5 })).toThrow(
      "integer",
    );
    expect(() => allocateBudget(tasks, analyses, { ...settings, deadlineDays: 91 })).toThrow(
      "1 through 90",
    );
  });
});

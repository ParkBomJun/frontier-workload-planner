import { describe, expect, it } from "vitest";

import { allocateBudget, strategyTargetTier } from "@/lib/calculation/allocate-budget";
import type { PlanningSettings, TaskAnalysis, TaskInput } from "@/types/domain";

const tasks: TaskInput[] = [
  {
    id: "task-low",
    name: "간단한 초안",
    description: "짧은 초안을 작성한다.",
    priority: "low",
  },
  {
    id: "task-high",
    name: "핵심 설계",
    description: "중요한 시스템을 설계한다.",
    priority: "high",
  },
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
    expect(plan.totals.expectedUsd).toBeCloseTo(0.44);
    expect(plan.expectedWithinBudget).toBe(true);
    expect(plan.downgradedTaskCount).toBe(0);
  });

  it("downgrades the lower-need task first until Expected fits", () => {
    const plan = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.31 });

    expect(plan.tasks.map((task) => task.assignedTier)).toEqual(["economy", "balanced"]);
    expect(plan.totals.expectedUsd).toBeCloseTo(0.308);
    expect(plan.expectedWithinBudget).toBe(true);
    expect(plan.highExceedsBudget).toBe(true);
    expect(plan.downgradedTaskCount).toBe(1);
  });

  it("holds work when the all-economy minimum exceeds budget", () => {
    const plan = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.01 });

    expect(plan.tasks.every((task) => task.status === "held")).toBe(true);
    expect(plan.tasks.every((task) => task.cost === null && task.modelId === null)).toBe(true);
    expect(plan.minimumExpectedCostUsd).toBeCloseTo(0.176);
    expect(plan.totals).toEqual({ lowUsd: 0, expectedUsd: 0, highUsd: 0 });
    expect(plan.expectedWithinBudget).toBe(true);
    expect(plan.heldTaskCount).toBe(2);
    expect(plan.activeTaskCount).toBe(0);
    expect(plan.warnings[0]).toContain("보류");
  });

  it("rejects mismatched task identities instead of returning a partial plan", () => {
    expect(() => allocateBudget(tasks, analyses.slice(0, 1), settings)).toThrow(
      "same non-zero length",
    );
  });

  it("treats an exact micro-USD budget boundary as fitting", () => {
    const plan = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.308 });

    expect(plan.totals.expectedUsd).toBe(0.308);
    expect(plan.expectedWithinBudget).toBe(true);
    expect(plan.tasks.map((task) => task.assignedTier)).toEqual(["economy", "balanced"]);
  });

  it("sums float-sensitive task costs without an extra downgrade", () => {
    const threeTasks = Array.from({ length: 3 }, (_, index) => ({
      id: `task-${index + 1}`,
      name: `작업 ${index + 1}`,
      description: "Fixture",
      priority: "medium" as const,
    }));
    const threeAnalyses = threeTasks.map((task) => ({
      ...baseAnalysis,
      taskId: task.id,
    }));
    const plan = allocateBudget(threeTasks, threeAnalyses, {
      ...settings,
      budgetUsd: 0.264,
      strategy: "cost-saver",
    });

    expect(plan.totals.expectedUsd).toBe(0.264);
    expect(plan.expectedWithinBudget).toBe(true);
  });

  it("uses input order for complete ties and can lower the same task twice", () => {
    const tiedTasks = tasks.map((task) => ({ ...task, priority: "medium" as const }));
    const tiedAnalyses = analyses.map((analysis) => ({
      ...analysis,
      complexity: "medium" as const,
      reasoningDepth: "moderate" as const,
      uncertainty: "medium" as const,
      recommendedModelTier: "frontier" as const,
    }));
    const plan = allocateBudget(tiedTasks, tiedAnalyses, { ...settings, budgetUsd: 0.53 });

    expect(plan.tasks.map((task) => task.assignedTier)).toEqual(["economy", "frontier"]);
    expect(plan.totals.expectedUsd).toBe(0.528);
  });

  it("joins analyses by taskId even when their array order changes", () => {
    const plan = allocateBudget(tasks, [...analyses].reverse(), settings);

    expect(plan.tasks.map((task) => task.taskId)).toEqual(["task-low", "task-high"]);
    expect(plan.tasks.map((task) => task.analysis.taskId)).toEqual(["task-low", "task-high"]);
  });

  it("does not treat High equal to the budget as an overrun", () => {
    const oneTask = [tasks[0]];
    const oneAnalysis = [{ ...baseAnalysis, recommendedModelTier: "economy" as const }];
    const plan = allocateBudget(oneTask, oneAnalysis, { ...settings, budgetUsd: 0.264 });

    expect(plan.totals.highUsd).toBe(0.264);
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

  it("uses user priority before GPT need when choosing a downgrade", () => {
    const priorityAnalyses: TaskAnalysis[] = [
      {
        ...analyses[0],
        recommendedModelTier: "frontier",
        reasoningDepth: "deep",
        complexity: "very-high",
        uncertainty: "high",
      },
      analyses[1],
    ];
    const plan = allocateBudget(tasks, priorityAnalyses, { ...settings, budgetUsd: 0.44 });

    expect(plan.tasks.map((task) => task.status)).toEqual(["active", "active"]);
    expect(plan.tasks.map((task) => task.assignedTier)).toEqual(["balanced", "balanced"]);
    expect(plan.tasks[0].wasDowngradedForBudget).toBe(true);
    expect(plan.tasks[1].wasDowngradedForBudget).toBe(false);
  });

  it("holds low, then medium, while preserving high-priority work", () => {
    const threeTasks: TaskInput[] = [
      { ...tasks[0], id: "low", priority: "low" },
      { ...tasks[0], id: "medium", priority: "medium" },
      { ...tasks[0], id: "high", priority: "high" },
    ];
    const threeAnalyses = threeTasks.map((task) => ({ ...baseAnalysis, taskId: task.id }));
    const plan = allocateBudget(threeTasks, threeAnalyses, { ...settings, budgetUsd: 0.088 });

    expect(plan.tasks.map((task) => task.status)).toEqual(["held", "held", "active"]);
    expect(plan.tasks[2].assignedTier).toBe("economy");
    expect(plan.heldTaskCount).toBe(2);
    expect(plan.totals.expectedUsd).toBe(0.088);
  });

  it("holds low-priority work before higher-priority work even when GPT need ranks it higher", () => {
    const priorityAnalyses: TaskAnalysis[] = [
      {
        ...baseAnalysis,
        taskId: "task-low",
        recommendedModelTier: "frontier",
        reasoningDepth: "deep",
        complexity: "very-high",
        uncertainty: "high",
        expectedIterations: 5,
        estimatedInputSize: "xl",
        estimatedOutputSize: "xl",
      },
      {
        ...baseAnalysis,
        taskId: "task-high",
        recommendedModelTier: "economy",
        expectedIterations: 1,
        estimatedInputSize: "xs",
        estimatedOutputSize: "xs",
      },
    ];
    const plan = allocateBudget(tasks, priorityAnalyses, { ...settings, budgetUsd: 0.02 });

    expect(plan.tasks.map((task) => task.status)).toEqual(["held", "active"]);
    expect(plan.tasks[1].assignedTier).toBe("economy");
    expect(plan.totals).toEqual({ lowUsd: 0.002, expectedUsd: 0.004, highUsd: 0.017 });
    expect(plan.highExceedsBudget).toBe(false);
  });

  it("restarts allocation from strategy targets after holding a task", () => {
    const resetTasks: TaskInput[] = [
      { ...tasks[0], id: "large-low", priority: "low" },
      { ...tasks[1], id: "medium-high", priority: "high" },
    ];
    const resetAnalyses: TaskAnalysis[] = [
      {
        ...baseAnalysis,
        taskId: "large-low",
        expectedIterations: 1,
        estimatedInputSize: "xl",
        estimatedOutputSize: "xl",
      },
      { ...baseAnalysis, taskId: "medium-high" },
    ];
    const plan = allocateBudget(resetTasks, resetAnalyses, { ...settings, budgetUsd: 0.3 });

    expect(plan.tasks[0].status).toBe("held");
    expect(plan.tasks[1].status).toBe("active");
    expect(plan.tasks[1].assignedTier).toBe("balanced");
    expect(plan.totals.expectedUsd).toBe(0.22);
  });

  it("does not hold at the exact economy boundary and holds one task one micro-dollar below", () => {
    const exact = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.176 });
    const below = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.175999 });

    expect(exact.heldTaskCount).toBe(0);
    expect(exact.totals.expectedUsd).toBe(0.176);
    expect(below.heldTaskCount).toBe(1);
    expect(below.tasks[0].status).toBe("held");
    expect(below.tasks[1].status).toBe("active");
  });

  it("reactivates held work when budget increases without changing analysis", () => {
    const constrained = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.088 });
    const expanded = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.44 });

    expect(constrained.heldTaskCount).toBe(1);
    expect(expanded.heldTaskCount).toBe(0);
    expect(expanded.activeTaskCount).toBe(2);
    expect(expanded.tasks.map((task) => task.analysis)).toEqual(analyses);
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

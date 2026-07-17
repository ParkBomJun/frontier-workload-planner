import { describe, expect, it } from "vitest";

import { allocateBudget, strategyTargetTier } from "@/lib/calculation/allocate-budget";
import {
  PROVIDER_IDS,
  type LegacyTaskAnalysis,
  type PlanningSettings,
  type ProviderId,
  type TaskAnalysis,
  type TaskInput,
} from "@/types/domain";

const tasks: TaskInput[] = [
  {
    id: "task-low",
    name: "간단한 초안",
    description: "짧은 초안을 작성한다.",
    priority: "low",
    deadlineDate: null,
    failureImpact: "medium",
  },
  {
    id: "task-high",
    name: "핵심 설계",
    description: "중요한 시스템을 설계한다.",
    priority: "high",
    deadlineDate: null,
    failureImpact: "medium",
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
  workMode: "interactive",
  requiredQualityTier: "economy",
  requiredCapabilities: [],
  upgradeConditions: [],
  failureRisk: "medium",
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

    expect(plan.providerId).toBe("openai");
    expect(plan.tasks.map((task) => task.assignedTier)).toEqual(["balanced", "balanced"]);
    expect(plan.totals.expectedUsd).toBe(0.4);
    expect(plan.expectedWithinBudget).toBe(true);
    expect(plan.downgradedTaskCount).toBe(0);
  });

  it("downgrades the lower-need task first until Expected fits", () => {
    const plan = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.28 });

    expect(plan.tasks.map((task) => task.assignedTier)).toEqual(["economy", "balanced"]);
    expect(plan.totals.expectedUsd).toBe(0.28);
    expect(plan.expectedWithinBudget).toBe(true);
    expect(plan.highExceedsBudget).toBe(true);
    expect(plan.downgradedTaskCount).toBe(1);
  });

  it("holds work when the all-economy minimum exceeds budget", () => {
    const plan = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.01 });

    expect(plan.tasks.every((task) => task.status === "held")).toBe(true);
    expect(plan.tasks.every((task) => task.cost === null && task.modelId === null)).toBe(true);
    expect(plan.minimumExpectedCostUsd).toBe(0.16);
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
      priority: "medium" as const,
      deadlineDate: null,
      failureImpact: "medium" as const,
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
    const tiedTasks = tasks.map((task) => ({ ...task, priority: "medium" as const }));
    const tiedAnalyses = analyses.map((analysis) => ({
      ...analysis,
      complexity: "medium" as const,
      reasoningDepth: "moderate" as const,
      uncertainty: "medium" as const,
      recommendedModelTier: "frontier" as const,
    }));
    const plan = allocateBudget(tiedTasks, tiedAnalyses, { ...settings, budgetUsd: 0.48 });

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
    const plan = allocateBudget(tasks, priorityAnalyses, { ...settings, budgetUsd: 0.4 });

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
    const plan = allocateBudget(threeTasks, threeAnalyses, { ...settings, budgetUsd: 0.08 });

    expect(plan.tasks.map((task) => task.status)).toEqual(["held", "held", "active"]);
    expect(plan.tasks[2].assignedTier).toBe("economy");
    expect(plan.heldTaskCount).toBe(2);
    expect(plan.totals.expectedUsd).toBe(0.08);
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
    expect(plan.totals).toEqual({ lowUsd: 0.002, expectedUsd: 0.004, highUsd: 0.016 });
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
    expect(plan.totals.expectedUsd).toBe(0.2);
  });

  it("does not hold at the exact economy boundary and holds one task one micro-dollar below", () => {
    const exact = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.16 });
    const below = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.159999 });

    expect(exact.heldTaskCount).toBe(0);
    expect(exact.totals.expectedUsd).toBe(0.16);
    expect(below.heldTaskCount).toBe(1);
    expect(below.tasks[0].status).toBe("held");
    expect(below.tasks[1].status).toBe("active");
  });

  it("reactivates held work when budget increases without changing analysis", () => {
    const constrained = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.08 });
    const expanded = allocateBudget(tasks, analyses, { ...settings, budgetUsd: 0.4 });

    expect(constrained.heldTaskCount).toBe(1);
    expect(expanded.heldTaskCount).toBe(0);
    expect(expanded.activeTaskCount).toBe(2);
    expect(expanded.tasks.map((task) => task.analysis)).toEqual(analyses);
  });

  it.each(
    [
      ["openai", "gpt-5.6-terra", 0.2],
      ["anthropic", "claude-sonnet-5", 0.144],
      ["google", "gemini-3-flash-preview", 0.04],
    ] satisfies Array<[ProviderId, string, number]>,
  )("maps a balanced tier to the %s catalog model", (providerId, modelId, expectedUsd) => {
    const plan = allocateBudget([tasks[0]], [analyses[0]], settings, providerId);

    expect(plan.providerId).toBe(providerId);
    expect(plan.tasks[0]).toMatchObject({
      status: "active",
      assignedTier: "balanced",
      modelId,
    });
    expect(plan.totals.expectedUsd).toBe(expectedUsd);
  });

  it.each(
    [
      ["openai", 0.08],
      ["anthropic", 0.072],
      ["google", 0.02],
    ] satisfies Array<[ProviderId, number]>,
  )("treats %s exact economy cost as active and one micro-dollar less as held", (
    providerId,
    exactBudget,
  ) => {
    const exact = allocateBudget(
      [tasks[0]],
      [analyses[0]],
      { ...settings, budgetUsd: exactBudget },
      providerId,
    );
    const below = allocateBudget(
      [tasks[0]],
      [analyses[0]],
      { ...settings, budgetUsd: exactBudget - 0.000001 },
      providerId,
    );

    expect(exact.tasks[0].status).toBe("active");
    expect(exact.totals.expectedUsd).toBe(exactBudget);
    expect(below.tasks[0].status).toBe("held");
    expect(below.totals.expectedUsd).toBe(0);
  });

  it("does not mutate the shared GPT analysis when calculating each provider", () => {
    const snapshot = structuredClone(analyses);

    PROVIDER_IDS.forEach((providerId) => allocateBudget(tasks, analyses, settings, providerId));

    expect(analyses).toEqual(snapshot);
  });

  it("never lets Cost Saver cross a v2 hard minimum quality floor", () => {
    const minimumBalanced = {
      ...baseAnalysis,
      requiredQualityTier: "balanced" as const,
    };
    const fitting = allocateBudget(
      [tasks[0]],
      [minimumBalanced],
      { ...settings, budgetUsd: 0.2, strategy: "cost-saver" },
    );
    const constrained = allocateBudget(
      [tasks[0]],
      [minimumBalanced],
      { ...settings, budgetUsd: 0.08, strategy: "cost-saver" },
    );

    expect(fitting.tasks[0]).toMatchObject({ status: "active", assignedTier: "balanced" });
    expect(constrained.tasks[0]).toMatchObject({ status: "held", assignedTier: null });
    expect(constrained.minimumExpectedCostUsd).toBe(0.2);
  });

  it("keeps the historical API-only strategy behavior for legacy analysis", () => {
    const legacyAnalysis: LegacyTaskAnalysis = {
      taskId: baseAnalysis.taskId,
      taskType: baseAnalysis.taskType,
      complexity: baseAnalysis.complexity,
      reasoningDepth: baseAnalysis.reasoningDepth,
      expectedIterations: baseAnalysis.expectedIterations,
      estimatedInputSize: baseAnalysis.estimatedInputSize,
      estimatedOutputSize: baseAnalysis.estimatedOutputSize,
      uncertainty: baseAnalysis.uncertainty,
      recommendedModelTier: baseAnalysis.recommendedModelTier,
      riskFactors: baseAnalysis.riskFactors,
      rationale: baseAnalysis.rationale,
    };
    const plan = allocateBudget(
      [tasks[0]],
      [legacyAnalysis],
      { ...settings, budgetUsd: 0.08, strategy: "cost-saver" },
    );

    expect(plan.tasks[0]).toMatchObject({ status: "active", assignedTier: "economy" });
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

import { describe, expect, it } from "vitest";

import { compareProviderPlans } from "@/lib/calculation/compare-providers";
import {
  PROVIDER_IDS,
  type PlanningSettings,
  type TaskAnalysis,
  type TaskInput,
} from "@/types/domain";

const tasks: TaskInput[] = [
  {
    id: "task-low",
    name: "낮은 우선순위 작업",
    description: "비교 테스트 작업",
    priority: "low",
    deadlineDate: null,
    failureImpact: "medium",
  },
  {
    id: "task-high",
    name: "높은 우선순위 작업",
    description: "비교 테스트 작업",
    priority: "high",
    deadlineDate: null,
    failureImpact: "medium",
  },
];

const analyses: TaskAnalysis[] = tasks.map((task) => ({
  taskId: task.id,
  taskType: "software-development",
  complexity: "medium",
  reasoningDepth: "moderate",
  expectedIterations: 2,
  estimatedInputSize: "m",
  estimatedOutputSize: "m",
  uncertainty: "medium",
  recommendedModelTier: "balanced",
  workMode: "interactive",
  requiredQualityTier: "economy",
  requiredCapabilities: [],
  upgradeConditions: [],
  failureRisk: "medium",
  riskFactors: [],
  rationale: "Shared GPT fixture",
}));

const settings: PlanningSettings = {
  budgetUsd: 0.15,
  deadlineDays: 7,
  strategy: "balanced",
};

describe("compareProviderPlans", () => {
  it("projects one shared GPT analysis through all providers in stable order", () => {
    const result = compareProviderPlans(tasks, analyses, settings);

    expect(Object.keys(result.plans)).toEqual([...PROVIDER_IDS]);
    expect(result.comparisons.map((comparison) => comparison.providerId)).toEqual([
      ...PROVIDER_IDS,
    ]);
    for (const providerId of PROVIDER_IDS) {
      expect(result.plans[providerId].tasks.map((task) => task.analysis)).toEqual(analyses);
    }
  });

  it("reports provider totals, full-work fit, and hold counts independently", () => {
    const { comparisons } = compareProviderPlans(tasks, analyses, settings);

    expect(comparisons).toEqual([
      {
        providerId: "openai",
        totals: { lowUsd: 0.02, expectedUsd: 0.08, highUsd: 0.24 },
        expectedWithinBudget: true,
        allTasksActiveWithinBudget: false,
        highExceedsBudget: true,
        activeTaskCount: 1,
        heldTaskCount: 1,
        infeasibleTaskCount: 0,
        downgradedTaskCount: 1,
        limitReassignedTaskCount: 0,
      },
      {
        providerId: "anthropic",
        totals: { lowUsd: 0.036, expectedUsd: 0.144, highUsd: 0.432 },
        expectedWithinBudget: true,
        allTasksActiveWithinBudget: true,
        highExceedsBudget: true,
        activeTaskCount: 2,
        heldTaskCount: 0,
        infeasibleTaskCount: 0,
        downgradedTaskCount: 2,
        limitReassignedTaskCount: 0,
      },
      {
        providerId: "google",
        totals: { lowUsd: 0.02, expectedUsd: 0.08, highUsd: 0.24 },
        expectedWithinBudget: true,
        allTasksActiveWithinBudget: true,
        highExceedsBudget: true,
        activeTaskCount: 2,
        heldTaskCount: 0,
        infeasibleTaskCount: 0,
        downgradedTaskCount: 0,
        limitReassignedTaskCount: 0,
      },
    ]);
  });

  it("maps the same balanced tier to each provider catalog without quality ranking", () => {
    const { plans } = compareProviderPlans(tasks, analyses, {
      ...settings,
      budgetUsd: 5,
    });

    expect(plans.openai.tasks.map((task) => task.modelId)).toEqual([
      "gpt-5.6-terra",
      "gpt-5.6-terra",
    ]);
    expect(plans.anthropic.tasks.map((task) => task.modelId)).toEqual([
      "claude-sonnet-5",
      "claude-sonnet-5",
    ]);
    expect(plans.google.tasks.map((task) => task.modelId)).toEqual([
      "gemini-3-flash-preview",
      "gemini-3-flash-preview",
    ]);
    expect(plans.openai.tasks.map((task) => task.analysis.recommendedModelTier)).toEqual([
      "balanced",
      "balanced",
    ]);
    expect(plans.anthropic.tasks.map((task) => task.analysis.recommendedModelTier)).toEqual([
      "balanced",
      "balanced",
    ]);
    expect(plans.google.tasks.map((task) => task.analysis.recommendedModelTier)).toEqual([
      "balanced",
      "balanced",
    ]);
  });

  it("reactivates held work after a budget increase while reusing analyses", () => {
    const constrained = compareProviderPlans(tasks, analyses, settings);
    const expanded = compareProviderPlans(tasks, analyses, { ...settings, budgetUsd: 0.4 });

    expect(constrained.plans.openai.heldTaskCount).toBe(1);
    expect(expanded.comparisons.every((comparison) => comparison.heldTaskCount === 0)).toBe(true);
    expect(expanded.comparisons.every((comparison) => comparison.allTasksActiveWithinBudget)).toBe(
      true,
    );
    for (const providerId of PROVIDER_IDS) {
      expect(expanded.plans[providerId].tasks.map((task) => task.analysis)).toEqual(analyses);
    }
  });
});

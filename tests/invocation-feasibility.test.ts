import { describe, expect, it } from "vitest";

import { PROVIDER_CATALOG } from "@/config/provider-catalog";
import { compareProviderPlans } from "@/lib/calculation/compare-providers";
import {
  validateInvocationFeasibility,
  validateInvocationLimits,
  validateTaskModelFeasibility,
} from "@/lib/calculation/invocation-feasibility";
import type {
  LegacyTaskAnalysis,
  PlanningSettings,
  TaskAnalysis,
  TaskInput,
} from "@/types/domain";

const largeTask: TaskInput = {
  id: "large-task",
  name: "Large generation",
  description: "A single large prompt and response.",
  priority: "high",
  deadlineDate: null,
  failureImpact: "medium",
};

const largeAnalysis: TaskAnalysis = {
  taskId: largeTask.id,
  taskType: "writing",
  complexity: "medium",
  reasoningDepth: "moderate",
  expectedIterations: 1,
  estimatedInputSize: "xl",
  estimatedOutputSize: "xl",
  uncertainty: "medium",
  recommendedModelTier: "economy",
  workMode: "interactive",
  requiredQualityTier: "economy",
  requiredCapabilities: [],
  upgradeConditions: [],
  failureRisk: "medium",
  riskFactors: [],
  rationale: "Limit regression fixture",
};

const settings: PlanningSettings = {
  budgetUsd: 5,
  deadlineDays: 7,
  strategy: "balanced",
};

function toLegacyAnalysis(analysis: TaskAnalysis): LegacyTaskAnalysis {
  return {
    taskId: analysis.taskId,
    taskType: analysis.taskType,
    complexity: analysis.complexity,
    reasoningDepth: analysis.reasoningDepth,
    expectedIterations: analysis.expectedIterations,
    estimatedInputSize: analysis.estimatedInputSize,
    estimatedOutputSize: analysis.estimatedOutputSize,
    uncertainty: analysis.uncertainty,
    recommendedModelTier: analysis.recommendedModelTier,
    riskFactors: analysis.riskFactors,
    rationale: analysis.rationale,
  };
}

describe("validateInvocationFeasibility", () => {
  it("returns structured input, output, and combined-limit failures", () => {
    const model = {
      ...PROVIDER_CATALOG.google.models.economy,
      limits: {
        ...PROVIDER_CATALOG.google.models.economy.limits,
        maxInputTokens: 100,
        maxOutputTokens: 50,
        maxCombinedTokens: 120,
      },
    };

    expect(validateInvocationFeasibility(model, { inputTokens: 100, outputTokens: 20 })).toEqual({
      feasible: true,
      tokenScenario: { inputTokens: 100, outputTokens: 20 },
      failures: [],
    });
    expect(validateInvocationFeasibility(model, { inputTokens: 101, outputTokens: 51 })).toEqual({
      feasible: false,
      tokenScenario: { inputTokens: 101, outputTokens: 51 },
      failures: [
        { code: "input-limit-exceeded", actualTokens: 101, limitTokens: 100 },
        { code: "output-limit-exceeded", actualTokens: 51, limitTokens: 50 },
        { code: "context-limit-exceeded", actualTokens: 152, limitTokens: 120 },
      ],
    });
    expect(
      validateInvocationLimits(model.limits, { inputTokens: 101, outputTokens: 51 }),
    ).toEqual(
      validateInvocationFeasibility(model, { inputTokens: 101, outputTokens: 51 }),
    );
  });

  it("validates per invocation rather than multiplying limits by iteration count", () => {
    const repeated = {
      ...largeAnalysis,
      expectedIterations: 5,
      estimatedInputSize: "m" as const,
      estimatedOutputSize: "m" as const,
    };

    expect(
      validateTaskModelFeasibility(PROVIDER_CATALOG.anthropic.models.economy, repeated)
        .feasible,
    ).toBe(true);
  });
});

describe("limit-aware provider allocation", () => {
  it("does not treat the reviewer's Haiku $0.512 reproduction as executable", () => {
    const planning = compareProviderPlans(
      [largeTask],
      [largeAnalysis],
      { ...settings, budgetUsd: 0.512 },
    );
    const plan = planning.plans.anthropic;
    const task = plan.tasks[0];

    expect(task.status).toBe("held");
    expect(task.minimumExpectedCostUsd).toBe(1.024);
    expect(task.offeringFailures).toHaveLength(1);
    expect(task.offeringFailures[0].modelId).toBe("claude-haiku-4-5");
    expect(task.offeringFailures[0].scenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scenario: "expected",
          failures: [
            {
              code: "context-limit-exceeded",
              actualTokens: 256_000,
              limitTokens: 200_000,
            },
          ],
        }),
      ]),
    );
    expect(plan.activeTaskCount).toBe(0);
    expect(plan.heldTaskCount).toBe(1);
    expect(plan.infeasibleTaskCount).toBe(0);
    expect(planning.comparisons[1].allTasksActiveWithinBudget).toBe(false);
  });

  it("reassigns to a compatible higher tier and recalculates its cost", () => {
    const planning = compareProviderPlans(
      [largeTask],
      [largeAnalysis],
      { ...settings, budgetUsd: 1.024 },
    );
    const task = planning.plans.anthropic.tasks[0];

    expect(task).toMatchObject({
      status: "active",
      assignedTier: "balanced",
      modelId: "claude-sonnet-5",
      minimumExpectedCostUsd: 1.024,
      wasReassignedForLimits: true,
    });
    expect(task.status === "active" ? task.cost.expected.costUsd : null).toBe(1.024);
    expect(task.offeringFailures).toHaveLength(1);
    expect(task.offeringFailures[0].modelId).toBe("claude-haiku-4-5");
    expect(planning.plans.anthropic.limitReassignedTaskCount).toBe(1);
    expect(planning.comparisons[1].allTasksActiveWithinBudget).toBe(true);
  });

  it("marks Gemini XL output infeasible instead of exposing a normal High cost", () => {
    const planning = compareProviderPlans([largeTask], [largeAnalysis], settings);
    const plan = planning.plans.google;
    const task = plan.tasks[0];

    expect(task).toMatchObject({
      status: "infeasible",
      assignedTier: null,
      modelId: null,
      cost: null,
      minimumExpectedCostUsd: null,
      infeasibleReason: "no-compatible-offering",
    });
    expect(task.status === "infeasible" ? task.offeringFailures : []).toHaveLength(3);
    expect(
      task.status === "infeasible"
        ? task.offeringFailures.every((offering) =>
            offering.scenarios.some((scenario) =>
              scenario.failures.some(
                (failure) =>
                  failure.code === "output-limit-exceeded" &&
                  failure.actualTokens === 96_000 &&
                  failure.limitTokens === 65_536,
              ),
            ),
          )
        : false,
    ).toBe(true);
    expect(plan.totals.highUsd).toBe(0);
    expect(plan.infeasibleTaskCount).toBe(1);
    expect(plan.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("최소 품질과 호출 한도"),
      ]),
    );
    expect(planning.comparisons[2].allTasksActiveWithinBudget).toBe(false);
  });

  it("keeps legacy invocation-only infeasibility separate from the v2 quality floor", () => {
    const plan = compareProviderPlans(
      [largeTask],
      [toLegacyAnalysis(largeAnalysis)],
      settings,
    ).plans.google;

    expect(plan.tasks[0]).toMatchObject({
      status: "infeasible",
      infeasibleReason: "no-compatible-offering",
    });
    expect(plan.warnings.join(" ")).toContain("기존 분석 작업");
    expect(plan.warnings.join(" ")).toContain("호출 한도");
    expect(plan.warnings.join(" ")).not.toContain("최소 품질");
  });

  it("keeps model infeasibility distinct from a budget hold", () => {
    const budgetTask: TaskInput = {
      ...largeTask,
      id: "budget-task",
      name: "Budget-constrained task",
      priority: "low",
    };
    const budgetAnalysis: TaskAnalysis = {
      ...largeAnalysis,
      taskId: budgetTask.id,
      expectedIterations: 2,
      estimatedInputSize: "m",
      estimatedOutputSize: "m",
    };
    const plan = compareProviderPlans(
      [budgetTask, largeTask],
      [budgetAnalysis, largeAnalysis],
      { ...settings, budgetUsd: 0.01 },
    ).plans.google;

    expect(plan.tasks.map((task) => task.status)).toEqual(["held", "infeasible"]);
    expect(plan.heldTaskCount).toBe(1);
    expect(plan.infeasibleTaskCount).toBe(1);
    expect(plan.tasks[0]).toMatchObject({ holdReason: "insufficient-budget" });
    expect(plan.tasks[1]).toMatchObject({ infeasibleReason: "no-compatible-offering" });
  });
});

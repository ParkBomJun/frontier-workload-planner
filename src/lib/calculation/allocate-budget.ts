import { MODEL_PRICING } from "@/config/model-pricing";
import type {
  BudgetAllocationPlan,
  Complexity,
  CostTotals,
  ModelTier,
  PlannedTask,
  PlanningSettings,
  ReasoningDepth,
  TaskAnalysis,
  TaskInput,
  TaskPriority,
  Uncertainty,
} from "@/types/domain";

import { estimateTaskCost, fromMicroUsd, toMicroUsd } from "./estimate-cost";

const TIER_ORDER: ModelTier[] = ["economy", "balanced", "frontier"];
const COMPLEXITY_ORDER: Record<Complexity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  "very-high": 3,
};
const REASONING_ORDER: Record<ReasoningDepth, number> = {
  light: 0,
  moderate: 1,
  deep: 2,
};
const UNCERTAINTY_ORDER: Record<Uncertainty, number> = {
  low: 0,
  medium: 1,
  high: 2,
};
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

interface WorkingTask {
  index: number;
  task: TaskInput;
  analysis: TaskAnalysis;
  strategyTargetTier: ModelTier;
  assignedTier: ModelTier;
  status: "active" | "held";
}

function shiftTier(tier: ModelTier, offset: -1 | 0 | 1): ModelTier {
  const current = TIER_ORDER.indexOf(tier);
  const next = Math.max(0, Math.min(TIER_ORDER.length - 1, current + offset));
  return TIER_ORDER[next];
}

export function strategyTargetTier(
  recommendedTier: ModelTier,
  strategy: PlanningSettings["strategy"],
): ModelTier {
  if (strategy === "cost-saver") return shiftTier(recommendedTier, -1);
  if (strategy === "quality-first") return shiftTier(recommendedTier, 1);
  return recommendedTier;
}

function lowerTier(tier: ModelTier): ModelTier {
  return shiftTier(tier, -1);
}

function toPlannedTask(item: WorkingTask): PlannedTask {
  const minimumExpectedCostUsd = estimateTaskCost(item.analysis, "economy").expected.costUsd;
  if (item.status === "held") {
    return {
      taskId: item.task.id,
      taskName: item.task.name,
      priority: item.task.priority,
      analysis: item.analysis,
      strategyTargetTier: item.strategyTargetTier,
      minimumExpectedCostUsd,
      status: "held",
      assignedTier: null,
      modelId: null,
      cost: null,
      wasDowngradedForBudget: false,
      holdReason: "insufficient-budget",
    };
  }

  return {
    taskId: item.task.id,
    taskName: item.task.name,
    priority: item.task.priority,
    analysis: item.analysis,
    strategyTargetTier: item.strategyTargetTier,
    minimumExpectedCostUsd,
    status: "active",
    assignedTier: item.assignedTier,
    modelId: MODEL_PRICING[item.assignedTier].modelId,
    cost: estimateTaskCost(item.analysis, item.assignedTier),
    wasDowngradedForBudget:
      TIER_ORDER.indexOf(item.assignedTier) < TIER_ORDER.indexOf(item.strategyTargetTier),
  };
}

function sumTotals(tasks: PlannedTask[]): CostTotals {
  const totalsMicroUsd = tasks.reduce(
    (totals, task) =>
      task.status === "held"
        ? totals
        : {
            low: totals.low + toMicroUsd(task.cost.low.costUsd),
            expected: totals.expected + toMicroUsd(task.cost.expected.costUsd),
            high: totals.high + toMicroUsd(task.cost.high.costUsd),
          },
    { low: 0, expected: 0, high: 0 },
  );

  return {
    lowUsd: fromMicroUsd(totalsMicroUsd.low),
    expectedUsd: fromMicroUsd(totalsMicroUsd.expected),
    highUsd: fromMicroUsd(totalsMicroUsd.high),
  };
}

function compareForBudgetRelief(a: WorkingTask, b: WorkingTask): number {
  const priorityDifference = PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority];
  if (priorityDifference !== 0) return priorityDifference;

  const tierDifference =
    TIER_ORDER.indexOf(a.analysis.recommendedModelTier) -
    TIER_ORDER.indexOf(b.analysis.recommendedModelTier);
  if (tierDifference !== 0) return tierDifference;

  const reasoningDifference =
    REASONING_ORDER[a.analysis.reasoningDepth] - REASONING_ORDER[b.analysis.reasoningDepth];
  if (reasoningDifference !== 0) return reasoningDifference;

  const complexityDifference =
    COMPLEXITY_ORDER[a.analysis.complexity] - COMPLEXITY_ORDER[b.analysis.complexity];
  if (complexityDifference !== 0) return complexityDifference;

  const uncertaintyDifference =
    UNCERTAINTY_ORDER[a.analysis.uncertainty] - UNCERTAINTY_ORDER[b.analysis.uncertainty];
  if (uncertaintyDifference !== 0) return uncertaintyDifference;

  // Complete ties are deterministic: earlier input tasks are downgraded first.
  return a.index - b.index;
}

function expectedTotalMicroUsd(working: WorkingTask[]): number {
  return working.reduce(
    (total, item) =>
      item.status === "held"
        ? total
        : total + toMicroUsd(estimateTaskCost(item.analysis, item.assignedTier).expected.costUsd),
    0,
  );
}

function activeMinimumExpectedTotalMicroUsd(working: WorkingTask[]): number {
  return working.reduce(
    (total, item) =>
      item.status === "held"
        ? total
        : total + toMicroUsd(estimateTaskCost(item.analysis, "economy").expected.costUsd),
    0,
  );
}

function resetActiveTiers(working: WorkingTask[]): void {
  working.forEach((item) => {
    if (item.status === "active") item.assignedTier = item.strategyTargetTier;
  });
}

function assertInputs(tasks: TaskInput[], analyses: TaskAnalysis[], settings: PlanningSettings): void {
  if (!Number.isFinite(settings.budgetUsd) || settings.budgetUsd < 0.01 || settings.budgetUsd > 10_000) {
    throw new Error("Budget must be at least 0.01 and at most 10,000 USD.");
  }
  if (!Number.isInteger(settings.deadlineDays) || settings.deadlineDays < 1 || settings.deadlineDays > 90) {
    throw new Error("Deadline days must be an integer from 1 through 90.");
  }
  if (tasks.length !== analyses.length || tasks.length === 0) {
    throw new Error("Tasks and analyses must have the same non-zero length.");
  }

  const taskIds = new Set(tasks.map((task) => task.id));
  const analysisIds = new Set(analyses.map((analysis) => analysis.taskId));
  if (
    taskIds.size !== tasks.length ||
    analysisIds.size !== analyses.length ||
    tasks.some((task) => !analysisIds.has(task.id))
  ) {
    throw new Error("Every task must have exactly one matching analysis.");
  }
}

export function allocateBudget(
  tasks: TaskInput[],
  analyses: TaskAnalysis[],
  settings: PlanningSettings,
): BudgetAllocationPlan {
  assertInputs(tasks, analyses, settings);
  const analysisById = new Map(analyses.map((analysis) => [analysis.taskId, analysis]));
  const budgetMicroUsd = toMicroUsd(settings.budgetUsd);
  const working: WorkingTask[] = tasks.map((task, index) => {
    const analysis = analysisById.get(task.id);
    if (!analysis) throw new Error(`Missing analysis for task ${task.id}.`);
    const target = strategyTargetTier(analysis.recommendedModelTier, settings.strategy);
    return {
      index,
      task,
      analysis,
      strategyTargetTier: target,
      assignedTier: target,
      status: "active",
    };
  });

  const minimumExpectedCostUsd = fromMicroUsd(activeMinimumExpectedTotalMicroUsd(working));

  while (true) {
    resetActiveTiers(working);

    while (expectedTotalMicroUsd(working) > budgetMicroUsd) {
      const candidate = working
        .filter((item) => item.status === "active" && item.assignedTier !== "economy")
        .sort(compareForBudgetRelief)[0];
      if (!candidate) break;
      candidate.assignedTier = lowerTier(candidate.assignedTier);
    }

    if (expectedTotalMicroUsd(working) <= budgetMicroUsd) break;

    const holdCandidate = working
      .filter((item) => item.status === "active")
      .sort(compareForBudgetRelief)[0];
    if (!holdCandidate) break;
    holdCandidate.status = "held";
  }

  const plannedTasks = working.map(toPlannedTask);
  const totals = sumTotals(plannedTasks);
  const expectedWithinBudget = toMicroUsd(totals.expectedUsd) <= budgetMicroUsd;
  const highExceedsBudget = toMicroUsd(totals.highUsd) > budgetMicroUsd;
  const activeTaskCount = plannedTasks.filter((task) => task.status === "active").length;
  const heldTaskCount = plannedTasks.length - activeTaskCount;
  const downgradedTaskCount = plannedTasks.filter((task) => task.wasDowngradedForBudget).length;
  const warnings: string[] = [];

  if (!expectedWithinBudget) {
    warnings.push("실행 작업의 Expected 비용을 예산 안으로 조정하지 못했습니다.");
  }
  if (heldTaskCount > 0) {
    warnings.push(
      `${heldTaskCount}개 작업을 예산 부족으로 보류했습니다. 보류 작업 비용은 합계에서 제외됩니다.`,
    );
  }
  if (downgradedTaskCount > 0) {
    warnings.push(`${downgradedTaskCount}개 작업의 등급을 예산에 맞춰 낮췄습니다.`);
  }
  if (highExceedsBudget) {
    warnings.push("High 시나리오 비용이 예산을 초과합니다.");
  }
  if (settings.deadlineDays === 1) {
    warnings.push("1일 기한은 참고 정보이며 이 MVP는 정교한 시간 예측을 제공하지 않습니다.");
  }

  return {
    settings,
    tasks: plannedTasks,
    totals,
    minimumExpectedCostUsd,
    remainingBudgetUsd: fromMicroUsd(budgetMicroUsd - toMicroUsd(totals.expectedUsd)),
    expectedWithinBudget,
    highExceedsBudget,
    activeTaskCount,
    heldTaskCount,
    downgradedTaskCount,
    warnings,
  };
}

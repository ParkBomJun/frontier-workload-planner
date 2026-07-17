import { PROVIDER_CATALOG } from "@/config/provider-catalog";
import type {
  BudgetAllocationPlan,
  Complexity,
  CostTotals,
  ModelTier,
  OfferingFeasibilityFailure,
  PlannedTask,
  PlanningSettings,
  PlannerTaskAnalysis,
  ProviderId,
  ReasoningDepth,
  TaskInput,
  TaskPriority,
  Uncertainty,
} from "@/types/domain";

import {
  clampTierToAnalysisMinimum,
  minimumLegacyTierForAnalysis,
} from "@/lib/planning/workload-requirements";

import { estimateTaskCost, fromMicroUsd, toMicroUsd } from "./estimate-cost";
import { validateTaskModelFeasibility } from "./invocation-feasibility";

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
  analysis: PlannerTaskAnalysis;
  strategyTargetTier: ModelTier;
  compatibleTiers: ModelTier[];
  initialTier: ModelTier | null;
  assignedTier: ModelTier | null;
  status: "active" | "held" | "infeasible";
  offeringFailures: OfferingFeasibilityFailure[];
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

function initialCompatibleTier(
  strategyTarget: ModelTier,
  compatibleTiers: ModelTier[],
): ModelTier | null {
  const targetIndex = TIER_ORDER.indexOf(strategyTarget);
  return (
    TIER_ORDER.slice(targetIndex).find((tier) => compatibleTiers.includes(tier)) ??
    [...TIER_ORDER]
      .slice(0, targetIndex)
      .reverse()
      .find((tier) => compatibleTiers.includes(tier)) ??
    null
  );
}

function lowerCompatibleTier(item: WorkingTask): ModelTier | null {
  if (item.assignedTier === null) return null;
  const currentIndex = TIER_ORDER.indexOf(item.assignedTier);
  return (
    [...TIER_ORDER]
      .slice(0, currentIndex)
      .reverse()
      .find((tier) => item.compatibleTiers.includes(tier)) ?? null
  );
}

function minimumCompatibleExpectedCostUsd(
  item: WorkingTask,
  providerId: ProviderId,
): number | null {
  if (item.compatibleTiers.length === 0) return null;
  return Math.min(
    ...item.compatibleTiers.map(
      (tier) => estimateTaskCost(item.analysis, tier, providerId).expected.costUsd,
    ),
  );
}

function toPlannedTask(item: WorkingTask, providerId: ProviderId): PlannedTask {
  const minimumExpectedCostUsd = minimumCompatibleExpectedCostUsd(item, providerId);
  if (item.status === "infeasible") {
    return {
      taskId: item.task.id,
      taskName: item.task.name,
      priority: item.task.priority,
      analysis: item.analysis,
      strategyTargetTier: item.strategyTargetTier,
      offeringFailures: item.offeringFailures,
      minimumExpectedCostUsd: null,
      status: "infeasible",
      assignedTier: null,
      modelId: null,
      cost: null,
      wasDowngradedForBudget: false,
      wasReassignedForLimits: false,
      infeasibleReason: "no-compatible-offering",
    };
  }
  if (minimumExpectedCostUsd === null) {
    throw new Error("A feasible task must have at least one compatible offering.");
  }
  if (item.status === "held") {
    return {
      taskId: item.task.id,
      taskName: item.task.name,
      priority: item.task.priority,
      analysis: item.analysis,
      strategyTargetTier: item.strategyTargetTier,
      offeringFailures: item.offeringFailures,
      minimumExpectedCostUsd,
      status: "held",
      assignedTier: null,
      modelId: null,
      cost: null,
      wasDowngradedForBudget: false,
      wasReassignedForLimits: false,
      holdReason: "insufficient-budget",
    };
  }

  if (item.assignedTier === null) {
    throw new Error("An active task must have an assigned compatible tier.");
  }

  return {
    taskId: item.task.id,
    taskName: item.task.name,
    priority: item.task.priority,
    analysis: item.analysis,
    strategyTargetTier: item.strategyTargetTier,
    offeringFailures: item.offeringFailures,
    minimumExpectedCostUsd,
    status: "active",
    assignedTier: item.assignedTier,
    modelId: PROVIDER_CATALOG[providerId].models[item.assignedTier].catalogId,
    cost: estimateTaskCost(item.analysis, item.assignedTier, providerId),
    wasDowngradedForBudget:
      TIER_ORDER.indexOf(item.assignedTier) < TIER_ORDER.indexOf(item.strategyTargetTier),
    wasReassignedForLimits: item.initialTier !== item.strategyTargetTier,
  };
}

function sumTotals(tasks: PlannedTask[]): CostTotals {
  const totalsMicroUsd = tasks.reduce(
    (totals, task) =>
      task.status !== "active"
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

function expectedTotalMicroUsd(working: WorkingTask[], providerId: ProviderId): number {
  return working.reduce(
    (total, item) => {
      if (item.status !== "active") return total;
      if (item.assignedTier === null) {
        throw new Error("An active task must have an assigned compatible tier.");
      }
      return (
        total +
        toMicroUsd(
          estimateTaskCost(item.analysis, item.assignedTier, providerId).expected.costUsd,
        )
      );
    },
    0,
  );
}

function minimumCompatibleExpectedTotalMicroUsd(
  working: WorkingTask[],
  providerId: ProviderId,
): number {
  return working.reduce(
    (total, item) => {
      if (item.status === "infeasible") return total;
      const minimum = minimumCompatibleExpectedCostUsd(item, providerId);
      if (minimum === null) return total;
      return total + toMicroUsd(minimum);
    },
    0,
  );
}

function resetActiveTiers(working: WorkingTask[]): void {
  working.forEach((item) => {
    if (item.status === "active") item.assignedTier = item.initialTier;
  });
}

function assertInputs(
  tasks: TaskInput[],
  analyses: PlannerTaskAnalysis[],
  settings: PlanningSettings,
): void {
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
  analyses: PlannerTaskAnalysis[],
  settings: PlanningSettings,
  providerId: ProviderId = "openai",
): BudgetAllocationPlan {
  assertInputs(tasks, analyses, settings);
  if (!Object.hasOwn(PROVIDER_CATALOG, providerId)) {
    throw new Error("Provider must be one of the supported catalog providers.");
  }
  const analysisById = new Map(analyses.map((analysis) => [analysis.taskId, analysis]));
  const budgetMicroUsd = toMicroUsd(settings.budgetUsd);
  const working: WorkingTask[] = tasks.map((task, index) => {
    const analysis = analysisById.get(task.id);
    if (!analysis) throw new Error(`Missing analysis for task ${task.id}.`);
    const target = clampTierToAnalysisMinimum(
      strategyTargetTier(analysis.recommendedModelTier, settings.strategy),
      analysis,
    );
    const minimumTier = minimumLegacyTierForAnalysis(analysis);
    const minimumTierIndex = minimumTier === null ? 0 : TIER_ORDER.indexOf(minimumTier);
    const offeringResults = TIER_ORDER.map((tier) => {
      const model = PROVIDER_CATALOG[providerId].models[tier];
      const result = validateTaskModelFeasibility(model, analysis);
      return { tier, model, result };
    });
    const compatibleTiers = offeringResults
      .filter(
        ({ tier, result }) => result.feasible && TIER_ORDER.indexOf(tier) >= minimumTierIndex,
      )
      .map(({ tier }) => tier);
    const initialTier = initialCompatibleTier(target, compatibleTiers);
    const offeringFailures = offeringResults
      .filter(({ result }) => !result.feasible)
      .map(({ tier, model, result }) => ({
        tier,
        modelId: model.catalogId,
        scenarios: result.scenarios.filter((scenario) => !scenario.feasible),
      }));
    return {
      index,
      task,
      analysis,
      strategyTargetTier: target,
      compatibleTiers,
      initialTier,
      assignedTier: initialTier,
      status: initialTier === null ? "infeasible" : "active",
      offeringFailures,
    };
  });

  const minimumExpectedCostUsd = working.some((item) => item.status === "infeasible")
    ? null
    : fromMicroUsd(minimumCompatibleExpectedTotalMicroUsd(working, providerId));

  while (true) {
    resetActiveTiers(working);

    while (expectedTotalMicroUsd(working, providerId) > budgetMicroUsd) {
      const candidate = working
        .filter((item) => item.status === "active" && lowerCompatibleTier(item) !== null)
        .sort(compareForBudgetRelief)[0];
      if (!candidate) break;
      candidate.assignedTier = lowerCompatibleTier(candidate);
    }

    if (expectedTotalMicroUsd(working, providerId) <= budgetMicroUsd) break;

    const holdCandidate = working
      .filter((item) => item.status === "active")
      .sort(compareForBudgetRelief)[0];
    if (!holdCandidate) break;
    holdCandidate.status = "held";
  }

  const plannedTasks = working.map((item) => toPlannedTask(item, providerId));
  const totals = sumTotals(plannedTasks);
  const expectedWithinBudget = toMicroUsd(totals.expectedUsd) <= budgetMicroUsd;
  const highExceedsBudget = toMicroUsd(totals.highUsd) > budgetMicroUsd;
  const activeTaskCount = plannedTasks.filter((task) => task.status === "active").length;
  const heldTaskCount = plannedTasks.filter((task) => task.status === "held").length;
  const infeasibleTaskCount = plannedTasks.filter(
    (task) => task.status === "infeasible",
  ).length;
  const downgradedTaskCount = plannedTasks.filter((task) => task.wasDowngradedForBudget).length;
  const limitReassignedTaskCount = plannedTasks.filter(
    (task) => task.status === "active" && task.wasReassignedForLimits,
  ).length;
  const warnings: string[] = [];

  if (!expectedWithinBudget) {
    warnings.push("실행 작업의 Expected 비용을 예산 안으로 조정하지 못했습니다.");
  }
  if (heldTaskCount > 0) {
    warnings.push(
      `${heldTaskCount}개 작업을 예산 부족으로 보류했습니다. 보류 작업 비용은 합계에서 제외됩니다.`,
    );
  }
  if (infeasibleTaskCount > 0) {
    warnings.push(
      `${infeasibleTaskCount}개 작업은 최소 품질과 호출 한도를 함께 만족하는 모델이 없어 실행 불가로 표시했습니다.`,
    );
  }
  if (limitReassignedTaskCount > 0) {
    warnings.push(
      `${limitReassignedTaskCount}개 작업을 호출 한도와 호환되는 tier로 재배정했습니다.`,
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
    providerId,
    settings,
    tasks: plannedTasks,
    totals,
    minimumExpectedCostUsd,
    remainingBudgetUsd: fromMicroUsd(budgetMicroUsd - toMicroUsd(totals.expectedUsd)),
    expectedWithinBudget,
    highExceedsBudget,
    activeTaskCount,
    heldTaskCount,
    infeasibleTaskCount,
    downgradedTaskCount,
    limitReassignedTaskCount,
    warnings,
  };
}

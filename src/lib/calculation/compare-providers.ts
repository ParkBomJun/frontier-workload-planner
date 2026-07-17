import {
  PROVIDER_IDS,
  type BudgetAllocationPlan,
  type PlanningSettings,
  type ProviderComparisonSummary,
  type ProviderId,
  type TaskAnalysis,
  type TaskInput,
} from "@/types/domain";

import { allocateBudget } from "./allocate-budget";

export interface ProviderPlanningResult {
  plans: Record<ProviderId, BudgetAllocationPlan>;
  comparisons: ProviderComparisonSummary[];
}

export function compareProviderPlans(
  tasks: TaskInput[],
  analyses: TaskAnalysis[],
  settings: PlanningSettings,
): ProviderPlanningResult {
  const plans = Object.fromEntries(
    PROVIDER_IDS.map((providerId) => [
      providerId,
      allocateBudget(tasks, analyses, settings, providerId),
    ]),
  ) as Record<ProviderId, BudgetAllocationPlan>;

  const comparisons = PROVIDER_IDS.map((providerId) => {
    const plan = plans[providerId];
    return {
      providerId,
      totals: plan.totals,
      expectedWithinBudget: plan.expectedWithinBudget,
      allTasksActiveWithinBudget:
        plan.expectedWithinBudget &&
        plan.heldTaskCount === 0 &&
        plan.infeasibleTaskCount === 0,
      highExceedsBudget: plan.highExceedsBudget,
      activeTaskCount: plan.activeTaskCount,
      heldTaskCount: plan.heldTaskCount,
      infeasibleTaskCount: plan.infeasibleTaskCount,
      downgradedTaskCount: plan.downgradedTaskCount,
      limitReassignedTaskCount: plan.limitReassignedTaskCount,
    } satisfies ProviderComparisonSummary;
  });

  return { plans, comparisons };
}

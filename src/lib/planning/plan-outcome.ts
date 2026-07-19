import type { BestFitAllocationPlan } from "@/types/best-fit";

/**
 * Captures the user-visible recommendation outcome while deliberately excluding
 * calculation timestamps, the selected strategy, and the available budget.
 * Those inputs can change without changing the routes or costs shown to users.
 */
export function bestFitPlanOutcomeFingerprint(
  plan: BestFitAllocationPlan,
): string {
  return JSON.stringify({
    tasks: plan.tasks.map((task) => {
      const shared = {
        status: task.status,
        taskId: task.taskId,
        originalIndex: task.originalIndex,
        appliedUpgradeTriggers: task.appliedUpgradeTriggers,
        conditionalAlternatives: task.conditionalAlternatives,
      };
      if (task.status === "active") {
        return {
          ...shared,
          routeIdentity: task.routeIdentity,
          modelId: task.modelId,
          routeKind: task.routeKind,
          qualityTier: task.qualityTier,
          variableCashMicroUsd: task.variableCashMicroUsd,
          whyEnough: task.whyEnough,
          whyNotPremium: task.whyNotPremium,
          alternativeRouteIdentity: task.alternativeRouteIdentity,
        };
      }
      return task.status === "held"
        ? { ...shared, holdReason: task.holdReason }
        : { ...shared, infeasibleReason: task.infeasibleReason };
    }),
    reservationOrderTaskIds: plan.reservationOrderTaskIds,
    reliefOrderTaskIds: plan.reliefOrderTaskIds,
    activatedSubscriptionRoutes: plan.activatedSubscriptionRoutes,
    subscriptionUsageLedgers: plan.subscriptionUsageLedgers,
    cash: plan.cash,
    expectedWithinBudget: plan.expectedWithinBudget,
    highExceedsBudget: plan.highExceedsBudget,
    activeTaskCount: plan.activeTaskCount,
    heldTaskCount: plan.heldTaskCount,
    infeasibleTaskCount: plan.infeasibleTaskCount,
    spendComparison: plan.spendComparison,
  });
}

export type PlanOutcomeChange = "created" | "changed" | "unchanged";

export function compareBestFitPlanOutcome(
  previousFingerprint: string | null,
  nextFingerprint: string,
): PlanOutcomeChange {
  if (previousFingerprint === null) return "created";
  return previousFingerprint === nextFingerprint ? "unchanged" : "changed";
}

export type PlanUpdateFeedbackAction =
  | "none"
  | "awaiting-budget-confirmation"
  | "recalculate";

export type PlanUpdateFeedbackEvent =
  | {
      kind: "settings-edited";
      hasCompletedAnalysis: boolean;
      hasValidPlanningSettings: boolean;
      relevantSettingsChanged: boolean;
      budgetConfirmed: boolean;
    }
  | {
      kind: "budget-confirmed";
      hasCompletedAnalysis: boolean;
    };

export function resolvePlanUpdateFeedbackAction(
  event: PlanUpdateFeedbackEvent,
): PlanUpdateFeedbackAction {
  if (!event.hasCompletedAnalysis) return "none";
  if (event.kind === "budget-confirmed") return "recalculate";
  if (!event.hasValidPlanningSettings || !event.relevantSettingsChanged) {
    return "none";
  }
  return event.budgetConfirmed
    ? "recalculate"
    : "awaiting-budget-confirmation";
}

export const PLAN_UPDATE_FEEDBACK_DISMISS_MS = 6_000;

export function planUpdateFeedbackDismissDelay(
  pending: boolean,
): number | null {
  return pending ? null : PLAN_UPDATE_FEEDBACK_DISMISS_MS;
}

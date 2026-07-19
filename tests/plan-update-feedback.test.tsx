import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlanUpdateFeedback } from "@/components/plan-update-feedback";
import { UI_COPY } from "@/lib/i18n/ui-copy";
import { compareBestFitPlanOutcome } from "@/lib/planning/plan-outcome";
import {
  PLAN_UPDATE_FEEDBACK_DISMISS_MS,
  planUpdateFeedbackDismissDelay,
  resolvePlanUpdateFeedbackAction,
} from "@/lib/planning/plan-update-feedback";

describe("Plan update feedback", () => {
  it("shows budget confirmation as a visible pending status", () => {
    const message = UI_COPY.ko.page.allocationBudgetPendingNotice(0.5);
    const markup = renderToStaticMarkup(
      createElement(PlanUpdateFeedback, {
        message,
        pending: true,
        dismissLabel: UI_COPY.ko.page.allocationDismiss,
        onDismiss: () => undefined,
      }),
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-atomic="true"');
    expect(markup).toContain('data-plan-update-feedback="pending"');
    expect(markup).toContain(message);
    expect(markup).toContain(`aria-label="${UI_COPY.ko.page.allocationDismiss}"`);
    expect(markup).not.toContain("sr-only");
  });

  it("shows a completed recalculation as a visible animated status", () => {
    const message = `${UI_COPY.ko.page.allocationSettingsNotice(
      10,
      UI_COPY.ko.enums.strategy.balanced,
    )} ${UI_COPY.ko.page.allocationResultUnchanged}`;
    const markup = renderToStaticMarkup(
      createElement(PlanUpdateFeedback, {
        message,
        pending: false,
        dismissLabel: UI_COPY.ko.page.allocationDismiss,
        onDismiss: () => undefined,
      }),
    );

    expect(markup).toContain('data-plan-update-feedback="complete"');
    expect(markup).toContain("plan-update-feedback");
    expect(markup).toContain("이전 결과와 같습니다");
  });

  it("distinguishes the first result, a changed result, and an unchanged result", () => {
    expect(compareBestFitPlanOutcome(null, "first")).toBe("created");
    expect(compareBestFitPlanOutcome("first", "second")).toBe("changed");
    expect(compareBestFitPlanOutcome("same", "same")).toBe("unchanged");
  });

  it("moves a budget edit through confirmation before recalculation", () => {
    expect(
      resolvePlanUpdateFeedbackAction({
        kind: "settings-edited",
        hasCompletedAnalysis: true,
        hasValidPlanningSettings: true,
        relevantSettingsChanged: true,
        budgetConfirmed: false,
      }),
    ).toBe("awaiting-budget-confirmation");
    expect(
      resolvePlanUpdateFeedbackAction({
        kind: "budget-confirmed",
        hasCompletedAnalysis: true,
      }),
    ).toBe("recalculate");
  });

  it("recalculates every confirmed strategy change but ignores unrelated edits", () => {
    const strategyChange = {
      kind: "settings-edited" as const,
      hasCompletedAnalysis: true,
      hasValidPlanningSettings: true,
      relevantSettingsChanged: true,
      budgetConfirmed: true,
    };
    expect(resolvePlanUpdateFeedbackAction(strategyChange)).toBe("recalculate");
    expect(resolvePlanUpdateFeedbackAction(strategyChange)).toBe("recalculate");
    expect(
      resolvePlanUpdateFeedbackAction({
        ...strategyChange,
        relevantSettingsChanged: false,
      }),
    ).toBe("none");
    expect(
      resolvePlanUpdateFeedbackAction({
        ...strategyChange,
        hasCompletedAnalysis: false,
      }),
    ).toBe("none");
  });

  it("keeps pending feedback dismissible and auto-dismisses completed feedback", () => {
    expect(planUpdateFeedbackDismissDelay(true)).toBeNull();
    expect(planUpdateFeedbackDismissDelay(false)).toBe(
      PLAN_UPDATE_FEEDBACK_DISMISS_MS,
    );
  });

  it.each(["ko", "en", "ja"] as const)(
    "provides complete %s feedback copy",
    (locale) => {
      const page = UI_COPY[locale].page;
      expect(page.allocationBudgetPendingNotice(5)).toContain("5");
      expect(page.allocationResultChanged.trim()).not.toBe("");
      expect(page.allocationResultUnchanged.trim()).not.toBe("");
      expect(page.allocationDismiss.trim()).not.toBe("");
    },
  );
});

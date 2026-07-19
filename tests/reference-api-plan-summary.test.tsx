import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const languageState = vi.hoisted(() => ({ locale: "ko" }));

vi.mock("@/components/language-provider", async () => {
  const { UI_COPY, UI_LOCALE_META } = await import("@/lib/i18n/ui-copy");
  return {
    useLanguage: () => {
      const locale = languageState.locale as keyof typeof UI_COPY;
      return {
        locale,
        copy: UI_COPY[locale],
        localeMeta: UI_LOCALE_META[locale],
        setLocale: () => undefined,
      };
    },
  };
});

import { ReferenceApiPlanSummary } from "@/components/reference-api-plan-summary";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import type {
  BudgetAllocationPlan,
  ProviderComparisonSummary,
} from "@/types/domain";
import type { UiLocale } from "@/lib/i18n/ui-copy";

const plan = {
  providerId: "openai",
  settings: { budgetUsd: 5, deadlineDays: 7, strategy: "balanced" },
  tasks: [
    {
      taskId: "task-1",
      taskName: "Customer dashboard",
      status: "active",
      modelId: "gpt-5.6-luna",
      cost: { expected: { costUsd: 1.25 } },
    },
    { taskId: "task-2", taskName: "Research memo", status: "held" },
  ],
  totals: { lowUsd: 0.8, expectedUsd: 1.25, highUsd: 2.1 },
  activeTaskCount: 1,
  heldTaskCount: 1,
  infeasibleTaskCount: 0,
} as unknown as BudgetAllocationPlan;

const comparisons = [
  {
    providerId: "openai",
    totals: plan.totals,
    activeTaskCount: 1,
    heldTaskCount: 1,
    infeasibleTaskCount: 0,
  },
  {
    providerId: "anthropic",
    totals: { lowUsd: 1, expectedUsd: 2, highUsd: 3 },
    activeTaskCount: 2,
    heldTaskCount: 0,
    infeasibleTaskCount: 0,
  },
] as unknown as readonly ProviderComparisonSummary[];

describe("Reference API plan summary", () => {
  it("renders a compact, explicitly non-confirmed summary in every locale", () => {
    for (const locale of ["ko", "en", "ja"] as readonly UiLocale[]) {
      languageState.locale = locale;
      const markup = renderToStaticMarkup(
        createElement(ReferenceApiPlanSummary, {
          plan,
          comparisons,
          selectedProvider: "openai",
          onProviderChange: () => undefined,
          onOpenDetails: () => undefined,
        }),
      );
      const copy = BEST_FIT_UI_COPY[locale].results;

      expect(markup).toContain('id="reference-api-plan"');
      expect(markup).toContain('tabindex="-1"');
      expect(markup).toContain(copy.referenceSummaryTitle);
      expect(markup).toContain(copy.referenceSummaryDescription);
      expect(markup).toContain(copy.referenceOpenDetails);
      expect(markup).toContain(copy.referenceTaskModel);
      expect(markup).toContain(copy.referenceHeldTask);
      expect(markup).toContain(`aria-label="${copy.referenceProviderChoice}"`);
      expect(markup).toContain("sm:hidden");
      expect(markup).toContain("hidden gap-2 sm:grid");
      expect(markup).toContain("gpt-5.6-luna");
      expect(markup).toContain('aria-pressed="true"');
      expect(markup).toContain('aria-pressed="false"');
      expect(markup).toContain("min-h-11");
    }
  });
});

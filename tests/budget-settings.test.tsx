import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BudgetSettings } from "@/components/budget-settings";
import { LanguageProvider } from "@/components/language-provider";
import { UI_COPY } from "@/lib/i18n/ui-copy";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";

describe("Personal-user budget settings", () => {
  it("marks budget and reference period as required and strategy as defaulted", () => {
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(BudgetSettings, {
          value: {
            budgetUsd: "5",
            deadlineDays: "7",
            strategy: "balanced",
          },
          disabled: false,
          showValidation: false,
          incrementalCashBudget: null,
          onChange: () => undefined,
          onConfirmIncrementalCashBudget: () => undefined,
          onRevokeIncrementalCashBudget: () => undefined,
        }),
      ),
    );
    const common = UI_COPY.en.common;
    const budgetLabel = markup.match(
      /<label for="budget-usd"[\s\S]*?<\/label>/,
    )?.[0] ?? "";
    const deadlineLabel = markup.match(
      /<label for="deadline-days"[\s\S]*?<\/label>/,
    )?.[0] ?? "";
    const strategyLabel = markup.match(
      /<label for="planning-strategy"[\s\S]*?<\/label>/,
    )?.[0] ?? "";
    const budgetInput = markup.match(/<input id="budget-usd"[^>]*>/)?.[0] ?? "";
    const deadlineInput = markup.match(/<input id="deadline-days"[^>]*>/)?.[0] ?? "";
    const strategySelect = markup.match(
      /<select id="planning-strategy"[^>]*>/,
    )?.[0] ?? "";

    expect(budgetLabel).toContain(common.required);
    expect(deadlineLabel).toContain(common.required);
    expect(strategyLabel).toContain(common.optional);
    expect(strategyLabel).toContain(common.defaultValue);
    expect(budgetInput).toContain('required=""');
    expect(deadlineInput).toContain('required=""');
    expect(strategySelect).not.toContain("required");
  });

  it("uses one compact strategy dropdown instead of three stacked cards", () => {
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(BudgetSettings, {
          value: {
            budgetUsd: "5",
            deadlineDays: "7",
            strategy: "balanced",
          },
          disabled: false,
          showValidation: false,
          incrementalCashBudget: null,
          onChange: () => undefined,
          onConfirmIncrementalCashBudget: () => undefined,
          onRevokeIncrementalCashBudget: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('id="planning-strategy"');
    expect(markup).toContain(UI_COPY.en.budgetSettings.strategyLegend);
    expect(markup).toContain('option value="balanced" selected=""');
    expect(markup).not.toContain('name="planning-strategy"');
  });

  it("keeps budget confirmation clickable so invalid fields can be explained", () => {
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(BudgetSettings, {
          value: {
            budgetUsd: "",
            deadlineDays: "",
            strategy: "balanced",
          },
          disabled: false,
          showValidation: true,
          incrementalCashBudget: null,
          onChange: () => undefined,
          onConfirmIncrementalCashBudget: () => undefined,
          onRevokeIncrementalCashBudget: () => undefined,
        }),
      ),
    );
    const buttonTag = markup.match(/<button type="button"[^>]*>/)?.[0];

    expect(buttonTag).toBeDefined();
    expect(buttonTag).not.toMatch(/\sdisabled(?:=|\s|>)/);
    expect(markup).toContain(UI_COPY.en.budgetSettings.budgetError);
    expect(markup).toContain(UI_COPY.en.budgetSettings.deadlineError);
    expect(markup).toContain(BEST_FIT_UI_COPY.en.budget.confirm);
  });
});

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

import { BestFitResults } from "@/components/best-fit-results";
import type { BestFitPlanExportContext } from "@/lib/export/best-fit";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import {
  createCustomAccessProviderId,
  registeredAccessProviderId,
} from "@/lib/offerings/route-identity";
import type { BestFitUiPlan } from "@/lib/planning/best-fit-ui-plan";
import { createEmptyBestFitSourceState } from "@/lib/storage/best-fit-sources";
import type { TaskInput } from "@/types/domain";
import type { UiLocale } from "@/lib/i18n/ui-copy";

const subscriptionRoute = {
  providerId: createCustomAccessProviderId("subscription"),
  offeringId: "subscription.custom",
  resourceId: "resource-1",
} as const;

const apiRoute = {
  providerId: registeredAccessProviderId("openai"),
  offeringId: "api.openai.gpt-5.6-luna.standard-text",
  resourceId: null,
} as const;

const tasks: readonly TaskInput[] = [
  {
    id: "subscription-task",
    name: "Subscription task",
    description: "Use an included subscription route.",
    priority: "high",
    deadlineDate: null,
    failureImpact: "medium",
  },
  {
    id: "api-task",
    name: "API task",
    description: "Use a metered API route.",
    priority: "medium",
    deadlineDate: null,
    failureImpact: "low",
  },
];

function resultFixture(): BestFitUiPlan {
  return {
    plan: {
      contractVersion: "best-fit-plan-v1",
      strategy: "balanced",
      planningAsOf: "2026-07-18T12:00:00.000Z",
      pricingAsOf: "2026-07-18",
      incrementalCashBudgetMicroUsd: 10_000_000,
      tasks: [
        {
          status: "active",
          taskId: "subscription-task",
          originalIndex: 0,
          routeIdentity: subscriptionRoute,
          modelId: null,
          routeKind: "owned-paid-overage",
          qualityTier: "balanced",
          strategyTargetTier: "balanced",
          variableCashMicroUsd: { low: 3, expected: 2, high: 4 },
          appliedUpgradeTriggers: [],
          whyEnough: "minimum-quality-met",
          whyNotPremium: "lower-tier-sufficient",
          alternativeRouteIdentity: null,
          conditionalAlternatives: [],
        },
        {
          status: "active",
          taskId: "api-task",
          originalIndex: 1,
          routeIdentity: apiRoute,
          modelId: "gpt-5.6-luna",
          routeKind: "api",
          qualityTier: "economy",
          strategyTargetTier: "economy",
          variableCashMicroUsd: { low: 1, expected: 2, high: 3 },
          appliedUpgradeTriggers: [],
          whyEnough: "minimum-quality-met",
          whyNotPremium: "lower-tier-sufficient",
          alternativeRouteIdentity: null,
          conditionalAlternatives: [],
        },
      ],
      reservationOrderTaskIds: ["subscription-task", "api-task"],
      reliefOrderTaskIds: ["api-task", "subscription-task"],
      activatedSubscriptionRoutes: [],
      subscriptionUsageLedgers: [],
      cash: {
        lowMicroUsd: 4,
        expectedMicroUsd: 4,
        highMicroUsd: 7,
        apiMicroUsd: { low: 1, expected: 2, high: 3 },
        subscriptionFeeMicroUsd: 0,
        paidOverageMicroUsd: { low: 3, expected: 2, high: 4 },
        scenarioOverflow: { low: false, expected: false, high: false },
      },
      expectedWithinBudget: true,
      highExceedsBudget: false,
      activeTaskCount: 2,
      heldTaskCount: 0,
      infeasibleTaskCount: 0,
      premiumBaseline: null,
      spendComparison: null,
      allocationMethod: "deterministic-add-one-subscription-heuristic",
    },
    candidateSets: [
      {
        task: tasks[0],
        analysis: {} as never,
        originalIndex: 0,
        confirmedRoutes: [],
        conditionalAlternatives: [],
        excludedRoutes: [
          {
            routeIdentity: apiRoute,
            status: "ineligible",
            reasonCodes: [
              "surface-incompatible",
              "input-limit-exceeded",
              "output-limit-exceeded",
              "context-limit-exceeded",
              "unrecognized-private-code",
            ],
          },
        ],
      },
      {
        task: tasks[1],
        analysis: {} as never,
        originalIndex: 1,
        confirmedRoutes: [],
        conditionalAlternatives: [],
        excludedRoutes: [],
      },
    ] as unknown as BestFitUiPlan["candidateSets"],
    resourceDiagnostics: [
      {
        uiId: "resource-1",
        displayName: "Owned subscription",
        status: "resolved",
        routeIdentity: subscriptionRoute,
        fieldErrors: {},
        reasonCodes: [],
      },
    ],
  };
}

function rendererProps() {
  const result = resultFixture();
  const generatedAt = "2026-07-18T12:00:00.000Z";
  const exportContext: BestFitPlanExportContext = {
    sourceTasks: tasks,
    uiPlan: result,
    sourceState: createEmptyBestFitSourceState(),
    analysisMode: "mock",
    analysisModel: "mock-fixture-v2",
    generatedAt,
  };
  return {
    result,
    tasks,
    generatedAt,
    exportContext,
    referencePlanAvailable: true,
  };
}

function infeasibleRendererProps() {
  const base = rendererProps();
  const zeroCash = {
    lowMicroUsd: 0,
    expectedMicroUsd: 0,
    highMicroUsd: 0,
    apiMicroUsd: { low: 0, expected: 0, high: 0 },
    subscriptionFeeMicroUsd: 0,
    paidOverageMicroUsd: { low: 0, expected: 0, high: 0 },
    scenarioOverflow: { low: false, expected: false, high: false },
  } as const;
  const infeasibleTasks: BestFitUiPlan["plan"]["tasks"] = tasks.map(
    (task, originalIndex) => ({
      status: "infeasible",
      taskId: task.id,
      originalIndex,
      routeIdentity: null,
      strategyTargetTier: "balanced",
      infeasibleReason: "no-compatible-confirmed-route",
      appliedUpgradeTriggers: [],
      conditionalAlternatives: [],
    }),
  );
  const candidateSets = base.result.candidateSets.map((candidateSet, index) => ({
    ...candidateSet,
    confirmedRoutes: [],
    excludedRoutes: index === 0
      ? [
          {
            routeIdentity: subscriptionRoute,
            status: "conditional" as const,
            reasonCodes: [
              "surface-incompatible",
              "access-limits-incomplete",
              "input-limit-exceeded",
            ] as const,
          },
        ]
      : [
          {
            routeIdentity: apiRoute,
            status: "invalid" as const,
            reasonCodes: [
              "model-capabilities-incomplete",
              "invalid-user-override",
            ] as const,
          },
        ],
  })) as BestFitUiPlan["candidateSets"];
  const result: BestFitUiPlan = {
    ...base.result,
    plan: {
      ...base.result.plan,
      tasks: infeasibleTasks,
      cash: zeroCash,
      activeTaskCount: 0,
      heldTaskCount: 0,
      infeasibleTaskCount: tasks.length,
      expectedWithinBudget: true,
      highExceedsBudget: false,
    },
    candidateSets,
    resourceDiagnostics: [
      {
        uiId: "resource-incomplete",
        displayName: "Incomplete subscription",
        status: "invalid",
        routeIdentity: null,
        fieldErrors: {
          surface: "required",
          "quota.included": "required",
        },
        reasonCodes: [],
      },
    ],
  };
  return {
    ...base,
    result,
    exportContext: { ...base.exportContext, uiPlan: result },
  };
}

describe("Best-fit results renderer", () => {
  it("renders the Best-fit export controls and authority disclosure accessibly in every locale", () => {
    for (const locale of ["ko", "en", "ja"] as readonly UiLocale[]) {
      languageState.locale = locale;
      const markup = renderToStaticMarkup(
        createElement(BestFitResults, {
          ...rendererProps(),
        }),
      );
      const bestFitCopy = BEST_FIT_UI_COPY[locale];

      expect(markup).toContain(bestFitCopy.results.exportDisclosure);
      expect(markup).toContain(bestFitCopy.results.apiSetupTitle);
      expect(markup).toContain(bestFitCopy.results.premiumChoice);
      expect(markup).toContain(
        bestFitCopy.enums.whyNotPremium["lower-tier-sufficient"],
      );
      expect(markup).toContain(
        bestFitCopy.results.apiSetupLink("OpenAI"),
      );
      expect(markup).toContain(
        "https://developers.openai.com/api/docs/quickstart",
      );
      expect(markup).toContain('rel="noreferrer"');
      expect(markup).toContain("OpenAI API · GPT-5.6 Luna");
      expect(markup).not.toContain("api.openai.gpt-5.6-luna.standard-text");
      expect(markup).toContain('aria-live="polite"');
      expect(markup.match(/min-h-11/g)).toHaveLength(3);
      expect(markup).toContain('focus-visible:ring-4');
      expect(markup).toContain('flex flex-wrap');
      expect(markup).toContain('min-w-0');
      expect(markup).toContain('break-words');
      expect(markup).toContain('sm:grid-cols-2');
    }
  });

  it("shows user-entered limit percentages while keeping opaque quota out of automatic assignment", () => {
    const base = rendererProps();
    const result: BestFitUiPlan = {
      ...base.result,
      resourceDiagnostics: [{
        uiId: "resource-1",
        displayName: "Owned subscription",
        status: "conditional",
        routeIdentity: subscriptionRoute,
        fieldErrors: {},
        reasonCodes: ["quota-opaque"],
        usageSnapshot: {
          fiveHourRemainingPercent: 80,
          weeklyRemainingPercent: 60,
          modelWeeklyRemainingPercent: 40,
          modelLabel: "Claude Sonnet",
        },
      }],
    };

    for (const locale of ["ko", "en", "ja"] as readonly UiLocale[]) {
      languageState.locale = locale;
      const copy = BEST_FIT_UI_COPY[locale];
      const markup = renderToStaticMarkup(
        createElement(BestFitResults, {
          ...base,
          result,
          exportContext: {
            ...base.exportContext,
            uiPlan: result,
          },
        }),
      );

      expect(markup).toContain(copy.results.recordedUsageTitle);
      expect(markup).toContain(
        copy.resources.usageSnapshot.metricLabels.fiveHourRemainingPercent,
      );
      expect(markup).toContain(
        copy.resources.usageSnapshot.metricLabels.weeklyRemainingPercent,
      );
      expect(markup).toContain(
        copy.resources.usageSnapshot.metricLabels.modelWeeklyRemainingPercent,
      );
      expect(markup).toContain(copy.resources.usageSnapshot.remaining(80));
      expect(markup).toContain(copy.resources.usageSnapshot.remaining(60));
      expect(markup).toContain(copy.resources.usageSnapshot.remaining(40));
      expect(markup).toContain("Claude Sonnet");
      expect(markup).toContain(copy.resources.usageSnapshot.bottleneck(40));
      expect(markup).toContain(copy.results.recordedUsageReferenceOnly);
      expect(markup).toContain(copy.enums.exclusionReason["quota-opaque"]);
      expect(markup).not.toContain("FWP_USAGE_SNAPSHOT_V1");
      expect(markup).not.toContain("modelWeeklyRemainingPercent");
    }
  });

  it("renders localized closed exclusion reasons and never leaks raw internal codes", () => {
    for (const locale of ["ko", "en", "ja"] as const) {
      languageState.locale = locale;
      const markup = renderToStaticMarkup(
        createElement(BestFitResults, {
          ...rendererProps(),
        }),
      );
      const copy = BEST_FIT_UI_COPY[locale];

      expect(markup).toContain(
        copy.enums.exclusionReason["surface-incompatible"],
      );
      expect(markup).toContain(
        copy.enums.exclusionReason["input-limit-exceeded"],
      );
      expect(markup).toContain(copy.results.unknownExclusionReason);
      for (const raw of [
        "surface-incompatible",
        "input-limit-exceeded",
        "output-limit-exceeded",
        "context-limit-exceeded",
        "unrecognized-private-code",
      ]) {
        expect(markup).not.toContain(raw);
      }
    }
  });

  it("renders a reservation-order notice only for subscription task cash", () => {
    for (const locale of ["ko", "en", "ja"] as readonly UiLocale[]) {
      languageState.locale = locale;
      const markup = renderToStaticMarkup(
        createElement(BestFitResults, {
          ...rendererProps(),
        }),
      );
      const results = BEST_FIT_UI_COPY[locale].results;

      expect(markup).toContain(results.subscriptionMarginalCash);
      expect(markup).toContain(results.subscriptionMarginalCashNotice);
      expect(markup).toContain(results.apiTaskPrice);
      expect(markup.split(results.subscriptionMarginalCashNotice)).toHaveLength(2);
    }
  });

  it("separates app verification gaps from editable subscription inputs", () => {
    for (const locale of ["ko", "en", "ja"] as readonly UiLocale[]) {
      languageState.locale = locale;
      const markup = renderToStaticMarkup(
        createElement(BestFitResults, {
          ...infeasibleRendererProps(),
        }),
      );
      const renderedText = markup.replaceAll("&#x27;", "'");
      const copy = BEST_FIT_UI_COPY[locale];

      expect(renderedText).toContain(copy.results.infeasibleHelp.title(tasks[0].name));
      expect(renderedText).toContain(copy.results.infeasibleHelp.title(tasks[1].name));
      expect(renderedText).toContain(
        copy.enums.exclusionReason["surface-incompatible"],
      );
      expect(renderedText).toContain(
        copy.enums.exclusionReason["access-limits-incomplete"],
      );
      expect(renderedText).toContain(
        copy.enums.exclusionReason["input-limit-exceeded"],
      );
      expect(renderedText).toContain(
        copy.enums.exclusionReason["model-capabilities-incomplete"],
      );
      expect(renderedText).toContain(
        copy.enums.exclusionReason["invalid-user-override"],
      );
      expect(renderedText).toContain(
        copy.results.infeasibleHelp.systemProblemTitle,
      );
      expect(renderedText).toContain(
        copy.results.infeasibleHelp.systemProblemDescription,
      );
      expect(renderedText).toContain(
        copy.results.infeasibleHelp.systemProblemStatus,
      );
      expect(renderedText).toContain(
        copy.results.infeasibleHelp.accountStatusNotice,
      );
      expect(renderedText).toContain(
        copy.results.infeasibleHelp.inputProblemCaveat,
      );
      expect(renderedText).toContain(
        copy.results.infeasibleHelp.goToResourceInput,
      );
      expect(renderedText).toContain(
        copy.results.infeasibleHelp.viewReferencePlan,
      );
      expect(renderedText).toContain(
        copy.results.infeasibleHelp.resourceIssue(
          "Incomplete subscription",
          `${copy.resources.surfaceLabel} · ${copy.resources.includedLabel}`,
        ),
      );

      for (const rawReason of [
        "surface-incompatible",
        "access-limits-incomplete",
        "input-limit-exceeded",
        "model-capabilities-incomplete",
        "invalid-user-override",
      ]) {
        expect(renderedText).not.toContain(rawReason);
      }
      expect(renderedText).toContain("data-excluded-routes");
    }
  });

  it("describes catalog gaps without implying that a personal account was inspected", () => {
    for (const locale of ["ko", "en", "ja"] as readonly UiLocale[]) {
      languageState.locale = locale;
      const markup = renderToStaticMarkup(
        createElement(BestFitResults, {
          ...infeasibleRendererProps(),
        }),
      );
      const help = BEST_FIT_UI_COPY[locale].results.infeasibleHelp;

      expect(markup).toContain(help.accountStatusNotice);
      expect(help.systemProblemDescription).not.toMatch(
        /실제 이용 권한|actual access|実際のアクセス権/,
      );
    }
  });

  it("does not offer a dead reference-plan action when no reference plan exists", () => {
    languageState.locale = "ko";
    const props = infeasibleRendererProps();
    const markup = renderToStaticMarkup(
      createElement(BestFitResults, {
        ...props,
        referencePlanAvailable: false,
      }),
    );
    const help = BEST_FIT_UI_COPY.ko.results.infeasibleHelp;

    expect(markup).not.toContain(help.viewReferencePlan);
    expect(markup).toContain(help.showRouteDetails);
  });

  it("offers task review only when workload constraints are the blocking cause", () => {
    for (const locale of ["ko", "en", "ja"] as readonly UiLocale[]) {
      languageState.locale = locale;
      const base = infeasibleRendererProps();
      const result: BestFitUiPlan = {
        ...base.result,
        candidateSets: base.result.candidateSets.map((candidateSet) => ({
          ...candidateSet,
          excludedRoutes: [{
            routeIdentity: apiRoute,
            status: "ineligible" as const,
            reasonCodes: ["input-limit-exceeded"] as const,
          }],
        })) as BestFitUiPlan["candidateSets"],
        resourceDiagnostics: [],
      };
      const markup = renderToStaticMarkup(
        createElement(BestFitResults, {
          ...base,
          result,
          exportContext: { ...base.exportContext, uiPlan: result },
        }),
      );
      const help = BEST_FIT_UI_COPY[locale].results.infeasibleHelp;

      expect(markup).toContain(help.taskProblemTitle);
      expect(markup).toContain(help.taskProblemDescription);
      expect(markup).toContain(help.reviewTaskInput);
      expect(markup).not.toContain(help.systemProblemTitle);
      expect(markup).not.toContain(help.goToResourceInput);
    }
  });

  it("connects every infeasible-help trigger to a labelled and described dialog", () => {
    languageState.locale = "ko";
    const markup = renderToStaticMarkup(
      createElement(BestFitResults, {
        ...infeasibleRendererProps(),
      }),
    );
    const controlledDialogIds = [
      ...markup.matchAll(/aria-haspopup="dialog" aria-controls="([^"]+)"/g),
    ].map((match) => match[1]);

    expect(controlledDialogIds).toHaveLength(tasks.length);
    expect(new Set(controlledDialogIds).size).toBe(tasks.length);
    for (const dialogId of controlledDialogIds) {
      expect(markup).toContain(
        `id="${dialogId}" aria-labelledby="${dialogId}-title" aria-describedby="${dialogId}-intro"`,
      );
      expect(markup).toContain(`<h3 id="${dialogId}-title"`);
      expect(markup).toContain(`<p id="${dialogId}-intro"`);
    }
  });

  it("does not present US$0 as free or within budget when every task lacks a confirmed route", () => {
    for (const locale of ["ko", "en", "ja"] as readonly UiLocale[]) {
      languageState.locale = locale;
      const markup = renderToStaticMarkup(
        createElement(BestFitResults, {
          ...infeasibleRendererProps(),
        }),
      );
      const results = BEST_FIT_UI_COPY[locale].results;

      expect(markup).toContain(results.budgetNotAssessed);
      expect(markup).toContain(results.budgetNotAssessedDescription);
      expect(markup).toContain(results.excludedCostNoticeTitle);
      expect(markup).toContain(results.excludedCostNotice(tasks.length, true));
      expect(markup).toContain("US$0.00");
      expect(markup).toContain('role="alert"');
      expect(markup).not.toContain(results.noHighRisk);
      expect(markup).not.toContain(results.withinBudget);
    }
  });
});

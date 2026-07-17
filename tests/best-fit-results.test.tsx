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
  return { result, tasks, generatedAt, exportContext };
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
      expect(markup).toContain('aria-live="polite"');
      expect(markup.match(/min-h-11/g)).toHaveLength(2);
      expect(markup).toContain('focus-visible:ring-4');
      expect(markup).toContain('flex flex-wrap');
      expect(markup).toContain('min-w-0');
      expect(markup).toContain('break-words');
      expect(markup).toContain('sm:grid-cols-2');
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
});

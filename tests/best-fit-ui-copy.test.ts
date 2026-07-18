import { describe, expect, it } from "vitest";

import { SUBSCRIPTION_PRESET_IDS } from "@/config/subscription-presets";
import {
  BEST_FIT_EXCLUSION_REASON_CODES,
  BEST_FIT_UI_COPY,
  isBestFitExclusionReasonCode,
} from "@/lib/i18n/best-fit-ui-copy";
import { UI_COPY, UI_LOCALES } from "@/lib/i18n/ui-copy";
import { BEST_FIT_ROUTE_KINDS } from "@/types/best-fit";
import {
  PLANNING_QUALITY_TIERS,
  WORK_SURFACES,
} from "@/types/offerings";
import {
  SUBSCRIPTION_AVAILABILITY_STATUSES,
  SUBSCRIPTION_OWNERSHIPS,
  SUBSCRIPTION_QUOTA_KINDS,
  SUBSCRIPTION_QUOTA_UNITS,
} from "@/types/subscriptions";
import { APPLIED_UPGRADE_TRIGGER_CODES } from "@/types/workload";

function sortedKeys(value: object): string[] {
  return Object.keys(value).sort();
}

describe("Best-fit UI copy", () => {
  it("keeps all locale shapes and closed enum labels complete", () => {
    const ko = BEST_FIT_UI_COPY.ko;
    for (const locale of UI_LOCALES) {
      const copy = BEST_FIT_UI_COPY[locale];
      expect(sortedKeys(copy)).toEqual(sortedKeys(ko));
      expect(sortedKeys(copy.hero)).toEqual(sortedKeys(ko.hero));
      expect(sortedKeys(copy.budget)).toEqual(sortedKeys(ko.budget));
      expect(sortedKeys(copy.resources)).toEqual(sortedKeys(ko.resources));
      expect(sortedKeys(copy.overrides)).toEqual(sortedKeys(ko.overrides));
      expect(sortedKeys(copy.results)).toEqual(sortedKeys(ko.results));
      expect(sortedKeys(copy.resources.presets)).toEqual(
        [...SUBSCRIPTION_PRESET_IDS].sort(),
      );
      expect(sortedKeys(copy.resources.quotaGuide.presets)).toEqual(
        [...SUBSCRIPTION_PRESET_IDS].sort(),
      );
      expect(sortedKeys(copy.enums.ownership)).toEqual(
        [...SUBSCRIPTION_OWNERSHIPS].sort(),
      );
      expect(sortedKeys(copy.enums.availability)).toEqual(
        [...SUBSCRIPTION_AVAILABILITY_STATUSES].sort(),
      );
      expect(sortedKeys(copy.enums.quotaKind)).toEqual(
        [...SUBSCRIPTION_QUOTA_KINDS].sort(),
      );
      expect(sortedKeys(copy.enums.quotaUnit)).toEqual(
        [...SUBSCRIPTION_QUOTA_UNITS].sort(),
      );
      expect(sortedKeys(copy.enums.surface)).toEqual([...WORK_SURFACES].sort());
      expect(sortedKeys(copy.enums.planningTier)).toEqual(
        [...PLANNING_QUALITY_TIERS].sort(),
      );
      expect(sortedKeys(copy.enums.routeKind)).toEqual(
        [...BEST_FIT_ROUTE_KINDS].sort(),
      );
      expect(sortedKeys(copy.enums.upgradeTrigger)).toEqual(
        [...APPLIED_UPGRADE_TRIGGER_CODES].sort(),
      );
      expect(sortedKeys(copy.enums.exclusionReason)).toEqual(
        [...BEST_FIT_EXCLUSION_REASON_CODES].sort(),
      );
    }
  });

  it("labels Premium as a neutral choice and explains both selected states", () => {
    expect(BEST_FIT_UI_COPY.ko.results.premiumChoice).toBe("Premium 선택");
    expect(BEST_FIT_UI_COPY.en.results.premiumChoice).toBe("Premium choice");
    expect(BEST_FIT_UI_COPY.ja.results.premiumChoice).toBe("Premiumの選択");

    expect(BEST_FIT_UI_COPY.ko.enums.whyNotPremium["premium-selected"]).toContain(
      "선택함",
    );
    expect(BEST_FIT_UI_COPY.ko.enums.whyNotPremium["lower-tier-sufficient"]).toContain(
      "선택하지 않음",
    );
    expect(BEST_FIT_UI_COPY.en.enums.whyNotPremium["premium-selected"]).toContain(
      "Selected",
    );
    expect(BEST_FIT_UI_COPY.ja.enums.whyNotPremium["premium-selected"]).toContain(
      "選択",
    );
  });

  it("localizes the complete closed exclusion-reason set without exposing raw codes", () => {
    expect(new Set(BEST_FIT_EXCLUSION_REASON_CODES).size).toBe(
      BEST_FIT_EXCLUSION_REASON_CODES.length,
    );
    expect(isBestFitExclusionReasonCode("surface-incompatible")).toBe(true);
    expect(isBestFitExclusionReasonCode("not-a-real-reason")).toBe(false);

    for (const locale of UI_LOCALES) {
      const labels = BEST_FIT_UI_COPY[locale].enums.exclusionReason;
      for (const reason of BEST_FIT_EXCLUSION_REASON_CODES) {
        expect(labels[reason].trim()).not.toBe("");
        expect(labels[reason]).not.toBe(reason);
      }
      expect(labels["input-limit-exceeded"]).toBe(
        UI_COPY[locale].enums.invocationFailure["input-limit-exceeded"],
      );
      expect(labels["output-limit-exceeded"]).toBe(
        UI_COPY[locale].enums.invocationFailure["output-limit-exceeded"],
      );
      expect(labels["context-limit-exceeded"]).toBe(
        UI_COPY[locale].enums.invocationFailure["context-limit-exceeded"],
      );
    }
  });

  it("distinguishes API task prices from subscription reservation-order attribution", () => {
    for (const locale of UI_LOCALES) {
      const results = BEST_FIT_UI_COPY[locale].results;
      expect(results.apiTaskPrice).not.toBe(results.subscriptionMarginalCash);
      expect(results.subscriptionMarginalCashNotice.length).toBeGreaterThan(80);
      expect(results.unknownExclusionReason.trim()).not.toBe("");
    }
    expect(BEST_FIT_UI_COPY.ko.results.subscriptionMarginalCashNotice).toContain(
      "예약 순서",
    );
    expect(BEST_FIT_UI_COPY.en.results.subscriptionMarginalCashNotice).toContain(
      "reservation position",
    );
    expect(BEST_FIT_UI_COPY.ja.results.subscriptionMarginalCashNotice).toContain(
      "予約順序",
    );
  });

  it("localizes infeasible-route help and the zero-cost exclusion warning", () => {
    const taskNames = {
      ko: "고객 문서 작성",
      en: "Write a customer document",
      ja: "顧客向け文書の作成",
    } as const;

    for (const locale of UI_LOCALES) {
      const results = BEST_FIT_UI_COPY[locale].results;
      const help = results.infeasibleHelp;

      expect(help.open.trim()).not.toBe("");
      expect(help.title(taskNames[locale])).toContain(taskNames[locale]);
      expect(help.intro.length).toBeGreaterThan(15);
      expect(help.inputProblemTitle.trim()).not.toBe("");
      expect(help.systemProblemTitle.trim()).not.toBe("");
      expect(help.systemProblemDescription.length).toBeGreaterThan(40);
      expect(help.taskProblemTitle.trim()).not.toBe("");
      expect(help.goToResourceInput.trim()).not.toBe("");
      expect(help.viewReferencePlan.trim()).not.toBe("");
      expect(help.showRouteDetails.trim()).not.toBe("");
      expect(help.close.trim()).not.toBe("");
      for (const guidance of Object.values(help.guidance)) {
        expect(guidance.length).toBeGreaterThan(25);
      }
      expect(results.budgetNotAssessed).not.toBe(results.withinBudget);
      expect(results.excludedCostNotice(3, true)).toContain("US$0.00");
      expect(results.referencePlanDescription.length).toBeGreaterThan(20);
      expect(results.referenceSummaryDescription.length).toBeGreaterThan(50);
    }

    expect(BEST_FIT_UI_COPY.ko.results.infeasibleHelp.open).not.toBe(
      BEST_FIT_UI_COPY.en.results.infeasibleHelp.open,
    );
    expect(BEST_FIT_UI_COPY.ja.results.infeasibleHelp.open).not.toBe(
      BEST_FIT_UI_COPY.en.results.infeasibleHelp.open,
    );
  });

  it("keeps the approved hero while making the primary flow personal-user friendly", () => {
    expect(BEST_FIT_UI_COPY.ko.hero).toMatchObject({
      titleLine1: "가장 비싼 모델보다",
      titleLine2: "작업에 맞는 선택을",
    });
    for (const locale of UI_LOCALES) {
      const copy = BEST_FIT_UI_COPY[locale];
      expect(copy.hero.eyebrow.length).toBeGreaterThan(20);
      expect(copy.overrides.accessBoundary.length).toBeGreaterThan(20);
      expect(copy.results.authorityNotice.length).toBeGreaterThan(20);
      expect(copy.results.compatibilityDescription).not.toMatch(/Best-fit/i);
      expect(UI_COPY[locale].page.submitMock).not.toMatch(/Mock/i);
      expect(UI_COPY[locale].page.submitLive).not.toMatch(/Live/i);
      const productClaims = JSON.stringify({
        hero: copy.hero,
        resources: copy.resources.description,
        results: copy.results.authorityNotice,
      }).toLowerCase();
      expect(productClaims).not.toContain("self-host");
      expect(productClaims).not.toContain("local execution");
      expect(productClaims).not.toContain("best model");
    }
  });

  it("explains time-based quota recovery without rolling-window jargon", () => {
    expect(
      JSON.stringify({
        preset: BEST_FIT_UI_COPY.ko.resources.presets["glm-like-rolling"],
        option: BEST_FIT_UI_COPY.ko.enums.resetKind.rolling,
        label: BEST_FIT_UI_COPY.ko.resources.rollingHoursLabel,
      }),
    ).not.toMatch(/롤링|윈도우/);
    expect(
      JSON.stringify({
        preset: BEST_FIT_UI_COPY.en.resources.presets["glm-like-rolling"],
        option: BEST_FIT_UI_COPY.en.enums.resetKind.rolling,
        label: BEST_FIT_UI_COPY.en.resources.rollingHoursLabel,
      }),
    ).not.toMatch(/rolling window/i);
    expect(
      JSON.stringify({
        preset: BEST_FIT_UI_COPY.ja.resources.presets["glm-like-rolling"],
        option: BEST_FIT_UI_COPY.ja.enums.resetKind.rolling,
        label: BEST_FIT_UI_COPY.ja.resources.rollingHoursLabel,
      }),
    ).not.toMatch(/ローリング/);
    for (const locale of UI_LOCALES) {
      expect(BEST_FIT_UI_COPY[locale].resources.rollingHoursHelp.length).toBeGreaterThanOrEqual(25);
    }
  });

  it("explains how to copy official quota values without inventing numbers", () => {
    for (const locale of UI_LOCALES) {
      const guide = BEST_FIT_UI_COPY[locale].resources.quotaGuide;
      expect(guide.open.trim()).not.toBe("");
      expect(guide.unknown.trim()).not.toBe("");
      for (const presetId of SUBSCRIPTION_PRESET_IDS) {
        expect(guide.presets[presetId].steps.length).toBeGreaterThanOrEqual(2);
      }
    }
    expect(BEST_FIT_UI_COPY.ko.resources.quotaGuide.unknown).toContain(
      "추정하지 말고",
    );
  });

  it("provides a localized initial display name for every resource preset", () => {
    for (const locale of UI_LOCALES) {
      for (const presetId of SUBSCRIPTION_PRESET_IDS) {
        expect(BEST_FIT_UI_COPY[locale].resources.presets[presetId].name.trim())
          .not.toBe("");
      }
    }
    expect(
      BEST_FIT_UI_COPY.ko.resources.presets["chatgpt-like-variable"].name,
    ).not.toBe(
      BEST_FIT_UI_COPY.en.resources.presets["chatgpt-like-variable"].name,
    );
    expect(
      BEST_FIT_UI_COPY.ja.resources.presets["chatgpt-like-variable"].name,
    ).not.toBe(
      BEST_FIT_UI_COPY.en.resources.presets["chatgpt-like-variable"].name,
    );
  });
});

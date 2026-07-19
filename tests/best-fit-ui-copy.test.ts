import { describe, expect, it } from "vitest";

import { SUBSCRIPTION_PRESET_IDS } from "@/config/subscription-presets";
import {
  BEST_FIT_EXCLUSION_REASON_CODES,
  BEST_FIT_UI_COPY,
  isBestFitExclusionReasonCode,
} from "@/lib/i18n/best-fit-ui-copy";
import { UI_COPY, UI_LOCALES } from "@/lib/i18n/ui-copy";
import { SUBSCRIPTION_USAGE_PERCENT_KEYS } from "@/lib/subscriptions/usage-snapshot";
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
      expect(sortedKeys(copy.resources.usageSnapshot)).toEqual(
        sortedKeys(ko.resources.usageSnapshot),
      );
      expect(sortedKeys(copy.resources.usageSnapshot.metricLabels)).toEqual(
        [...SUBSCRIPTION_USAGE_PERCENT_KEYS].sort(),
      );
      expect(sortedKeys(copy.resources.accessArrangement)).toEqual([
        "organization-provided",
        "personal-existing",
        "personal-new",
        "unresolved",
      ]);
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

  it("labels the high-performance tier as a neutral choice and explains both states", () => {
    expect(BEST_FIT_UI_COPY.ko.results.premiumChoice).toBe("고성능 등급 사용 여부");
    expect(BEST_FIT_UI_COPY.en.results.premiumChoice).toBe("Use of the high-performance tier");
    expect(BEST_FIT_UI_COPY.ja.results.premiumChoice).toBe("高性能グレードの利用有無");

    expect(BEST_FIT_UI_COPY.ko.enums.whyNotPremium["premium-selected"]).toContain(
      "사용",
    );
    expect(BEST_FIT_UI_COPY.ko.enums.whyNotPremium["lower-tier-sufficient"]).toContain(
      "사용하지 않음",
    );
    expect(BEST_FIT_UI_COPY.en.enums.whyNotPremium["premium-selected"]).toContain(
      "Used",
    );
    expect(BEST_FIT_UI_COPY.ja.enums.whyNotPremium["premium-selected"]).toContain(
      "使用",
    );
    for (const locale of UI_LOCALES) {
      expect(BEST_FIT_UI_COPY[locale].results.premiumChoice).not.toMatch(/Premium/);
    }
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
      expect(results.subscriptionMarginalCashNotice.length).toBeGreaterThan(50);
      expect(results.unknownExclusionReason.trim()).not.toBe("");
    }
    expect(BEST_FIT_UI_COPY.ko.results.subscriptionMarginalCashNotice).toContain("계획의 전체 비용");
    expect(BEST_FIT_UI_COPY.en.results.subscriptionMarginalCashNotice).toContain("total plan cost");
    expect(BEST_FIT_UI_COPY.ja.results.subscriptionMarginalCashNotice).toContain("計画全体の費用");
    expect(
      JSON.stringify(UI_LOCALES.map((locale) =>
        BEST_FIT_UI_COPY[locale].results.subscriptionMarginalCashNotice)),
    ).not.toMatch(/예약 순서|reservation position|予約順序/);
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
        option: BEST_FIT_UI_COPY.ko.enums.resetKind.rolling,
        label: BEST_FIT_UI_COPY.ko.resources.rollingHoursLabel,
        help: BEST_FIT_UI_COPY.ko.resources.rollingHoursHelp,
      }),
    ).not.toMatch(/롤링|윈도우/);
    expect(BEST_FIT_UI_COPY.ko.resources.rollingHoursHelp).not.toContain(
      "5시간이면",
    );
    expect(
      JSON.stringify({
        option: BEST_FIT_UI_COPY.en.enums.resetKind.rolling,
        label: BEST_FIT_UI_COPY.en.resources.rollingHoursLabel,
        help: BEST_FIT_UI_COPY.en.resources.rollingHoursHelp,
      }),
    ).not.toMatch(/rolling window/i);
    expect(
      JSON.stringify({
        option: BEST_FIT_UI_COPY.ja.enums.resetKind.rolling,
        label: BEST_FIT_UI_COPY.ja.resources.rollingHoursLabel,
        help: BEST_FIT_UI_COPY.ja.resources.rollingHoursHelp,
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

  it("separates subscriptions from API access and makes plan inclusion explicit", () => {
    expect(BEST_FIT_UI_COPY.ko.resources.description).toContain(
      "구독과 API는 별도",
    );
    expect(BEST_FIT_UI_COPY.en.resources.description).toContain(
      "Subscriptions and APIs are separate",
    );
    expect(BEST_FIT_UI_COPY.ja.resources.description).toContain(
      "サブスクリプションとAPIは別",
    );
    expect(BEST_FIT_UI_COPY.ko.resources.description).toContain(
      "조직 API 권한으로 계산하지 않습니다",
    );
    expect(BEST_FIT_UI_COPY.en.resources.description).toContain(
      "does not count as organization API access",
    );
    expect(BEST_FIT_UI_COPY.ja.resources.description).toContain(
      "組織のAPI利用権限とはみなしません",
    );
    expect(BEST_FIT_UI_COPY.ko.resources.availabilityLabel).toContain(
      "이번 계획",
    );
    expect(BEST_FIT_UI_COPY.ko.enums.availability.unavailable).toContain(
      "제외",
    );
    expect(BEST_FIT_UI_COPY.ko.resources.availabilityHelp).toContain(
      "추천 이용 방법에는 넣지 않습니다",
    );
    expect(
      BEST_FIT_UI_COPY.ko.resources.presets["chatgpt-like-variable"].name,
    ).not.toContain("유형");
    expect(
      BEST_FIT_UI_COPY.ko.resources.quotaComplexityHelp,
    ).toContain("같은 계정의 여러 한도");
    expect(BEST_FIT_UI_COPY.ko.resources.presets["gemini-code-assist"].name)
      .toContain("Standard / Enterprise");
    expect(BEST_FIT_UI_COPY.ko.resources.presets["google-antigravity"].name)
      .toContain("Antigravity");
  });

  it("keeps primary result and diagnostic labels in plain language", () => {
    expect(BEST_FIT_UI_COPY.ko.results).toMatchObject({
      unknownRouteLabel: "확인할 수 없는 이용 방법",
      referenceSummaryTitle: "참고용 API 예상 비용",
    });
    expect(BEST_FIT_UI_COPY.ko.resources).toMatchObject({
      lowLabel: "적게 사용",
      expectedLabel: "보통 사용",
      highLabel: "많이 사용",
    });
    expect(JSON.stringify(Object.values(BEST_FIT_UI_COPY.ko.enums.exclusionReason))).not.toMatch(
      /카탈로그|프리셋|커넥터|스냅샷|적격성|이용 경로/,
    );
    expect(JSON.stringify(Object.values(BEST_FIT_UI_COPY.en.enums.exclusionReason))).not.toMatch(
      /Catalog|Preset|Connector|Snapshot|Eligibility|access-route/i,
    );
    expect(JSON.stringify(Object.values(BEST_FIT_UI_COPY.ja.enums.exclusionReason))).not.toMatch(
      /カタログ|プリセット|コネクタ|スナップショット|適格性|利用経路/,
    );
  });
});

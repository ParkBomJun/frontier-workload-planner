import { describe, expect, it } from "vitest";

import { SUBSCRIPTION_PRESET_IDS } from "@/config/subscription-presets";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import { UI_LOCALES } from "@/lib/i18n/ui-copy";
import { BEST_FIT_ROUTE_KINDS } from "@/types/best-fit";
import {
  CONDITIONAL_REASON_CODES,
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
      expect(sortedKeys(copy.enums.conditionalReason)).toEqual(
        [...CONDITIONAL_REASON_CODES].sort(),
      );
    }
  });

  it("uses the approved Korean hero and preserves the responsibility boundary", () => {
    expect(BEST_FIT_UI_COPY.ko.hero).toMatchObject({
      titleLine1: "가장 비싼 모델보다,",
      titleLine2: "작업에 맞는 선택을.",
    });
    for (const locale of UI_LOCALES) {
      const copy = BEST_FIT_UI_COPY[locale];
      expect(copy.hero.description).toContain("GPT-5.6");
      expect(copy.overrides.accessBoundary.length).toBeGreaterThan(20);
      expect(copy.results.authorityNotice.length).toBeGreaterThan(20);
      expect(copy.results.compatibilityDescription).toMatch(/Best-fit/i);
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

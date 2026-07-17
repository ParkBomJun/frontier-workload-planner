import { describe, expect, it } from "vitest";

import {
  DEFAULT_UI_LOCALE,
  getEnumLabel,
  getUiCopy,
  isUiLocale,
  UI_LOCALE_META,
  UI_LOCALES,
} from "@/lib/i18n/ui-copy";

describe("UI locale contract", () => {
  it("supports Korean, English, and Japanese with Korean as the SSR default", () => {
    expect(UI_LOCALES).toEqual(["ko", "en", "ja"]);
    expect(DEFAULT_UI_LOCALE).toBe("ko");
    expect(UI_LOCALE_META).toMatchObject({
      ko: { htmlLang: "ko", dateLocale: "ko-KR", nativeName: "한국어" },
      en: { htmlLang: "en", dateLocale: "en-US", nativeName: "English" },
      ja: { htmlLang: "ja", dateLocale: "ja-JP", nativeName: "日本語" },
    });
  });

  it("accepts only supported persisted locale values", () => {
    expect(isUiLocale("ko")).toBe(true);
    expect(isUiLocale("en")).toBe(true);
    expect(isUiLocale("ja")).toBe(true);
    expect(isUiLocale("fr")).toBe(false);
    expect(isUiLocale(null)).toBe(false);
    expect(isUiLocale({ locale: "ko" })).toBe(false);
  });

  it.each(UI_LOCALES)("provides complete dynamic copy for %s", (locale) => {
    const copy = getUiCopy(locale);

    expect(copy.common.productName).toBe("Frontier Workload Planner");
    expect(copy.page.submitting(3)).toContain("3");
    expect(copy.taskEditor.maximumReached(8)).toContain("8");
    expect(copy.analysisResults.heldWarning(2)).toContain("2");
    expect(copy.providerComparison.previewModels(3)).toContain("3");
    expect(copy.providerComparison.analysisExplanation.mock).toContain("Mock");
    expect(copy.providerComparison.analysisExplanation.live).toContain("GPT-5.6");
    expect(copy.providerPricing.priceFrom("2026-09-01", 3, 15)).toContain("2026-09-01");
  });

  it("labels quality-first as a tier heuristic rather than a quality claim", () => {
    expect(getUiCopy("ko").budgetSettings.strategies["quality-first"].label).toBe(
      "상위 tier 우선",
    );
    expect(getUiCopy("en").budgetSettings.strategies["quality-first"].label).toBe(
      "Upper-tier preference",
    );
    expect(getUiCopy("ja").budgetSettings.strategies["quality-first"].label).toBe(
      "上位tier優先",
    );
    expect(getEnumLabel("en", "priority", "high")).toBe("High");
  });
});

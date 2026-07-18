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

  it("translates required, optional, and default-value field badges", () => {
    expect(getUiCopy("ko").common).toMatchObject({
      required: "필수",
      optional: "선택",
      defaultValue: "기본값 있음",
    });
    expect(getUiCopy("en").common).toMatchObject({
      required: "Required",
      optional: "Optional",
      defaultValue: "Default set",
    });
    expect(getUiCopy("ja").common).toMatchObject({
      required: "必須",
      optional: "任意",
      defaultValue: "初期値あり",
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
    expect(copy.analysisResults.infeasibleWarning(2)).toContain("2");
    expect(copy.analysisResults.legacyInfeasibleWarning(2)).toContain("2");
    expect(copy.analysisResults.infeasibleReason(
      copy.enums.invocationFailure["output-limit-exceeded"],
    )).toContain(copy.enums.invocationFailure["output-limit-exceeded"]);
    expect(copy.analysisResults.legacyInfeasibleReason(
      copy.enums.invocationFailure["output-limit-exceeded"],
    )).toContain(copy.enums.invocationFailure["output-limit-exceeded"]);
    expect(copy.analysisResults.eligibilityVerificationPending).toMatch(
      /separate catalog check|별도 카탈로그 판정|別のカタログ判定/,
    );
    expect(copy.providerComparison.eligibilityScopeNotice).toMatch(
      /assessed separately|별도로 판정|別に判定/,
    );
    expect(copy.providerComparison.previewModels(3)).toContain("3");
    expect(copy.providerComparison.analysisExplanation.mock).toContain("Mock");
    expect(copy.providerComparison.analysisExplanation.live).toContain("GPT-5.6");
    expect(copy.providerPricing.priceFrom("2026-09-01", 3, 15)).toContain("2026-09-01");
  });

  it("states the bounded GPT workload contract and deterministic program boundary", () => {
    expect(getUiCopy("ko").page.heroDescription).toBe(
      "GPT-5.6은 난이도·크기·작업 모드·최소 품질·필수 기능·실패 위험 등 범위가 제한된 작업 요구사항을 구조화합니다. 프로그램은 공개된 고정 규칙으로 호출 한도를 검증하고 토큰·비용·공급자별 예산 계획을 계산하며, GPT는 가격·공급자·최종 경로를 선택하지 않습니다.",
    );
    expect(getUiCopy("en").page.heroDescription).toBe(
      "GPT-5.6 structures bounded workload requirements such as complexity, size, work mode, minimum quality, required capabilities, and failure risk. Published program rules validate invocation limits and calculate tokens, costs, and per-provider budget plans; GPT does not choose prices, providers, or a final route.",
    );
    expect(getUiCopy("ja").page.heroDescription).toBe(
      "GPT-5.6は、複雑さ・サイズ・作業モード・最低品質・必須機能・失敗リスクなど、範囲を限定したワークロード要件を構造化します。プログラムは公開された固定ルールで呼び出し上限を検証し、トークン・コスト・プロバイダー別の予算計画を計算します。GPTは料金・プロバイダー・最終ルートを選びません。",
    );
  });

  it("does not describe legacy invocation failures as minimum-quality failures", () => {
    expect(getUiCopy("ko").analysisResults.legacyInfeasibleWarning(1)).not.toContain(
      "최소 품질",
    );
    expect(getUiCopy("en").analysisResults.legacyInfeasibleWarning(1)).not.toContain(
      "minimum-quality",
    );
    expect(getUiCopy("ja").analysisResults.legacyInfeasibleWarning(1)).not.toContain(
      "最低品質",
    );
  });

  it("labels quality-first as an upper-grade preference rather than a quality claim", () => {
    expect(getUiCopy("ko").budgetSettings.strategies["quality-first"].label).toBe(
      "상위 등급도 검토",
    );
    expect(getUiCopy("en").budgetSettings.strategies["quality-first"].label).toBe(
      "Consider higher tiers",
    );
    expect(getUiCopy("ja").budgetSettings.strategies["quality-first"].label).toBe(
      "上位グレードも検討",
    );
    expect(getEnumLabel("en", "priority", "high")).toBe("High");
  });

  it.each(UI_LOCALES)("keeps strategy labels consistent in %s", (locale) => {
    const copy = getUiCopy(locale);
    expect(copy.enums.strategy["cost-saver"]).toBe(
      copy.budgetSettings.strategies["cost-saver"].label,
    );
    expect(copy.enums.strategy.balanced).toBe(
      copy.budgetSettings.strategies.balanced.label,
    );
    expect(copy.enums.strategy["quality-first"]).toBe(
      copy.budgetSettings.strategies["quality-first"].label,
    );
  });

  it("discloses automatic plaintext task storage before submission in every locale", () => {
    expect(getUiCopy("ko").page.storageDisclosure).toContain("작업명·설명");
    expect(getUiCopy("ko").page.storageDisclosure).toContain("평문");
    expect(getUiCopy("ko").page.storageDisclosure).toContain("자동 저장");
    expect(getUiCopy("en").page.storageDisclosure).toContain("task names, descriptions");
    expect(getUiCopy("en").page.storageDisclosure).toContain("unencrypted plaintext");
    expect(getUiCopy("en").page.storageDisclosure).toContain("automatically saved");
    expect(getUiCopy("ja").page.storageDisclosure).toContain("タスク名・説明");
    expect(getUiCopy("ja").page.storageDisclosure).toContain("平文");
    expect(getUiCopy("ja").page.storageDisclosure).toContain("自動保存");
  });
});

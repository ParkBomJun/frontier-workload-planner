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
  it("supports Korean, English, and Japanese with English as the SSR default", () => {
    expect(UI_LOCALES).toEqual(["ko", "en", "ja"]);
    expect(DEFAULT_UI_LOCALE).toBe("en");
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

    expect(copy.common.productName).toBe("Nothing More");
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
      /plan above|tailored plan|맞춤 계획|上の計画/,
    );
    expect(copy.providerComparison.eligibilityScopeNotice).toMatch(
      /tailored plan|맞춤 계획|上の計画/,
    );
    expect(copy.providerComparison.previewModels(3)).toContain("3");
    expect(copy.providerComparison.analysisExplanation.mock).not.toMatch(/Mock|fixture/i);
    expect(copy.providerComparison.analysisExplanation.live).toContain("GPT-5.6");
    expect(copy.providerPricing.priceFrom("2026-09-01", 3, 15)).toContain("2026-09-01");
  });

  it("states the bounded GPT workload contract and deterministic program boundary", () => {
    expect(getUiCopy("ko").page.heroDescription).toBe(
      "GPT-5.6은 작업 설명에서 난이도·규모·필요 기능 등을 정리합니다. 가격, 공급자, 최종 이용 방법은 GPT가 고르지 않습니다. 프로그램이 공개된 규칙과 가격표로 호출 한도, 토큰, 비용과 예산 계획을 계산합니다.",
    );
    expect(getUiCopy("en").page.heroDescription).toBe(
      "GPT-5.6 organizes details such as difficulty, size, and required features from your task descriptions. GPT does not choose prices, providers, or the final way to use a model. The program calculates limits, tokens, costs, and budget plans from published rules and price lists.",
    );
    expect(getUiCopy("ja").page.heroDescription).toBe(
      "GPT-5.6は作業説明から、難しさ・規模・必要な機能などを整理します。料金、プロバイダー、最終的な利用方法をGPTが選ぶことはありません。プログラムが公開ルールと料金表から、上限・トークン・費用・予算計画を計算します。",
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
    const koDisclosure = getUiCopy("ko").page.storageDisclosure;
    expect(koDisclosure).toContain("작업명·설명");
    expect(koDisclosure).toContain("계획 설정");
    expect(koDisclosure).toContain("작업 분석");
    expect(koDisclosure).toContain("구독·가격 수정 정보");
    expect(koDisclosure).toContain("계산된 이용 경로와 비용은 저장하지 않고");
    expect(koDisclosure).toContain("평문");
    expect(koDisclosure).toContain("자동 저장");
    expect(koDisclosure).toContain("삭제할 때까지");
    expect(koDisclosure).toContain("사용자 API 키를 입력받거나 이 브라우저에 저장하지 않습니다");
    expect(getUiCopy("ko").page.storagePlaintextReminder).toContain("삭제할 때까지");
    const enDisclosure = getUiCopy("en").page.storageDisclosure;
    expect(enDisclosure).toContain("task names and descriptions");
    expect(enDisclosure).toContain("planning settings");
    expect(enDisclosure).toContain("versioned workload analysis");
    expect(enDisclosure).toContain("subscription and price-override inputs");
    expect(enDisclosure).toContain("Calculated routes and costs are not stored");
    expect(enDisclosure).toContain("unencrypted plaintext");
    expect(enDisclosure).toContain("automatically saved");
    expect(enDisclosure).toContain("until you delete");
    expect(enDisclosure).toContain("does not ask for a user's API key or store one in this browser");
    expect(getUiCopy("en").page.storagePlaintextReminder).toContain("until you delete");
    const jaDisclosure = getUiCopy("ja").page.storageDisclosure;
    expect(jaDisclosure).toContain("タスク名・説明");
    expect(jaDisclosure).toContain("計画設定");
    expect(jaDisclosure).toContain("作業分析");
    expect(jaDisclosure).toContain("サブスクリプション・料金修正情報");
    expect(jaDisclosure).toContain("計算済みの利用経路と費用は保存せず");
    expect(jaDisclosure).toContain("平文");
    expect(jaDisclosure).toContain("自動保存");
    expect(jaDisclosure).toContain("削除するまで");
    expect(jaDisclosure).toContain("利用者のAPIキーの入力を求めず、このブラウザにも保存しません");
    expect(getUiCopy("ja").page.storagePlaintextReminder).toContain("削除するまで");
  });

  it("explains data transfer using the same sample and own-task labels shown in the UI", () => {
    expect(getUiCopy("ko").page.liveSafety).toMatch(
      /작업명과 설명[\s\S]*OpenAI[\s\S]*store:false[\s\S]*암호화된 프롬프트 캐시[\s\S]*모든 보관을 없애지는 않습니다[\s\S]*최대 30일[\s\S]*더 길어질 수 있습니다[\s\S]*민감정보/,
    );
    expect(getUiCopy("ko").page.mockSafety).toMatch(
      /브라우저 안에서만[\s\S]*사이트 서버나 외부 AI로 보내지 않/,
    );
    expect(getUiCopy("en").page.liveSafety).toMatch(
      /task names and descriptions[\s\S]*OpenAI[\s\S]*store:false[\s\S]*does not eliminate all retention[\s\S]*encrypted prompt caching[\s\S]*up to 30 days[\s\S]*kept longer[\s\S]*sensitive information/,
    );
    expect(getUiCopy("en").page.mockSafety).toMatch(
      /only in this browser[\s\S]*does not send[\s\S]*site server or an external AI/,
    );
    expect(getUiCopy("ja").page.liveSafety).toMatch(
      /タスク名と説明[\s\S]*OpenAI[\s\S]*store:false[\s\S]*暗号化されたプロンプトキャッシュ[\s\S]*すべての保持をなくすものではありません[\s\S]*最大30日間[\s\S]*さらに長く保持[\s\S]*機密情報/,
    );
    expect(getUiCopy("ja").page.mockSafety).toMatch(
      /ブラウザ内だけ[\s\S]*サイトのサーバーや外部AIへ送りません/,
    );
    for (const locale of UI_LOCALES) {
      expect(getUiCopy(locale).page.liveSafety).not.toMatch(/Mock|Live/);
      expect(getUiCopy(locale).page.mockSafety).not.toMatch(/Mock|Live/);
    }
  });

  it("localizes the three usage estimates without exposing scenario codes", () => {
    expect(getUiCopy("ko").analysisResults).toMatchObject({
      lowUsageLabel: "적게 사용",
      expectedUsageLabel: "보통 사용",
      highUsageLabel: "많이 사용",
    });
    expect(getUiCopy("en").analysisResults).toMatchObject({
      lowUsageLabel: "Lower use",
      expectedUsageLabel: "Likely use",
      highUsageLabel: "Higher use",
    });
    expect(getUiCopy("ja").analysisResults).toMatchObject({
      lowUsageLabel: "少なめ",
      expectedUsageLabel: "標準",
      highUsageLabel: "多め",
    });
  });
});

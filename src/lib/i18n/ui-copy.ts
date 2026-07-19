import type {
  AnalysisMode,
  Complexity,
  InvocationLimitFailureCode,
  ModelTier,
  PlanningStrategy,
  ProviderId,
  ReasoningDepth,
  SizeBand,
  TaskPriority,
  TaskType,
  Uncertainty,
} from "@/types/domain";
import type { FailureImpact } from "@/types/workload";

export const UI_LOCALES = ["ko", "en", "ja"] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export const DEFAULT_UI_LOCALE: UiLocale = "ko";
export const UI_LOCALE_STORAGE_KEY = "frontier-workload-planner:locale";

export interface UiLocaleMeta {
  htmlLang: string;
  nativeName: string;
  dateLocale: string;
  numberLocale: string;
}

export const UI_LOCALE_META: Record<UiLocale, UiLocaleMeta> = {
  ko: {
    htmlLang: "ko",
    nativeName: "한국어",
    dateLocale: "ko-KR",
    numberLocale: "ko-KR",
  },
  en: {
    htmlLang: "en",
    nativeName: "English",
    dateLocale: "en-US",
    numberLocale: "en-US",
  },
  ja: {
    htmlLang: "ja",
    nativeName: "日本語",
    dateLocale: "ja-JP",
    numberLocale: "ja-JP",
  },
};

export interface UiEnumLabels {
  analysisMode: Record<AnalysisMode, string>;
  taskType: Record<TaskType, string>;
  complexity: Record<Complexity, string>;
  reasoningDepth: Record<ReasoningDepth, string>;
  sizeBand: Record<SizeBand, string>;
  uncertainty: Record<Uncertainty, string>;
  modelTier: Record<ModelTier, string>;
  provider: Record<ProviderId, string>;
  strategy: Record<PlanningStrategy, string>;
  priority: Record<TaskPriority, string>;
  failureImpact: Record<FailureImpact, string>;
  allocationStatus: Record<"active" | "held" | "infeasible", string>;
  invocationFailure: Record<InvocationLimitFailureCode, string>;
}

export interface UiCopy {
  common: {
    productName: string;
    language: string;
    languageSelectorHelp: string;
    selected: string;
    select: string;
    required: string;
    optional: string;
    defaultValue: string;
    active: string;
    held: string;
    none: string;
    officialPricingSource: string;
    officialModelsSource: string;
    verifiedAt: (date: string) => string;
    usdPerMillionTokens: string;
  };
  page: {
    headerSubtitle: string;
    headerBadge: string;
    heroEyebrow: string;
    heroTitleLine1: string;
    heroTitleLine2: string;
    heroDescription: string;
    analysisModeLegend: string;
    mockDescription: string;
    liveDescription: string;
    storageDisclosure: string;
    submitMock: string;
    submitLive: string;
    submitting: (count: number) => string;
    mockSafety: string;
    liveSafety: string;
    statusLoading: (count: number) => string;
    statusSuccess: (count: number) => string;
    statusError: string;
    invalidForm: string;
    requestFailed: string;
    requestTooLarge: string;
    invalidJson: string;
    invalidInput: string;
    liveDisabled: string;
    apiKeyMissing: string;
    modelRefusal: string;
    liveAnalysisFailed: string;
    unknownApiError: string;
    requestTimeout: string;
    networkError: string;
    storageTitle: string;
    storageRestored: (date: string) => string;
    storageLegacyRestored: (date: string) => string;
    storageMigrationRequired: string;
    storageCorrupt: string;
    storageFutureVersion: string;
    storageUnavailable: string;
    storageEmpty: string;
    storageSaved: string;
    storageInvalid: string;
    storageWriteFailed: string;
    storageDeleted: string;
    storageDeleteFailed: string;
    storagePlaintextReminder: string;
    restoreRecent: string;
    clearRecent: string;
    emptyEyebrow: string;
    emptyTitle: string;
    emptyDescription: string;
    loadingTitle: string;
    loadingDescription: (count: number) => string;
    errorTitle: string;
    invalidSettingsForRecalculation: string;
    allocationPriorityNotice: (task: string, priority: string) => string;
    allocationSettingsNotice: (budget: number, strategy: string) => string;
    allocationBudgetPendingNotice: (budget: number) => string;
    allocationResultChanged: string;
    allocationResultUnchanged: string;
    allocationDismiss: string;
    allocationProviderNotice: (provider: string) => string;
    footerClaim: string;
    footerBoundary: string;
  };
  taskEditor: {
    eyebrow: string;
    title: string;
    maxTasksHelp: (max: number) => string;
    priorityHelp: string;
    loadSample: (count: number) => string;
    taskLegend: (index: number) => string;
    taskLabel: (index: number) => string;
    remove: string;
    removeAriaLabel: (name: string) => string;
    nameLabel: string;
    namePlaceholder: string;
    nameRequired: string;
    priorityLabel: string;
    deadlineLabel: string;
    deadlineHelp: string;
    failureImpactLabel: string;
    failureImpactHelp: string;
    settingsHelp: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    descriptionRequired: string;
    addTask: string;
    maximumReached: (max: number) => string;
    characterCounter: (current: number, max: number) => string;
  };
  budgetSettings: {
    eyebrow: string;
    title: string;
    budgetLabel: string;
    budgetHelp: string;
    budgetError: string;
    deadlineLabel: string;
    deadlineUnit: string;
    deadlineHelp: string;
    deadlineError: string;
    strategyLegend: string;
    strategies: Record<PlanningStrategy, { label: string; description: string }>;
  };
  analysisResults: {
    eyebrow: string;
    title: string;
    referenceEyebrow: string;
    referenceTitle: string;
    referenceNotice: string;
    aiAnalyzed: string;
    programCalculated: string;
    budget: string;
    lowUsageLabel: string;
    expectedUsageLabel: string;
    highUsageLabel: string;
    lowDetail: string;
    expectedDetail: (
      utilization: string,
      active: number,
      held: number,
      infeasible: number,
    ) => string;
    highWithinBudget: string;
    highRisk: string;
    reviewItems: string;
    expectedBudgetUnresolved: string;
    heldWarning: (count: number) => string;
    infeasibleWarning: (count: number) => string;
    legacyInfeasibleWarning: (count: number) => string;
    limitReassignedWarning: (count: number) => string;
    downgradedWarning: (count: number) => string;
    highBudgetWarning: string;
    oneDayDeadlineWarning: string;
    allScenariosWithinBudget: string;
    allocationTitle: string;
    referenceAllocationTitle: string;
    allocationSummary: (
      active: number,
      held: number,
      infeasible: number,
      remaining: string,
    ) => string;
    taskNumber: (index: number) => string;
    onHoldBadge: string;
    infeasibleBadge: string;
    budgetAdjustedBadge: string;
    limitAdjustedBadge: string;
    heldTitle: string;
    heldReason: (minimum: string) => string;
    infeasibleTitle: string;
    infeasibleReason: (reasons: string) => string;
    legacyInfeasibleReason: (reasons: string) => string;
    eligibilityVerificationPending: string;
    excludedOfferingsTitle: string;
    excludedOfferingsReason: (reasons: string) => string;
    assignedModel: string;
    assignedTier: string;
    recommendationTrail: (recommended: string, target: string) => string;
    referenceAssignedModel: string;
    referenceAssignedTier: string;
    referenceTrail: (analyzed: string, target: string) => string;
    expectedInput: string;
    expectedOutput: string;
    iterations: (count: number) => string;
    uncertainty: string;
    taskType: string;
    complexity: string;
    reasoning: string;
    sizeBand: string;
    workMode: string;
    minimumQuality: string;
    requiredCapabilities: string;
    failureRisk: string;
    risks: string;
    generatedRuleBased: (date: string) => string;
    referenceGeneratedRuleBased: (date: string) => string;
  };
  costChart: {
    title: (provider: string) => string;
    heldAllocation: string;
    infeasibleAllocation: string;
    expectedCostAria: (task: string, amount: string) => string;
  };
  export: {
    copyMarkdown: string;
    exportJson: string;
    includesDescriptions: string;
    markdownCopied: string;
    markdownCopyFailed: string;
    jsonReady: string;
    jsonFailed: string;
  };
  providerComparison: {
    eyebrow: string;
    title: string;
    analysisExplanation: Record<AnalysisMode, string>;
    scopeTitle: string;
    heuristicNotice: string;
    noQualityRanking: string;
    standardPricingNotice: string;
    activeOnlyNotice: string;
    eligibilityScopeNotice: string;
    selectorLegend: string;
    allWorkFits: string;
    fitsWithHolds: string;
    infeasibleOfferings: string;
    checkedConstraintsFit: string;
    checkedConstraintsWithHolds: string;
    checkedConstraintsInfeasible: string;
    outsideBudget: string;
    highExceeds: string;
    activeHeld: (active: number, held: number, infeasible: number) => string;
    selectedPlan: string;
    selectPlan: string;
    previewModels: (count: number) => string;
    priceEffectiveThrough: (model: string, date: string) => string;
    standardPriceInputLimit: (model: string, limit: string) => string;
  };
  providerPricing: {
    summary: string;
    introduction: (basis: string) => string;
    tableCaption: string;
    providerColumn: string;
    tierColumn: string;
    modelColumn: string;
    inputColumn: string;
    outputColumn: string;
    conditionsColumn: string;
    standardPrice: string;
    preview: string;
    priceThrough: (date: string) => string;
    priceFrom: (date: string, input: number, output: number) => string;
    inputLimit: (limit: string) => string;
    maxInputLimit: (limit: string) => string;
    maxOutputLimit: (limit: string) => string;
    maxCombinedLimit: (limit: string) => string;
    longContextExcluded: (input: number, output: number) => string;
    scrollHint: string;
    excludedTitle: string;
    excludedLongContextExplanation: string;
    sourcesTitle: string;
    exclusions: Record<
      "cache-discounts-and-writes" | "batch-pricing" | "tool-call-fees" | "long-context-surcharges",
      string
    >;
  };
  enums: UiEnumLabels;
}

const ko: UiCopy = {
  common: {
    productName: "Frontier Workload Planner",
    language: "언어",
    languageSelectorHelp: "화면에 표시할 언어를 선택합니다.",
    selected: "선택됨",
    select: "선택",
    required: "필수",
    optional: "선택",
    defaultValue: "기본값 있음",
    active: "실행",
    held: "보류",
    none: "없음",
    officialPricingSource: "공식 가격 출처",
    officialModelsSource: "공식 모델 출처",
    verifiedAt: (date) => `${date} 확인`,
    usdPerMillionTokens: "USD per 1M tokens",
  },
  page: {
    headerSubtitle: "설명 가능한 예산 중심 계획",
    headerBadge: "예시로 체험 가능 · 브라우저 저장",
    heroEyebrow: "설명 · 분류 · 계산 · 배분",
    heroTitleLine1: "여러 작업을 하나의 요청으로 분석하고,",
    heroTitleLine2: "예산 안에서 모델 제품군을 비교합니다.",
    heroDescription:
      "GPT-5.6은 작업 설명에서 난이도·규모·필요 기능 등을 정리합니다. 가격, 공급자, 최종 이용 방법은 GPT가 고르지 않습니다. 프로그램이 공개된 규칙과 가격표로 호출 한도, 토큰, 비용과 예산 계획을 계산합니다.",
    analysisModeLegend: "3단계 · 계획을 만드는 방식",
    mockDescription: "서버 전송 없이 이 브라우저에서 예시 결과로 체험",
    liveDescription: "입력한 작업을 GPT-5.6으로 분석",
    storageDisclosure:
      "계획을 만들면 작업명·설명, 계획 설정, 버전이 기록된 작업 분석, 기준 공급자 선택, 입력한 구독·가격 수정 정보가 저장 기록을 삭제할 때까지 이 브라우저에 평문(암호화되지 않은 글)으로 자동 저장됩니다. 계산된 이용 경로와 비용은 저장하지 않고 복원할 때 다시 계산합니다. API 키는 저장하지 않습니다.",
    submitMock: "예시 계획 만들기",
    submitLive: "내 작업으로 계획 만들기",
    submitting: (count) => `${count}개 작업 분석 중…`,
    mockSafety: "예시 분석은 이 브라우저 안에서만 실행되며 작업명과 설명을 사이트 서버나 외부 AI로 보내지 않습니다. 입력 내용은 위 안내대로 브라우저에 저장될 수 있으니 샘플 작업을 이용해 주세요.",
    liveSafety: "내 작업 분석을 선택하면 작업명과 설명이 OpenAI로 전송됩니다. 요청은 store:false 설정으로 응답 상태 저장을 끄지만, 이 설정이 보안·악용 모니터링 기록까지 없애지는 않습니다. 해당 기록은 기본적으로 최대 30일 보관되며 법적 의무나 위해 방지를 위해 더 길어질 수 있습니다. API 입력은 기본적으로 모델 학습에 사용되지 않습니다. 민감정보는 입력하지 마세요. API 키는 브라우저로 보내지지 않습니다.",
    statusLoading: (count) => `${count}개 작업을 분석하고 있습니다.`,
    statusSuccess: (count) => `${count}개 작업 분석이 완료되었습니다.`,
    statusError: "분석 요청을 완료하지 못했습니다.",
    invalidForm: "모든 작업과 계획 설정을 확인해 주세요.",
    requestFailed: "분석 요청에 실패했습니다.",
    requestTooLarge: "요청 내용이 허용 크기를 초과했습니다.",
    invalidJson: "분석 요청 형식이 올바르지 않습니다.",
    invalidInput: "작업 입력을 확인해 주세요.",
    liveDisabled: "실제 분석이 서버 설정에서 비활성화되어 있습니다. 예시 계획은 계속 사용할 수 있습니다.",
    apiKeyMissing: "서버에 OpenAI API 키가 설정되지 않았습니다. 예시 계획은 계속 사용할 수 있습니다.",
    modelRefusal: "모델이 이 작업 분석을 거부했습니다. 입력을 조정하거나 예시 계획을 사용해 주세요.",
    liveAnalysisFailed: "실제 분석에 실패했습니다. 잠시 후 다시 시도하거나 예시 계획을 사용해 주세요.",
    unknownApiError: "분석 요청을 처리하지 못했습니다.",
    requestTimeout: "분석 시간이 초과되었습니다. 예시 계획을 사용하거나 잠시 후 다시 시도해 주세요.",
    networkError: "서비스에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
    storageTitle: "최근 저장한 계획",
    storageRestored: (date) => `${date}에 저장된 최근 계획을 복원했습니다.`,
    storageLegacyRestored: (date) =>
      `${date}의 기존 API 계획을 복원했습니다. 새 맞춤 계획을 만들려면 예시 또는 실제 분석을 다시 실행하세요.`,
    storageMigrationRequired:
      "기존 저장 기록은 보존했지만 자동 변환하지 못했습니다. 기록을 삭제하거나 새 분석을 실행할 수 있습니다.",
    storageCorrupt: "손상된 최근 저장 기록을 무시했습니다.",
    storageFutureVersion: "다른 버전에서 만든 저장 기록은 자동 복원하지 않았습니다.",
    storageUnavailable: "이 브라우저에서는 최근 계획 저장소를 사용할 수 없습니다.",
    storageEmpty: "복원할 최근 계획이 아직 없습니다.",
    storageSaved: "이 계획을 최근 계획으로 브라우저에 저장했습니다.",
    storageInvalid: "저장할 계획의 형식이 맞지 않습니다.",
    storageWriteFailed: "브라우저 저장소에 최근 계획을 저장하지 못했습니다.",
    storageDeleted: "브라우저의 최근 저장 기록을 삭제했습니다.",
    storageDeleteFailed: "브라우저 저장 기록을 삭제하지 못했습니다.",
    storagePlaintextReminder: "작업 설명은 저장 기록을 삭제할 때까지 이 브라우저에 평문으로 유지되며 API 키는 저장하지 않습니다.",
    restoreRecent: "최근 저장본 복원",
    clearRecent: "저장 기록 삭제",
    emptyEyebrow: "계획 미리보기",
    emptyTitle: "계획 결과가 여기에 표시됩니다.",
    emptyDescription: "작업과 설정을 입력한 뒤 예시 계획 또는 내 작업 계획을 만들어 주세요.",
    loadingTitle: "작업을 분석하고 비용 계획을 만들고 있습니다.",
    loadingDescription: (count) => `${count}개 작업을 함께 분석한 뒤 같은 기준으로 비용을 계산합니다.`,
    errorTitle: "분석을 완료하지 못했습니다.",
    invalidSettingsForRecalculation: "유효한 예산과 참고 기간을 입력하면 기존 분석으로 즉시 다시 계산합니다.",
    allocationPriorityNotice: (task, priority) =>
      `${task} 우선순위를 ${priority}로 바꾸고 계획을 다시 계산했습니다.`,
    allocationSettingsNotice: (budget, strategy) =>
      `예산 ${budget} USD와 ${strategy} 전략을 반영해 계획을 다시 계산했습니다.`,
    allocationBudgetPendingNotice: (budget) =>
      `예산을 ${budget} USD로 변경했습니다. 새 금액을 다시 확인하면 추천을 계산합니다.`,
    allocationResultChanged: "추천 경로 또는 예상 비용이 이전 결과와 달라졌습니다.",
    allocationResultUnchanged: "계산은 완료됐으며 추천 경로와 예상 비용은 이전 결과와 같습니다.",
    allocationDismiss: "계획 업데이트 안내 닫기",
    allocationProviderNotice: (provider) =>
      `${provider} 제품군 가격을 반영해 계획을 다시 계산했습니다.`,
    footerClaim: "예산을 고려한 추천 · 가장 낮은 비용을 보장하지 않음",
    footerBoundary: "최근 계획 1개 저장 · AI 분석과 비용 계산은 분리",
  },
  taskEditor: {
    eyebrow: "1단계",
    title: "하려는 작업을 적어주세요",
    maxTasksHelp: (max) => `한 번에 최대 ${max}개까지 계획할 수 있습니다.`,
    priorityHelp: "우선순위가 높은 작업부터 남은 구독 한도와 예산을 배정합니다. GPT의 작업 분석에는 영향을 주지 않습니다.",
    loadSample: (count) => `샘플 ${count}개 불러오기`,
    taskLegend: (index) => `작업 ${index}`,
    taskLabel: (index) => `작업 ${index}`,
    remove: "삭제",
    removeAriaLabel: (name) => `${name} 삭제`,
    nameLabel: "작업명",
    namePlaceholder: "예: 고객 지원 대시보드 API 설계",
    nameRequired: "작업명을 입력해 주세요.",
    priorityLabel: "우선순위",
    deadlineLabel: "작업 기한",
    deadlineHelp: "빠른 기한을 먼저 고려하며, 분석된 실패 위험이 높으면 상위 등급 검토 조건에도 반영됩니다. 전체 계획의 참고 기간과는 별개입니다.",
    failureImpactLabel: "실패 영향",
    failureImpactHelp: "실패했을 때의 결과를 사용자가 정합니다. 한도 배정 순서와 상위 등급 검토에 쓰이며, GPT의 실패 가능성과는 별개입니다.",
    settingsHelp: "우선순위가 높고 기한이 빠르며 실패 영향이 큰 작업부터 제한된 한도와 예산을 배정합니다. 기한·실패 영향은 분석된 위험과 함께 상위 등급 검토 조건이 될 수 있습니다.",
    descriptionLabel: "작업 설명",
    descriptionPlaceholder: "목표, 산출물, 제약, 품질 기준을 구체적으로 적어 주세요.",
    descriptionRequired: "작업 설명을 입력해 주세요.",
    addTask: "작업 추가",
    maximumReached: (max) => `최대 ${max}개 작업`,
    characterCounter: (current, max) => `${current} / ${max}`,
  },
  budgetSettings: {
    eyebrow: "2단계",
    title: "예산과 선택 기준",
    budgetLabel: "전체 예산 (USD)",
    budgetHelp: "보통 사용 비용을 기준으로 등급을 조정합니다.",
    budgetError: "$0.01~$10,000 사이의 예산을 입력해 주세요.",
    deadlineLabel: "참고 기간 (일)",
    deadlineUnit: "일",
    deadlineHelp: "비용과 등급에는 영향을 주지 않습니다.",
    deadlineError: "1~90 사이의 정수를 입력해 주세요.",
    strategyLegend: "무엇을 우선할까요?",
    strategies: {
      "cost-saver": { label: "비용 절감", description: "조건을 만족하는 저렴한 선택부터 검토합니다." },
      balanced: { label: "균형", description: "비용과 필요한 품질을 함께 고려합니다." },
      "quality-first": { label: "상위 등급도 검토", description: "예산 안에서 한 단계 높은 선택도 함께 검토합니다." },
    },
  },
  analysisResults: {
    eyebrow: "예산 중심 추천 계획",
    title: "비용과 모델 배분 결과",
    referenceEyebrow: "검증 전 참고 비용",
    referenceTitle: "API 가격과 토큰 한도 기준 결과",
    referenceNotice: "아래 값은 API 가격과 토큰 한도만으로 만든 참고 비용입니다. 화면의 ‘실행’은 비용 계산에 포함했다는 뜻이며, 실제 이용 가능이나 확정 추천을 뜻하지 않습니다. 이 결과는 위 확정 계획의 비용·예산 판정에 포함되지 않습니다.",
    aiAnalyzed: "AI 분석",
    programCalculated: "프로그램 계산",
    budget: "예산",
    lowUsageLabel: "적게 사용",
    expectedUsageLabel: "보통 사용",
    highUsageLabel: "많이 사용",
    lowDetail: "낮은 토큰·반복 가정",
    expectedDetail: (utilization, active, held, infeasible) =>
      `예산 사용 ${utilization}% · 실행 ${active} / 보류 ${held} / 실행 불가 ${infeasible}`,
    highWithinBudget: "예산 범위",
    highRisk: "예산 초과 위험",
    reviewItems: "계획 확인 사항",
    expectedBudgetUnresolved: "실행할 작업의 보통 사용 비용을 예산 안으로 조정하지 못했습니다.",
    heldWarning: (count) => `${count}개 작업을 예산 부족으로 보류했습니다. 보류 작업 비용은 합계에서 제외됩니다.`,
    infeasibleWarning: (count) =>
      `${count}개 작업은 최소 품질과 호출 한도를 함께 만족하는 모델이 없어 실행 불가입니다. 비용 합계와 예산 적합 판정에서 제외됩니다.`,
    legacyInfeasibleWarning: (count) =>
      `${count}개 기존 분석 작업은 적게·보통·많이 사용하는 세 경우의 호출 한도를 모두 지원하는 모델이 없어 실행할 수 없습니다. 비용 합계와 예산 판단에서 제외합니다.`,
    limitReassignedWarning: (count) =>
      `${count}개 작업을 세 사용량 경우의 호출 한도를 모두 지원하는 등급으로 다시 배정했습니다.`,
    downgradedWarning: (count) => `${count}개 작업의 등급을 예산에 맞춰 낮췄습니다.`,
    highBudgetWarning: "많이 사용하는 경우 비용이 예산을 초과합니다.",
    oneDayDeadlineWarning: "1일 기한은 참고 정보이며 이 버전은 정교한 시간 예측을 제공하지 않습니다.",
    allScenariosWithinBudget: "실행할 모든 작업이 보통 또는 많이 사용하는 경우에도 입력 예산 안에 있습니다.",
    allocationTitle: "작업별 배분",
    referenceAllocationTitle: "작업별 참고 비용 배분",
    allocationSummary: (active, held, infeasible, remaining) =>
      `실행 ${active} · 보류 ${held} · 실행 불가 ${infeasible} · 보통 사용 기준 남은 예산 ${remaining}`,
    taskNumber: (index) => `작업 ${index}`,
    onHoldBadge: "보류",
    infeasibleBadge: "실행 불가",
    budgetAdjustedBadge: "예산 조정",
    limitAdjustedBadge: "호출 한도 재배정",
    heldTitle: "이번 계획의 실행 대상에서 제외됨",
    heldReason: (minimum) =>
      `현재 확인한 조건에서 전체 작업의 보통 사용 최소비용이 예산을 넘어 낮은 우선순위부터 보류했습니다. 이 작업에 필요한 보통 사용 최소 금액은 ${minimum}입니다.`,
    infeasibleTitle: "확인한 조건을 만족하는 모델 없음",
    infeasibleReason: (reasons) =>
      `최소 품질을 충족하는 어떤 등급도 적게·보통·많이 사용하는 세 경우의 호출을 모두 지원하지 않습니다. 작업을 자동으로 나누거나 내용을 잘라내지는 않았습니다. 이유: ${reasons}`,
    legacyInfeasibleReason: (reasons) =>
      `어떤 등급도 세 사용량 경우의 호출을 모두 지원하지 않습니다. 이 기존 분석에는 최소 품질 기준을 적용하지 않았고, 작업을 자동으로 나누거나 내용을 잘라내지도 않았습니다. 이유: ${reasons}`,
    eligibilityVerificationPending:
      "이 참고 비용 화면은 표준 API 가격, 최소 품질 등급, 세 사용량 경우의 호출 한도와 입력 예산만 비교합니다. 작업 방식과 필수 기능 충족 여부는 위 맞춤 계획에서 별도로 확인합니다.",
    excludedOfferingsTitle: "호출 한도로 제외된 모델",
    excludedOfferingsReason: (reasons) =>
      `아래 모델은 세 사용량 경우 중 하나 이상을 지원하지 않아 후보에서 제외했습니다. 이유: ${reasons}`,
    assignedModel: "배정 모델",
    assignedTier: "배정 등급",
    recommendationTrail: (recommended, target) => `GPT 권장 ${recommended} · 전략 목표 ${target}`,
    referenceAssignedModel: "참고 모델",
    referenceAssignedTier: "참고 등급",
    referenceTrail: (analyzed, target) => `분석 기준 ${analyzed} · 비용 계획 기준 ${target}`,
    expectedInput: "보통 사용 입력 합계",
    expectedOutput: "보통 사용 출력 합계",
    iterations: (count) => `반복 ${count}회`,
    uncertainty: "불확실성",
    taskType: "작업 유형",
    complexity: "복잡도",
    reasoning: "추론",
    sizeBand: "크기 구간",
    workMode: "작업 모드",
    minimumQuality: "최소 품질",
    requiredCapabilities: "필수 기능",
    failureRisk: "실패 가능성",
    risks: "위험 요인",
    generatedRuleBased: (date) => `${date} · 규칙 기반 추천이며 수학적 최적화를 의미하지 않습니다.`,
    referenceGeneratedRuleBased: (date) => `${date} · 가격과 토큰 한도만 적용한 참고 계산입니다.`,
  },
  costChart: {
    title: (provider) => `${provider} 작업별 보통 사용 비용`,
    heldAllocation: "보류 · $0 배정",
    infeasibleAllocation: "실행 불가 · 비용 제외",
    expectedCostAria: (task, amount) => `${task} 보통 사용 비용 ${amount}`,
  },
  export: {
    copyMarkdown: "Markdown 복사",
    exportJson: "JSON 내보내기",
    includesDescriptions: "복사본과 JSON 파일에는 작업 설명이 포함됩니다.",
    markdownCopied: "Markdown을 클립보드에 복사했습니다.",
    markdownCopyFailed: "Markdown 복사에 실패했습니다. 클립보드 권한을 확인해 주세요.",
    jsonReady: "JSON 내보내기를 준비했습니다.",
    jsonFailed: "JSON 내보내기에 실패했습니다.",
  },
  providerComparison: {
    eyebrow: "공급자 비교",
    title: "제품군별 예산 계획 비교",
    analysisExplanation: {
      mock: "저장된 예시 분석을 사용하고, 프로그램이 같은 내용에 공급자별 가격을 적용합니다. Claude와 Gemini API는 호출하지 않습니다.",
      live: "GPT-5.6이 작업을 한 번만 분석하고, 프로그램이 같은 분석에 공급자별 가격을 적용합니다. Claude와 Gemini API는 호출하지 않습니다.",
    },
    scopeTitle: "비교 범위와 해석",
    heuristicNotice: "절약형 / 균형형 / 고성능 등급 연결은 예산 계획을 위한 단순 규칙입니다.",
    noQualityRanking: "객관적 품질 동등성, 우열 또는 ‘최고 모델’을 뜻하지 않습니다. 제품명은 공개 항목을 식별하기 위한 것이며 제휴·후원을 의미하지 않습니다.",
    standardPricingNotice: "캐시를 사용하지 않는 표준 텍스트 가격만 적용하며, 캐시·일괄 처리·도구 호출비·긴 문맥 할증은 제외합니다.",
    activeOnlyNotice: "비용은 배분 후 실행 작업만 합산하며 보류·실행 불가 작업은 포함하지 않습니다.",
    eligibilityScopeNotice: "이 참고 비교는 가격, 최소 품질 등급, 호출 한도와 예산만 확인합니다. 작업 방식·필수 기능·확정 이용 방법은 위 맞춤 계획에서 별도로 판단합니다.",
    selectorLegend: "상세 계획에 사용할 모델 제품군 선택",
    allWorkFits: "전체 작업 적합",
    fitsWithHolds: "보류 포함 적합",
    infeasibleOfferings: "호환 모델 없음",
    checkedConstraintsFit: "확인 범위 내 적합",
    checkedConstraintsWithHolds: "확인 범위 · 일부 보류",
    checkedConstraintsInfeasible: "확인 범위 내 실행 불가",
    outsideBudget: "예산 밖",
    highExceeds: "예산 초과",
    activeHeld: (active, held, infeasible) =>
      `실행 ${active} · 보류 ${held} · 실행 불가 ${infeasible}`,
    selectedPlan: "상세 계획 선택됨",
    selectPlan: "상세 계획으로 선택",
    previewModels: (count) => `미리보기 모델 ${count}개`,
    priceEffectiveThrough: (model, date) => `${model} 단가 ${date}까지`,
    standardPriceInputLimit: (model, limit) => `${model} 표준 단가 입력 ${limit} 이하`,
  },
  providerPricing: {
    summary: "공급자 가격표와 비교 가정 보기",
    introduction: () =>
      "가격 단위는 토큰 100만 개당 USD입니다. 캐시 할인이 없는 일반 텍스트 사용 기준이며, 등급은 객관적인 품질 순위가 아닙니다.",
    tableCaption: "공급자별 9개 모델의 캐시 미사용 표준 텍스트 입력·출력 가격",
    providerColumn: "공급자",
    tierColumn: "등급",
    modelColumn: "모델",
    inputColumn: "입력 / 1M",
    outputColumn: "출력 / 1M",
    conditionsColumn: "상태·가격 조건",
    standardPrice: "표준 단가",
    preview: "미리보기",
    priceThrough: (date) => `표시 단가 ${date}까지`,
    priceFrom: (date, input, output) => `${date}부터 입력 $${input} / 출력 $${output}`,
    inputLimit: (limit) => `표준 단가 입력 ${limit} 이하`,
    maxInputLimit: (limit) => `호출당 입력 최대 ${limit}`,
    maxOutputLimit: (limit) => `호출당 출력 최대 ${limit}`,
    maxCombinedLimit: (limit) => `호출당 입력+출력 최대 ${limit}`,
    longContextExcluded: (input, output) =>
      `장문 입력 $${input} / 출력 $${output} 단가는 비교에서 제외`,
    scrollHint: "가격표는 좌우로 스크롤할 수 있습니다.",
    excludedTitle: "비교에서 제외",
    excludedLongContextExplanation:
      "Gemini 3.1 Pro의 200K 초과 장문 단가는 기록만 하고 비교 계산에는 적용하지 않습니다.",
    sourcesTitle: "공식 출처와 확인일",
    exclusions: {
      "cache-discounts-and-writes": "캐시 할인·쓰기 단가",
      "batch-pricing": "일괄 처리(Batch) 가격",
      "tool-call-fees": "도구 호출비",
      "long-context-surcharges": "장문 구간 할증",
    },
  },
  enums: {
    analysisMode: { mock: "예시로 먼저 보기", live: "내 작업 분석" },
    taskType: {
      "software-development": "소프트웨어 개발",
      research: "리서치",
      writing: "글쓰기",
      "data-analysis": "데이터 분석",
      planning: "기획",
      creative: "창작",
      multimodal: "멀티모달",
      other: "기타",
    },
    complexity: { low: "낮음", medium: "보통", high: "높음", "very-high": "매우 높음" },
    reasoningDepth: { light: "가벼움", moderate: "보통", deep: "깊음" },
    sizeBand: { xs: "XS", s: "S", m: "M", l: "L", xl: "XL" },
    uncertainty: { low: "낮음", medium: "보통", high: "높음" },
    modelTier: { economy: "절약형", balanced: "균형형", frontier: "고성능" },
    provider: { openai: "OpenAI · GPT-5.6", anthropic: "Anthropic · Claude", google: "Google · Gemini 3" },
    strategy: { "cost-saver": "비용 절감", balanced: "균형", "quality-first": "상위 등급도 검토" },
    priority: { high: "높음", medium: "보통", low: "낮음" },
    failureImpact: { high: "높음", medium: "보통", low: "낮음", unspecified: "미지정" },
    allocationStatus: { active: "실행", held: "보류", infeasible: "실행 불가" },
    invocationFailure: {
      "input-limit-exceeded": "입력 한도 초과",
      "output-limit-exceeded": "출력 한도 초과",
      "context-limit-exceeded": "컨텍스트 한도 초과",
    },
  },
};

const en: UiCopy = {
  common: {
    productName: "Frontier Workload Planner",
    language: "Language",
    languageSelectorHelp: "Choose the language used in the interface.",
    selected: "Selected",
    select: "Select",
    required: "Required",
    optional: "Optional",
    defaultValue: "Default set",
    active: "Active",
    held: "On hold",
    none: "None",
    officialPricingSource: "Official pricing source",
    officialModelsSource: "Official model source",
    verifiedAt: (date) => `Verified ${date}`,
    usdPerMillionTokens: "USD per 1M tokens",
  },
  page: {
    headerSubtitle: "Explainable, budget-aware planning",
    headerBadge: "Try a sample · saved in your browser",
    heroEyebrow: "Describe · classify · calculate · allocate",
    heroTitleLine1: "Analyze multiple tasks in one request,",
    heroTitleLine2: "then compare model families within budget.",
    heroDescription:
      "GPT-5.6 organizes details such as difficulty, size, and required features from your task descriptions. GPT does not choose prices, providers, or the final way to use a model. The program calculates limits, tokens, costs, and budget plans from published rules and price lists.",
    analysisModeLegend: "Step 3 · How to create the plan",
    mockDescription: "Create a sample in this browser without sending it to a server",
    liveDescription: "Analyze your tasks with GPT-5.6",
    storageDisclosure:
      "When you create a plan, task names and descriptions, planning settings, the versioned workload analysis, the reference-provider choice, and your subscription and price-override inputs are automatically saved as unencrypted plaintext in this browser until you delete the saved plan. Calculated routes and costs are not stored; they are recalculated on restore. The API key is never stored.",
    submitMock: "Create a sample plan",
    submitLive: "Create a plan from my tasks",
    submitting: (count) => `Analyzing ${count} task${count === 1 ? "" : "s"}…`,
    mockSafety: "Sample analysis runs only in this browser and does not send task names or descriptions to the site server or an external AI. Input may still be saved in this browser as disclosed above, so use the sample tasks.",
    liveSafety: "When you analyze your own tasks, task names and descriptions are sent to OpenAI. The request uses store:false to disable response application-state storage, but this does not disable security and abuse-monitoring logs. Those logs are normally retained for up to 30 days and may be kept longer when legally required or reasonably necessary to prevent harm. API inputs are not used for model training by default. Do not enter sensitive information. The API key is never sent to the browser.",
    statusLoading: (count) => `Analyzing ${count} task${count === 1 ? "" : "s"}.`,
    statusSuccess: (count) => `Analysis complete for ${count} task${count === 1 ? "" : "s"}.`,
    statusError: "The analysis request could not be completed.",
    invalidForm: "Check every task and planning setting.",
    requestFailed: "The analysis request failed.",
    requestTooLarge: "The request exceeded the allowed size.",
    invalidJson: "The analysis request format was invalid.",
    invalidInput: "Check the task input.",
    liveDisabled: "Real analysis is disabled by the server configuration. A sample plan remains available.",
    apiKeyMissing: "The server does not have an OpenAI API key. A sample plan remains available.",
    modelRefusal: "The model declined this analysis. Adjust the input or use a sample plan.",
    liveAnalysisFailed: "Real analysis failed. Try again shortly or use a sample plan.",
    unknownApiError: "The analysis request could not be processed.",
    requestTimeout: "The analysis timed out. Use a sample plan or try again shortly.",
    networkError: "Could not reach the service. Check your internet connection and try again.",
    storageTitle: "Recently saved plan",
    storageRestored: (date) => `Restored the recent plan saved at ${date}.`,
    storageLegacyRestored: (date) =>
      `Restored the legacy API plan saved at ${date}. Run a sample or real analysis to create a new tailored plan.`,
    storageMigrationRequired:
      "The legacy record was preserved but could not be migrated automatically. You can delete it or run a new analysis.",
    storageCorrupt: "Ignored a damaged saved plan.",
    storageFutureVersion: "A plan saved by another version was not restored automatically.",
    storageUnavailable: "Saved-plan storage is unavailable in this browser.",
    storageEmpty: "There is no recent plan to restore yet.",
    storageSaved: "Saved this as the recent plan in this browser.",
    storageInvalid: "The plan format did not match, so it was not saved.",
    storageWriteFailed: "Could not save the recent plan in browser storage.",
    storageDeleted: "Deleted the saved plan from this browser.",
    storageDeleteFailed: "Could not delete the browser record.",
    storagePlaintextReminder: "Task descriptions remain as plaintext in this browser until you delete the saved plan. The API key is not stored.",
    restoreRecent: "Restore recent plan",
    clearRecent: "Delete saved plan",
    emptyEyebrow: "Plan preview",
    emptyTitle: "Your plan results will appear here.",
    emptyDescription: "Enter tasks and settings, then create a sample plan or a plan from your tasks.",
    loadingTitle: "Analyzing the tasks and building a cost plan.",
    loadingDescription: (count) =>
      `Analyzing ${count} task${count === 1 ? "" : "s"} together, then calculating costs with the same rules.`,
    errorTitle: "Analysis could not be completed.",
    invalidSettingsForRecalculation: "Enter a valid budget and reference period to recalculate from the existing analysis.",
    allocationPriorityNotice: (task, priority) =>
      `Changed ${task} to ${priority} and reallocated without another API request.`,
    allocationSettingsNotice: (budget, strategy) =>
      `Applied the ${budget} USD budget and ${strategy} strategy without another API request.`,
    allocationBudgetPendingNotice: (budget) =>
      `Changed the budget to ${budget} USD. Confirm the new amount to recalculate the recommendations.`,
    allocationResultChanged: "The recommended route or estimated cost changed from the previous result.",
    allocationResultUnchanged: "Recalculation is complete. The recommended routes and estimated costs are unchanged.",
    allocationDismiss: "Dismiss plan update",
    allocationProviderNotice: (provider) =>
      `Recalculated with ${provider} family pricing without another API request.`,
    footerClaim: "Budget-aware recommendation · lowest cost is not guaranteed",
    footerBoundary: "One recent plan saved · AI analysis and cost calculation stay separate",
  },
  taskEditor: {
    eyebrow: "Step 1",
    title: "Describe what you want to do",
    maxTasksHelp: (max) => `Plan up to ${max} tasks at once.`,
    priorityHelp: "Tasks with higher priority receive the remaining subscription capacity and budget first. Priority does not change GPT's task analysis.",
    loadSample: (count) => `Load ${count} sample tasks`,
    taskLegend: (index) => `Task ${index}`,
    taskLabel: (index) => `Task ${index}`,
    remove: "Remove",
    removeAriaLabel: (name) => `Remove ${name}`,
    nameLabel: "Task name",
    namePlaceholder: "Example: Design a customer support dashboard API",
    nameRequired: "Enter a task name.",
    priorityLabel: "Priority",
    deadlineLabel: "Task deadline",
    deadlineHelp: "Earlier dates are considered first, and a deadline can contribute to an upper-tier review when analyzed failure risk is high. It is separate from the plan's reference period.",
    failureImpactLabel: "Failure impact",
    failureImpactHelp: "You set the consequence of failure. It affects capacity order and upper-tier review, and is separate from GPT's failure likelihood.",
    settingsHelp: "Tasks with higher priority, earlier deadlines, and greater failure impact receive scarce capacity and budget first. Deadlines and failure impact can also combine with analyzed risk to trigger an upper-tier review.",
    descriptionLabel: "Task description",
    descriptionPlaceholder: "Describe the goal, deliverable, constraints, and quality bar.",
    descriptionRequired: "Enter a task description.",
    addTask: "Add task",
    maximumReached: (max) => `Maximum ${max} tasks`,
    characterCounter: (current, max) => `${current} / ${max}`,
  },
  budgetSettings: {
    eyebrow: "Step 2",
    title: "Budget and preferences",
    budgetLabel: "Total budget (USD)",
    budgetHelp: "Tiers are adjusted against the likely-use cost.",
    budgetError: "Enter a budget from $0.01 to $10,000.",
    deadlineLabel: "Reference period (days)",
    deadlineUnit: "days",
    deadlineHelp: "Does not change costs or tiers.",
    deadlineError: "Enter a whole number from 1 to 90.",
    strategyLegend: "What should the plan prioritize?",
    strategies: {
      "cost-saver": { label: "Save money", description: "Check lower-cost choices that still meet the requirements first." },
      balanced: { label: "Balanced", description: "Consider required quality and cost together." },
      "quality-first": { label: "Consider higher tiers", description: "Also consider one tier higher when the budget allows." },
    },
  },
  analysisResults: {
    eyebrow: "Budget-aware recommended plan",
    title: "Cost and model allocation",
    referenceEyebrow: "Pre-verification reference cost",
    referenceTitle: "API price and token-limit result",
    referenceNotice: "These are reference costs based only on API prices and token limits. ‘Active’ means included in this cost calculation; it does not mean confirmed access or a final recommendation. This result is excluded from the confirmed plan totals and budget assessment above.",
    aiAnalyzed: "AI analyzed",
    programCalculated: "Program calculated",
    budget: "Budget",
    lowUsageLabel: "Lower use",
    expectedUsageLabel: "Likely use",
    highUsageLabel: "Higher use",
    lowDetail: "Lower token and iteration assumptions",
    expectedDetail: (utilization, active, held, infeasible) =>
      `${utilization}% of budget · ${active} active / ${held} on hold / ${infeasible} infeasible`,
    highWithinBudget: "Within budget",
    highRisk: "Budget overrun risk",
    reviewItems: "Plan review items",
    expectedBudgetUnresolved: "The likely-use cost of active work could not be adjusted within budget.",
    heldWarning: (count) => `${count} task${count === 1 ? " was" : "s were"} put on hold for budget fit. Held-task costs are excluded from totals.`,
    infeasibleWarning: (count) =>
      `${count} task${count === 1 ? " has" : "s have"} no model meeting both the minimum-quality and invocation-limit checks and ${count === 1 ? "is" : "are"} infeasible. Infeasible costs are excluded from totals and budget-fit claims.`,
    legacyInfeasibleWarning: (count) =>
      `${count} legacy-analysis task${count === 1 ? " has" : "s have"} no model supporting the lower-, likely-, and higher-use cases and ${count === 1 ? "is" : "are"} infeasible. Those costs are excluded from totals and budget assessment.`,
    limitReassignedWarning: (count) =>
      `${count} task${count === 1 ? " was" : "s were"} reassigned to a tier that supports the lower-, likely-, and higher-use limits.`,
    downgradedWarning: (count) => `${count} task tier${count === 1 ? " was" : "s were"} lowered to fit the budget.`,
    highBudgetWarning: "The higher-use case exceeds the budget.",
    oneDayDeadlineWarning: "The one-day deadline is reference information; this version does not provide detailed time estimates.",
    allScenariosWithinBudget: "The likely- and higher-use cases for every active task are within the entered budget.",
    allocationTitle: "Task allocation",
    referenceAllocationTitle: "Reference cost allocation by task",
    allocationSummary: (active, held, infeasible, remaining) =>
      `${active} active · ${held} on hold · ${infeasible} infeasible · ${remaining} likely-use budget remaining`,
    taskNumber: (index) => `TASK ${String(index).padStart(2, "0")}`,
    onHoldBadge: "On hold",
    infeasibleBadge: "Infeasible",
    budgetAdjustedBadge: "Budget adjusted",
    limitAdjustedBadge: "Invocation-limit reassignment",
    heldTitle: "Excluded from this plan's active work",
    heldReason: (minimum) =>
      `The lowest likely-use total under the checked conditions exceeded the budget, so lower-priority work was held first. This task needs at least ${minimum} under those conditions.`,
    infeasibleTitle: "No model meets the checked constraints",
    infeasibleReason: (reasons) =>
      `No tier at or above the minimum quality supports all lower-, likely-, and higher-use cases. The planner did not truncate content or split the task. Reasons: ${reasons}`,
    legacyInfeasibleReason: (reasons) =>
      `No tier supports every lower-, likely-, and higher-use case. This legacy analysis has no minimum-quality threshold, and the planner did not truncate content or split the task. Reasons: ${reasons}`,
    eligibilityVerificationPending:
      "This reference cost view compares only standard API prices, the minimum-quality tier, the three usage cases, and the entered budget. Work mode and required capabilities are checked separately in the plan above.",
    excludedOfferingsTitle: "Models excluded by invocation limits",
    excludedOfferingsReason: (reasons) =>
      `The models below fail at least one of the three usage cases and were excluded. Reasons: ${reasons}`,
    assignedModel: "Assigned model",
    assignedTier: "Assigned tier",
    recommendationTrail: (recommended, target) => `GPT recommendation ${recommended} · strategy target ${target}`,
    referenceAssignedModel: "Reference model",
    referenceAssignedTier: "Reference tier",
    referenceTrail: (analyzed, target) => `Analysis basis ${analyzed} · cost-plan basis ${target}`,
    expectedInput: "Likely-use total input",
    expectedOutput: "Likely-use total output",
    iterations: (count) => `${count} iteration${count === 1 ? "" : "s"}`,
    uncertainty: "Uncertainty",
    taskType: "Task type",
    complexity: "Complexity",
    reasoning: "Reasoning",
    sizeBand: "Size bands",
    workMode: "Work mode",
    minimumQuality: "Minimum quality",
    requiredCapabilities: "Required capabilities",
    failureRisk: "Failure risk",
    risks: "Risk factors",
    generatedRuleBased: (date) => `${date} · Rule-based recommendation, not mathematical optimization.`,
    referenceGeneratedRuleBased: (date) => `${date} · Reference calculation using prices and token limits only.`,
  },
  costChart: {
    title: (provider) => `${provider} likely-use cost by task`,
    heldAllocation: "On hold · $0 allocated",
    infeasibleAllocation: "Infeasible · cost excluded",
    expectedCostAria: (task, amount) => `${task} likely-use cost ${amount}`,
  },
  export: {
    copyMarkdown: "Copy Markdown",
    exportJson: "Export JSON",
    includesDescriptions: "The copied Markdown and JSON file include task descriptions.",
    markdownCopied: "Copied the Markdown to the clipboard.",
    markdownCopyFailed: "Could not copy Markdown. Check clipboard permission.",
    jsonReady: "Prepared the JSON export.",
    jsonFailed: "Could not export JSON.",
  },
  providerComparison: {
    eyebrow: "Provider comparison",
    title: "Budget plan by product family",
    analysisExplanation: {
      mock: "A saved sample provides the task analysis, then the program applies each provider's pricing to the same work. Claude and Gemini APIs are not called.",
      live: "GPT-5.6 analyzes the work once, then the program applies each provider's pricing to that same analysis. Claude and Gemini APIs are not called.",
    },
    scopeTitle: "Scope and interpretation",
    heuristicNotice: "The economy, balanced, and high-performance groups are a simple rule used for budget planning.",
    noQualityRanking: "They do not claim objective quality equivalence, superiority, or a ‘best model.’ Product names identify public entries and do not imply affiliation or endorsement.",
    standardPricingNotice: "Only standard text prices without cache discounts are used. Cache, batch processing, tool-call, and long-context charges are excluded.",
    activeOnlyNotice: "Totals include tasks selected to run and exclude tasks that are on hold or cannot run.",
    eligibilityScopeNotice: "This reference comparison checks only price, minimum quality, per-request limits, and budget. The tailored plan above checks work method, required features, and confirmed ways to use each model.",
    selectorLegend: "Choose the model family for the detailed plan",
    allWorkFits: "All work fits",
    fitsWithHolds: "Fits with holds",
    infeasibleOfferings: "No compatible model",
    checkedConstraintsFit: "Fits checked constraints",
    checkedConstraintsWithHolds: "Checked fit with holds",
    checkedConstraintsInfeasible: "Fails checked constraints",
    outsideBudget: "Outside budget",
    highExceeds: "Over budget",
    activeHeld: (active, held, infeasible) =>
      `${active} active · ${held} on hold · ${infeasible} infeasible`,
    selectedPlan: "Detailed plan selected",
    selectPlan: "Select for detailed plan",
    previewModels: (count) => `${count} preview model${count === 1 ? "" : "s"}`,
    priceEffectiveThrough: (model, date) => `${model} price effective through ${date}`,
    standardPriceInputLimit: (model, limit) => `${model} standard price up to ${limit} input`,
  },
  providerPricing: {
    summary: "Provider prices and comparison assumptions",
    introduction: () =>
      "Prices are in USD per one million tokens and use standard text usage without cache discounts. Tiers are not objective quality rankings.",
    tableCaption: "Standard text input and output prices without cache discounts for nine provider models",
    providerColumn: "Provider",
    tierColumn: "Tier",
    modelColumn: "Model",
    inputColumn: "Input / 1M",
    outputColumn: "Output / 1M",
    conditionsColumn: "Status and price conditions",
    standardPrice: "Standard price",
    preview: "Preview",
    priceThrough: (date) => `Displayed price through ${date}`,
    priceFrom: (date, input, output) => `From ${date}: input $${input} / output $${output}`,
    inputLimit: (limit) => `Standard price up to ${limit} input`,
    maxInputLimit: (limit) => `Maximum ${limit} input per invocation`,
    maxOutputLimit: (limit) => `Maximum ${limit} output per invocation`,
    maxCombinedLimit: (limit) => `Maximum ${limit} combined input + output per invocation`,
    longContextExcluded: (input, output) =>
      `Long-context input $${input} / output $${output} excluded from comparison`,
    scrollHint: "Scroll the price table horizontally to see every column.",
    excludedTitle: "Excluded from comparison",
    excludedLongContextExplanation:
      "The Gemini 3.1 Pro price above 200K is recorded but not applied to comparison calculations.",
    sourcesTitle: "Official sources and verification date",
    exclusions: {
      "cache-discounts-and-writes": "Cache discounts and write prices",
      "batch-pricing": "Batch pricing",
      "tool-call-fees": "Tool-call fees",
      "long-context-surcharges": "Long-context surcharges",
    },
  },
  enums: {
    analysisMode: { mock: "Try a sample", live: "Analyze my tasks" },
    taskType: {
      "software-development": "Software development",
      research: "Research",
      writing: "Writing",
      "data-analysis": "Data analysis",
      planning: "Planning",
      creative: "Creative",
      multimodal: "Multimodal",
      other: "Other",
    },
    complexity: { low: "Low", medium: "Medium", high: "High", "very-high": "Very high" },
    reasoningDepth: { light: "Light", moderate: "Moderate", deep: "Deep" },
    sizeBand: { xs: "XS", s: "S", m: "M", l: "L", xl: "XL" },
    uncertainty: { low: "Low", medium: "Medium", high: "High" },
    modelTier: { economy: "Economy", balanced: "Balanced", frontier: "Frontier" },
    provider: { openai: "OpenAI · GPT-5.6", anthropic: "Anthropic · Claude", google: "Google · Gemini 3" },
    strategy: { "cost-saver": "Save money", balanced: "Balanced", "quality-first": "Consider higher tiers" },
    priority: { high: "High", medium: "Medium", low: "Low" },
    failureImpact: { high: "High", medium: "Medium", low: "Low", unspecified: "Unspecified" },
    allocationStatus: { active: "Active", held: "On hold", infeasible: "Infeasible" },
    invocationFailure: {
      "input-limit-exceeded": "input limit exceeded",
      "output-limit-exceeded": "output limit exceeded",
      "context-limit-exceeded": "context limit exceeded",
    },
  },
};

const ja: UiCopy = {
  common: {
    productName: "Frontier Workload Planner",
    language: "言語",
    languageSelectorHelp: "画面に表示する言語を選択します。",
    selected: "選択済み",
    select: "選択",
    required: "必須",
    optional: "任意",
    defaultValue: "初期値あり",
    active: "実行",
    held: "保留",
    none: "なし",
    officialPricingSource: "公式料金ソース",
    officialModelsSource: "公式モデルソース",
    verifiedAt: (date) => `${date} 確認`,
    usdPerMillionTokens: "USD per 1M tokens",
  },
  page: {
    headerSubtitle: "説明可能な予算重視の計画",
    headerBadge: "サンプルで体験・ブラウザ保存",
    heroEyebrow: "説明・分類・計算・配分",
    heroTitleLine1: "複数のタスクを1回のリクエストで分析し、",
    heroTitleLine2: "予算内でモデル製品群を比較します。",
    heroDescription:
      "GPT-5.6は作業説明から、難しさ・規模・必要な機能などを整理します。料金、プロバイダー、最終的な利用方法をGPTが選ぶことはありません。プログラムが公開ルールと料金表から、上限・トークン・費用・予算計画を計算します。",
    analysisModeLegend: "ステップ3・計画の作り方",
    mockDescription: "サーバーへ送信せず、このブラウザでサンプル結果を試す",
    liveDescription: "入力した作業をGPT-5.6で分析",
    storageDisclosure:
      "計画を作成すると、タスク名・説明、計画設定、バージョン付きの作業分析、基準プロバイダーの選択、入力したサブスクリプション・料金修正情報が、保存記録を削除するまで暗号化されていない平文でこのブラウザに自動保存されます。計算済みの利用経路と費用は保存せず、復元時に再計算します。APIキーは保存しません。",
    submitMock: "サンプル計画を作成",
    submitLive: "自分の作業から計画を作成",
    submitting: (count) => `${count}件のタスクを分析中…`,
    mockSafety: "サンプル分析はこのブラウザ内だけで実行され、タスク名や説明をサイトのサーバーや外部AIへ送りません。入力内容は上の案内どおりブラウザに保存される場合があるため、サンプルタスクを利用してください。",
    liveSafety: "自分の作業を分析すると、タスク名と説明がOpenAIへ送信されます。リクエストはstore:falseで応答のアプリケーション状態保存を無効にしますが、セキュリティ・不正利用監視ログまで無効になるわけではありません。これらのログは通常最大30日間保持され、法的義務または危害防止のためにさらに長く保持される場合があります。API入力は初期設定ではモデル学習に使われません。機密情報を入力しないでください。APIキーはブラウザへ送られません。",
    statusLoading: (count) => `${count}件のタスクを分析しています。`,
    statusSuccess: (count) => `${count}件のタスク分析が完了しました。`,
    statusError: "分析リクエストを完了できませんでした。",
    invalidForm: "すべてのタスクと計画設定を確認してください。",
    requestFailed: "分析リクエストに失敗しました。",
    requestTooLarge: "リクエストが許容サイズを超えました。",
    invalidJson: "分析リクエストの形式が正しくありません。",
    invalidInput: "タスク入力を確認してください。",
    liveDisabled: "実際の分析はサーバー設定で無効です。サンプル計画は引き続き利用できます。",
    apiKeyMissing: "サーバーにOpenAI APIキーが設定されていません。サンプル計画は引き続き利用できます。",
    modelRefusal: "モデルがこの分析を拒否しました。入力を調整するかサンプル計画を使用してください。",
    liveAnalysisFailed: "実際の分析に失敗しました。しばらくしてから再試行するかサンプル計画を使用してください。",
    unknownApiError: "分析リクエストを処理できませんでした。",
    requestTimeout: "分析がタイムアウトしました。サンプル計画を使うか、しばらくしてから再試行してください。",
    networkError: "サービスに接続できません。通信状況を確認して、もう一度お試しください。",
    storageTitle: "最近保存した計画",
    storageRestored: (date) => `${date}に保存された最近の計画を復元しました。`,
    storageLegacyRestored: (date) =>
      `${date}の旧API計画を復元しました。新しい計画を作るにはサンプルまたは実際の分析を再実行してください。`,
    storageMigrationRequired:
      "旧保存データは保持しましたが、自動移行できませんでした。削除するか新しい分析を実行できます。",
    storageCorrupt: "破損した最近の保存データを無視しました。",
    storageFutureVersion: "別バージョンの保存データは自動復元しませんでした。",
    storageUnavailable: "このブラウザでは最近の計画を保存できません。",
    storageEmpty: "復元できる最近の計画はまだありません。",
    storageSaved: "このブラウザの最近の計画として保存しました。",
    storageInvalid: "保存する計画の形式が一致しません。",
    storageWriteFailed: "ブラウザストレージへ最近の計画を保存できませんでした。",
    storageDeleted: "このブラウザの最近の保存データを削除しました。",
    storageDeleteFailed: "ブラウザの保存データを削除できませんでした。",
    storagePlaintextReminder: "タスク説明は保存記録を削除するまでこのブラウザに平文で残り、APIキーは保存しません。",
    restoreRecent: "最近の計画を復元",
    clearRecent: "保存データを削除",
    emptyEyebrow: "計画プレビュー",
    emptyTitle: "計画結果がここに表示されます。",
    emptyDescription: "タスクと設定を入力し、サンプル計画または自分の作業計画を作成してください。",
    loadingTitle: "作業を分析し、費用計画を作成しています。",
    loadingDescription: (count) => `${count}件の作業をまとめて分析し、同じ基準で費用を計算します。`,
    errorTitle: "分析を完了できませんでした。",
    invalidSettingsForRecalculation: "有効な予算と参考期間を入力すると、既存分析からすぐに再計算します。",
    allocationPriorityNotice: (task, priority) =>
      `${task}の優先度を${priority}に変更し、APIを再呼び出しせず再配分しました。`,
    allocationSettingsNotice: (budget, strategy) =>
      `予算${budget} USDと${strategy}戦略を反映し、APIを再呼び出しせず再配分しました。`,
    allocationBudgetPendingNotice: (budget) =>
      `予算を${budget} USDに変更しました。新しい金額を確認すると、推奨を再計算します。`,
    allocationResultChanged: "推奨経路または予想費用が前回の結果から変わりました。",
    allocationResultUnchanged: "再計算は完了し、推奨経路と予想費用は前回と同じです。",
    allocationDismiss: "計画更新のお知らせを閉じる",
    allocationProviderNotice: (provider) =>
      `${provider}製品群の料金で、APIを再呼び出しせず再計算しました。`,
    footerClaim: "予算を考慮した推奨・最安を保証するものではありません",
    footerBoundary: "最近の計画1件を保存・AI分析と費用計算は分離",
  },
  taskEditor: {
    eyebrow: "ステップ1",
    title: "やりたい作業を入力してください",
    maxTasksHelp: (max) => `一度に最大${max}件まで計画できます。`,
    priorityHelp: "優先度の高い作業から、残りのサブスクリプション枠と予算を配分します。GPTの作業分析には影響しません。",
    loadSample: (count) => `サンプル${count}件を読み込む`,
    taskLegend: (index) => `タスク${index}`,
    taskLabel: (index) => `タスク${index}`,
    remove: "削除",
    removeAriaLabel: (name) => `${name}を削除`,
    nameLabel: "タスク名",
    namePlaceholder: "例：カスタマーサポートダッシュボードAPIの設計",
    nameRequired: "タスク名を入力してください。",
    priorityLabel: "優先度",
    deadlineLabel: "タスク期限",
    deadlineHelp: "早い期限を先に考慮し、分析された失敗リスクが高い場合は上位グレードの検討条件にも使います。計画全体の参考期間とは別です。",
    failureImpactLabel: "失敗時の影響",
    failureImpactHelp: "失敗した場合の影響をユーザーが設定します。利用枠の順序と上位グレードの検討に使い、GPTの失敗確率とは別です。",
    settingsHelp: "優先度が高く、期限が早く、失敗時の影響が大きい作業から、限られた利用枠と予算を配分します。期限と失敗時の影響は、分析されたリスクと合わせて上位グレードの検討条件になる場合があります。",
    descriptionLabel: "タスク説明",
    descriptionPlaceholder: "目的、成果物、制約、品質基準を具体的に記載してください。",
    descriptionRequired: "タスク説明を入力してください。",
    addTask: "タスクを追加",
    maximumReached: (max) => `最大${max}件`,
    characterCounter: (current, max) => `${current} / ${max}`,
  },
  budgetSettings: {
    eyebrow: "ステップ2",
    title: "予算と選択基準",
    budgetLabel: "総予算 (USD)",
    budgetHelp: "標準利用時の費用を基準にグレードを調整します。",
    budgetError: "$0.01〜$10,000の予算を入力してください。",
    deadlineLabel: "参考期間（日）",
    deadlineUnit: "日",
    deadlineHelp: "料金やティアには影響しません。",
    deadlineError: "1〜90の整数を入力してください。",
    strategyLegend: "何を優先しますか？",
    strategies: {
      "cost-saver": { label: "コストを節約", description: "条件を満たす低コストの選択肢から確認します。" },
      balanced: { label: "バランス", description: "必要な品質とコストを一緒に考慮します。" },
      "quality-first": { label: "上位グレードも検討", description: "予算内で一段階上の選択肢もあわせて検討します。" },
    },
  },
  analysisResults: {
    eyebrow: "予算重視の推奨計画",
    title: "コストとモデル配分結果",
    referenceEyebrow: "検証前の参考コスト",
    referenceTitle: "API料金とトークン上限に基づく結果",
    referenceNotice: "以下はAPI料金とトークン上限だけで算出した参考コストです。「実行」はこのコスト計算に含めたという意味で、実際の利用可否や確定推奨を意味しません。この結果は上の確定計画の合計と予算判定には含まれません。",
    aiAnalyzed: "AI分析",
    programCalculated: "プログラム計算",
    budget: "予算",
    lowUsageLabel: "少なめ",
    expectedUsageLabel: "標準",
    highUsageLabel: "多め",
    lowDetail: "少ないトークン・反復の想定",
    expectedDetail: (utilization, active, held, infeasible) =>
      `予算使用率${utilization}%・実行${active} / 保留${held} / 実行不可${infeasible}`,
    highWithinBudget: "予算内",
    highRisk: "予算超過リスク",
    reviewItems: "計画の確認事項",
    expectedBudgetUnresolved: "実行する作業の標準利用時の費用を予算内へ調整できませんでした。",
    heldWarning: (count) => `${count}件のタスクを予算不足で保留しました。保留タスクのコストは合計から除外します。`,
    infeasibleWarning: (count) =>
      `${count}件のタスクは最低品質と呼び出し上限の両方を満たすモデルがなく実行不可です。コスト合計と予算適合判定から除外します。`,
    legacyInfeasibleWarning: (count) =>
      `${count}件の旧分析作業は、少なめ・標準・多めの3つの利用ケースをすべて処理できるモデルがないため実行できません。費用合計と予算判定から除外します。`,
    limitReassignedWarning: (count) =>
      `${count}件の作業を、3つの利用ケースの上限をすべて満たすグレードへ再配分しました。`,
    downgradedWarning: (count) => `${count}件の作業のグレードを予算に合わせて下げました。`,
    highBudgetWarning: "多めに利用する場合の費用が予算を超えます。",
    oneDayDeadlineWarning: "1日の期限は参考情報です。このバージョンは詳細な時間予測を提供しません。",
    allScenariosWithinBudget: "実行するすべての作業は、標準または多めに利用する場合も入力予算内です。",
    allocationTitle: "タスク別配分",
    referenceAllocationTitle: "タスク別の参考コスト配分",
    allocationSummary: (active, held, infeasible, remaining) =>
      `実行${active}・保留${held}・実行不可${infeasible}・標準利用時の残予算 ${remaining}`,
    taskNumber: (index) => `作業 ${index}`,
    onHoldBadge: "保留",
    infeasibleBadge: "実行不可",
    budgetAdjustedBadge: "予算調整",
    limitAdjustedBadge: "呼び出し上限で再配分",
    heldTitle: "今回の計画では実行対象外",
    heldReason: (minimum) =>
      `現在確認した条件で全作業の標準利用時の最小費用が予算を超えたため、優先度の低い順に保留しました。この作業に必要な最小額は${minimum}です。`,
    infeasibleTitle: "確認済み条件を満たすモデルなし",
    infeasibleReason: (reasons) =>
      `最低品質を満たし、少なめ・標準・多めの3つの利用ケースをすべて処理できるグレードがありません。内容の切り捨てや自動分割は行っていません。理由: ${reasons}`,
    legacyInfeasibleReason: (reasons) =>
      `どのグレードも3つの利用ケースをすべて処理できません。この旧分析には最低品質基準を適用せず、内容の切り捨てや自動分割も行っていません。理由: ${reasons}`,
    eligibilityVerificationPending:
      "この参考費用画面は、標準API料金・最低品質グレード・3つの利用ケースの上限・入力予算だけを比較します。作業方法と必須機能への対応は、上の計画で別に確認します。",
    excludedOfferingsTitle: "呼び出し上限により除外したモデル",
    excludedOfferingsReason: (reasons) =>
      `以下のモデルは3つの利用ケースのいずれかを処理できないため、候補から除外しました。理由: ${reasons}`,
    assignedModel: "割り当てモデル",
    assignedTier: "割り当てグレード",
    recommendationTrail: (recommended, target) => `GPT推奨 ${recommended}・戦略目標 ${target}`,
    referenceAssignedModel: "参考モデル",
    referenceAssignedTier: "参考グレード",
    referenceTrail: (analyzed, target) => `分析基準 ${analyzed}・コスト計画基準 ${target}`,
    expectedInput: "標準利用時の入力合計",
    expectedOutput: "標準利用時の出力合計",
    iterations: (count) => `反復 ${count}回`,
    uncertainty: "不確実性",
    taskType: "タスク種別",
    complexity: "複雑度",
    reasoning: "推論",
    sizeBand: "サイズ帯",
    workMode: "作業モード",
    minimumQuality: "最低品質",
    requiredCapabilities: "必須機能",
    failureRisk: "失敗確率",
    risks: "リスク要因",
    generatedRuleBased: (date) => `${date}・ルールベースの推奨であり、数学的最適化ではありません。`,
    referenceGeneratedRuleBased: (date) => `${date}・料金とトークン上限だけを使った参考計算です。`,
  },
  costChart: {
    title: (provider) => `${provider} 作業別の標準利用時費用`,
    heldAllocation: "保留・$0配分",
    infeasibleAllocation: "実行不可・コスト除外",
    expectedCostAria: (task, amount) => `${task}の標準利用時費用 ${amount}`,
  },
  export: {
    copyMarkdown: "Markdownをコピー",
    exportJson: "JSONを書き出す",
    includesDescriptions: "コピーとJSONファイルにはタスク説明が含まれます。",
    markdownCopied: "Markdownをクリップボードへコピーしました。",
    markdownCopyFailed: "Markdownをコピーできませんでした。クリップボード権限を確認してください。",
    jsonReady: "JSON書き出しを準備しました。",
    jsonFailed: "JSONを書き出せませんでした。",
  },
  providerComparison: {
    eyebrow: "プロバイダー比較",
    title: "製品群別の予算計画比較",
    analysisExplanation: {
      mock: "保存済みのサンプル分析を使い、同じ内容に各プロバイダーの料金を適用します。ClaudeとGemini APIは呼び出しません。",
      live: "GPT-5.6がタスクを1回だけ分析し、プログラムが同じ分析へ各プロバイダーの料金を適用します。ClaudeとGemini APIは呼び出しません。",
    },
    scopeTitle: "比較範囲と解釈",
    heuristicNotice: "節約・バランス・高性能グレードの対応付けは、予算計画のための簡単なルールです。",
    noQualityRanking: "客観的な品質の同等性、優劣、または「最高のモデル」を示すものではありません。製品名は公開項目の識別用であり、提携や推奨を意味しません。",
    standardPricingNotice: "キャッシュ未使用の標準テキスト料金だけを使い、キャッシュ・一括処理・ツール呼び出し・長文追加料金は除外します。",
    activeOnlyNotice: "コストは配分後の実行タスクのみを合計し、保留・実行不可タスクは含みません。",
    eligibilityScopeNotice: "この参考比較では、料金・最低品質グレード・呼び出し上限・予算だけを確認します。作業方法・必須機能・確定した利用方法は、上の計画で別に判定します。",
    selectorLegend: "詳細計画に使うモデル製品群を選択",
    allWorkFits: "全タスクが予算内",
    fitsWithHolds: "保留を含め予算内",
    infeasibleOfferings: "互換モデルなし",
    checkedConstraintsFit: "確認範囲内で適合",
    checkedConstraintsWithHolds: "確認範囲内・一部保留",
    checkedConstraintsInfeasible: "確認範囲内で実行不可",
    outsideBudget: "予算外",
    highExceeds: "予算超過",
    activeHeld: (active, held, infeasible) =>
      `実行${active}・保留${held}・実行不可${infeasible}`,
    selectedPlan: "詳細計画に選択済み",
    selectPlan: "詳細計画に選択",
    previewModels: (count) => `プレビュー版モデル ${count}件`,
    priceEffectiveThrough: (model, date) => `${model}の料金は${date}まで`,
    standardPriceInputLimit: (model, limit) => `${model}標準料金は入力${limit}以下`,
  },
  providerPricing: {
    summary: "プロバイダー料金表と比較前提を見る",
    introduction: () =>
      "料金単位は100万トークンあたりのUSDです。キャッシュ割引なしの通常テキスト利用を基準とし、グレードは客観的な品質順位ではありません。",
    tableCaption: "9モデルのキャッシュ未使用・標準テキスト入出力料金",
    providerColumn: "プロバイダー",
    tierColumn: "ティア",
    modelColumn: "モデル",
    inputColumn: "入力 / 1M",
    outputColumn: "出力 / 1M",
    conditionsColumn: "状態・料金条件",
    standardPrice: "標準料金",
    preview: "プレビュー版",
    priceThrough: (date) => `表示料金は${date}まで`,
    priceFrom: (date, input, output) => `${date}から入力 $${input} / 出力 $${output}`,
    inputLimit: (limit) => `標準料金は入力${limit}以下`,
    maxInputLimit: (limit) => `1回の入力上限 ${limit}`,
    maxOutputLimit: (limit) => `1回の出力上限 ${limit}`,
    maxCombinedLimit: (limit) => `1回の入力+出力合計上限 ${limit}`,
    longContextExcluded: (input, output) =>
      `長文入力 $${input} / 出力 $${output}は比較対象外`,
    scrollHint: "料金表は左右にスクロールできます。",
    excludedTitle: "比較対象外",
    excludedLongContextExplanation:
      "Gemini 3.1 Proの200K超の長文料金は記録のみ行い、比較計算には適用しません。",
    sourcesTitle: "公式ソースと確認日",
    exclusions: {
      "cache-discounts-and-writes": "キャッシュ割引・書き込み料金",
      "batch-pricing": "Batch料金",
      "tool-call-fees": "ツール呼び出し料金",
      "long-context-surcharges": "長文追加料金",
    },
  },
  enums: {
    analysisMode: { mock: "サンプルで試す", live: "自分の作業を分析" },
    taskType: {
      "software-development": "ソフトウェア開発",
      research: "リサーチ",
      writing: "ライティング",
      "data-analysis": "データ分析",
      planning: "企画",
      creative: "クリエイティブ",
      multimodal: "マルチモーダル",
      other: "その他",
    },
    complexity: { low: "低", medium: "中", high: "高", "very-high": "非常に高い" },
    reasoningDepth: { light: "軽い", moderate: "中程度", deep: "深い" },
    sizeBand: { xs: "XS", s: "S", m: "M", l: "L", xl: "XL" },
    uncertainty: { low: "低", medium: "中", high: "高" },
    modelTier: { economy: "節約", balanced: "バランス", frontier: "高性能" },
    provider: { openai: "OpenAI・GPT-5.6", anthropic: "Anthropic・Claude", google: "Google・Gemini 3" },
    strategy: { "cost-saver": "コストを節約", balanced: "バランス", "quality-first": "上位グレードも検討" },
    priority: { high: "高", medium: "中", low: "低" },
    failureImpact: { high: "高", medium: "中", low: "低", unspecified: "未指定" },
    allocationStatus: { active: "実行", held: "保留", infeasible: "実行不可" },
    invocationFailure: {
      "input-limit-exceeded": "入力上限超過",
      "output-limit-exceeded": "出力上限超過",
      "context-limit-exceeded": "コンテキスト上限超過",
    },
  },
};

export const UI_COPY: Record<UiLocale, UiCopy> = { ko, en, ja };

export function isUiLocale(value: unknown): value is UiLocale {
  return typeof value === "string" && (UI_LOCALES as readonly string[]).includes(value);
}

export function getUiCopy(locale: UiLocale): UiCopy {
  return UI_COPY[locale];
}

export function getUiDateLocale(locale: UiLocale): string {
  return UI_LOCALE_META[locale].dateLocale;
}

export function getEnumLabel<
  Group extends keyof UiEnumLabels,
  Value extends keyof UiEnumLabels[Group],
>(locale: UiLocale, group: Group, value: Value): string {
  const labels = UI_COPY[locale].enums[group] as Record<PropertyKey, string>;
  return labels[value];
}

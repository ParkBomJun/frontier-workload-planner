import type { SubscriptionPresetId } from "@/config/subscription-presets";
import {
  BEST_FIT_EXCLUSION_REASON_CODES,
  type BestFitExclusionReasonCode,
} from "@/lib/planning/best-fit-candidates";
import type {
  BestFitActiveTaskResult,
  BestFitRouteKind,
} from "@/types/best-fit";
import {
  type PlanningQualityTier,
  type WorkSurface,
} from "@/types/offerings";
import type {
  SubscriptionAvailabilityStatus,
  SubscriptionOwnership,
  SubscriptionQuotaKind,
  SubscriptionQuotaUnit,
} from "@/types/subscriptions";
import type { AppliedUpgradeTrigger } from "@/types/workload";

import { UI_COPY, type UiLocale } from "./ui-copy";

export { BEST_FIT_EXCLUSION_REASON_CODES };

const bestFitExclusionReasonCodeSet = new Set<string>(
  BEST_FIT_EXCLUSION_REASON_CODES,
);

export function isBestFitExclusionReasonCode(
  value: string,
): value is BestFitExclusionReasonCode {
  return bestFitExclusionReasonCodeSet.has(value);
}

type ResetKind = "none" | "fixed" | "rolling" | "unknown";

export interface BestFitUiCopy {
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    description: string;
  };
  budget: {
    label: string;
    help: string;
    unconfirmedTitle: string;
    unconfirmedDescription: string;
    confirmedTitle: string;
    confirmedDescription: (date: string) => string;
    confirm: string;
    revoke: string;
    invalid: string;
  };
  resources: {
    eyebrow: string;
    title: string;
    description: string;
    sessionOnly: string;
    addLegend: string;
    addPreset: (name: string) => string;
    maximumReached: string;
    emptyTitle: string;
    emptyDescription: string;
    resourceLegend: (index: number) => string;
    remove: string;
    nameLabel: string;
    ownershipLabel: string;
    availabilityLabel: string;
    surfaceLabel: string;
    feeLabel: string;
    existingFeeHelp: string;
    newFeeHelp: string;
    quotaKindLabel: string;
    quotaUnitLabel: string;
    includedLabel: string;
    remainingLabel: string;
    observedUseLabel: string;
    observedUseHelp: string;
    consumptionBasisLabel: string;
    taskBasis: string;
    iterationBasis: string;
    lowLabel: string;
    expectedLabel: string;
    highLabel: string;
    sampleSizeLabel: string;
    opaqueDescriptionLabel: string;
    opaqueDescriptionPlaceholder: string;
    resetKindLabel: string;
    nextResetLabel: string;
    cadenceDaysLabel: string;
    rollingHoursLabel: string;
    conditionalNotice: string;
    conditionalStatus: string;
    invalidStatus: string;
    fieldError: string;
    relinkTitle: string;
    relinkDescription: string;
    relinkLabel: string;
    relinkPlaceholder: string;
    presets: Record<SubscriptionPresetId, { name: string; description: string }>;
  };
  overrides: {
    eyebrow: string;
    title: string;
    description: string;
    sessionOnly: string;
    accessBoundary: string;
    providerLabel: string;
    catalogTierLabel: string;
    planningTierLabel: string;
    keepDefaultTier: string;
    inputPriceLabel: string;
    outputPriceLabel: string;
    effectiveFromLabel: string;
    officialDefault: string;
    apply: string;
    restore: string;
    active: string;
    userSupplied: string;
    unresolvedSource: string;
    futureSource: string;
    removeUnresolved: string;
    none: string;
    applied: string;
    restored: string;
    removed: string;
    invalid: string;
  };
  results: {
    eyebrow: string;
    title: string;
    authorityNotice: string;
    exportDisclosure: string;
    compatibilityView: string;
    compatibilityDescription: string;
    budgetRequiredTitle: string;
    budgetRequiredDescription: string;
    analysisRequiredTitle: string;
    analysisRequiredDescription: string;
    calculationError: string;
    totalIncrementalCash: string;
    apiTaskPrice: string;
    subscriptionMarginalCash: string;
    subscriptionMarginalCashNotice: string;
    apiSpend: string;
    subscriptionUsage: string;
    newCommitment: string;
    paidOverage: string;
    expectedBudgetStatus: string;
    withinBudget: string;
    outsideBudget: string;
    highRisk: string;
    noHighRisk: string;
    avoidedSpend: string;
    additionalSpend: string;
    noPremiumBaseline: string;
    activeHeldInfeasible: (active: number, held: number, infeasible: number) => string;
    taskNumber: (index: number) => string;
    accessRoute: string;
    model: string;
    noConfirmedRoute: string;
    whyEnough: string;
    whyNotPremium: string;
    upgradeTriggers: string;
    alternative: string;
    holdReason: string;
    infeasibleReason: string;
    holdReasonValue: string;
    infeasibleReasonValue: string;
    conditionalAlternatives: string;
    excludedRoutes: string;
    unknownExclusionReason: string;
    resourceDiagnostics: string;
    noSubscriptionUsage: string;
    tasksUsingRoute: (taskIds: string) => string;
    usageUnit: (unit: string) => string;
    usedRange: (low: string, expected: string, high: string) => string;
    remainingRange: (low: string, expected: string, high: string) => string;
    overageRange: (low: string, expected: string, high: string) => string;
    scenarioOverflow: string;
    generatedAt: (date: string) => string;
  };
  enums: {
    ownership: Record<SubscriptionOwnership, string>;
    availability: Record<SubscriptionAvailabilityStatus, string>;
    quotaKind: Record<SubscriptionQuotaKind, string>;
    quotaUnit: Record<SubscriptionQuotaUnit, string>;
    resetKind: Record<ResetKind, string>;
    surface: Record<WorkSurface, string>;
    planningTier: Record<PlanningQualityTier, string>;
    routeKind: Record<BestFitRouteKind, string>;
    whyEnough: Record<BestFitActiveTaskResult["whyEnough"], string>;
    whyNotPremium: Record<BestFitActiveTaskResult["whyNotPremium"], string>;
    upgradeTrigger: Record<AppliedUpgradeTrigger, string>;
    exclusionReason: Record<BestFitExclusionReasonCode, string>;
  };
}

const ko: BestFitUiCopy = {
  hero: {
    eyebrow: "작업 요구사항 · 이용 경로 · 증분 비용",
    titleLine1: "가장 비싼 모델보다,",
    titleLine2: "작업에 맞는 선택을.",
    description:
      "구독과 API를 함께 비교해 필요한 품질은 지키고 불필요한 비용과 한도 소모를 줄입니다. GPT-5.6은 제한된 작업 요구사항만 분석하고, 가격·공급자·최종 이용 경로는 결정론적 프로그램이 계산합니다.",
  },
  budget: {
    label: "총 증분 현금 예산",
    help: "API 사용료, 새 구독 약정액, 유료 초과 사용료만 합산합니다. 이미 보유한 구독료는 다시 더하지 않습니다.",
    unconfirmedTitle: "예산 의미 확인 필요",
    unconfirmedDescription:
      "기존 API 전용 예산을 총 증분 현금 예산으로 자동 해석하지 않습니다. Best-fit 계산 전에 같은 금액의 의미를 명시적으로 확인하세요.",
    confirmedTitle: "총 증분 현금 예산 확인됨",
    confirmedDescription: (date) => `${date}에 이 금액의 의미를 확인했습니다.`,
    confirm: "이 금액을 총 증분 현금 예산으로 확인",
    revoke: "확인 취소",
    invalid: "유효한 예산을 입력한 뒤 확인하세요.",
  },
  resources: {
    eyebrow: "이용 가능한 AI 자원",
    title: "보유 구독과 검토 중인 구독",
    description:
      "구독의 남은 한도와 사용 환경을 입력합니다. 실제 프리셋은 공식 실행 권한이나 한도를 증명하지 않으므로, 출처가 확인되지 않은 값은 조건부 또는 제외 상태로만 표시됩니다.",
    sessionOnly: "자원 draft와 항목별 관측 시각은 최신 시나리오의 버전된 raw source로 이 브라우저 LocalStorage v6에 저장됩니다. 복원할 때 증거를 다시 해석하고 경로·ledger는 다시 계산합니다.",
    addLegend: "프리셋 추가",
    addPreset: (name) => `${name} 추가`,
    maximumReached: "프리셋당 자원 1개, 최대 4개를 지원합니다.",
    emptyTitle: "추가한 구독 자원이 없습니다.",
    emptyDescription: "API 호환성 보기는 계속 사용할 수 있습니다. 구독을 추가하면 근거 상태와 조건부 사유를 함께 검토합니다.",
    resourceLegend: (index) => `AI 자원 ${index}`,
    remove: "제거",
    nameLabel: "표시 이름",
    ownershipLabel: "보유 상태",
    availabilityLabel: "현재 가용성",
    surfaceLabel: "사용 환경",
    feeLabel: "플랜 기간 요금 (USD)",
    existingFeeHelp: "기존 구독료는 정보로만 표시하며 증분 현금에 다시 합산하지 않습니다.",
    newFeeHelp: "새 구독을 선택하면 계획 전체에서 한 번만 증분 현금에 합산합니다.",
    quotaKindLabel: "한도 유형",
    quotaUnitLabel: "한도 단위",
    includedLabel: "포함량",
    remainingLabel: "남은 양",
    observedUseLabel: "관측된 작업당 사용량",
    observedUseHelp: "Low / Expected / High와 관측 표본 수를 입력합니다. 사용자 관측값은 확정 근거가 아닙니다.",
    consumptionBasisLabel: "사용량 기준",
    taskBasis: "작업 1개당",
    iterationBasis: "분석 반복 1회당",
    lowLabel: "Low",
    expectedLabel: "Expected",
    highLabel: "High",
    sampleSizeLabel: "관측 표본 수",
    opaqueDescriptionLabel: "한도 설명",
    opaqueDescriptionPlaceholder: "예: 사용량에 따라 달라지는 비공개 한도",
    resetKindLabel: "초기화 방식",
    nextResetLabel: "다음 초기화 시각",
    cadenceDaysLabel: "초기화 주기 (일)",
    rollingHoursLabel: "롤링 윈도우 (시간)",
    conditionalNotice: "저장·복원해도 사용자 입력은 공식 제공자 근거로 승격되지 않습니다. 현재 실제 프리셋은 조건부 또는 제외 상태로 남으며 API 가격 호환성 보기는 별도로 제공합니다.",
    conditionalStatus: "조건부 자원",
    invalidStatus: "입력 확인 필요",
    fieldError: "필수 값과 숫자 범위를 확인하세요.",
    relinkTitle: "저장된 프리셋을 다시 연결해야 합니다.",
    relinkDescription: "현재 프리셋을 선택하면 이전 참조를 교체하고 프리셋에 종속된 사용 환경·한도·초기화 입력을 안전한 빈 기본값으로 바꿉니다. 표시 이름과 보유·가용성·요금 입력은 유지됩니다.",
    relinkLabel: "대체 프리셋",
    relinkPlaceholder: "현재 프리셋 선택",
    presets: {
      "chatgpt-like-variable": {
        name: "ChatGPT 유형 가변 한도",
        description: "공개된 정확한 작업 수 없이 설명형 한도로 기록합니다.",
      },
      "github-copilot-like-credits": {
        name: "GitHub Copilot 유형 크레딧",
        description: "IDE/CLI 작업용 크레딧의 남은 양과 관측 사용량을 입력합니다.",
      },
      "glm-like-rolling": {
        name: "GLM 유형 롤링 한도",
        description: "롤링 기간과 사용자 관측 한도를 조건부 정보로 기록합니다.",
      },
      "custom-subscription": {
        name: "사용자 지정 구독",
        description: "특정 API나 로컬 실행을 주장하지 않는 사용자 정의 클라우드 구독입니다.",
      },
    },
  },
  overrides: {
    eyebrow: "제한된 카탈로그 수정",
    title: "검증된 API 항목의 계획값 조정",
    description: "기존 9개 항목의 계획 등급과 표준 텍스트 입력·출력 가격만 수정할 수 있습니다.",
    sessionOnly: "사용자 수정 source는 LocalStorage v6와 Best-fit JSON v5/Markdown에 별도로 기록됩니다. 공식 기본값과 근거는 바뀌지 않으며, 기본값 복원은 사용자 수정 항목을 삭제합니다.",
    accessBoundary: "가격이나 계획 등급 수정은 접근 권한, 기능 지원, 호출 한도를 확인해 주지 않습니다.",
    providerLabel: "공급자",
    catalogTierLabel: "카탈로그 항목",
    planningTierLabel: "계획 등급",
    keepDefaultTier: "공식 기본 등급 유지",
    inputPriceLabel: "입력 USD / 1M tokens",
    outputPriceLabel: "출력 USD / 1M tokens",
    effectiveFromLabel: "적용 시작일",
    officialDefault: "공식 기본값",
    apply: "수정 적용",
    restore: "기본값 복원",
    active: "저장된 override source",
    userSupplied: "사용자 입력",
    unresolvedSource: "미해결 · 적용되지 않음",
    futureSource: "미래 예약 거부 · 적용되지 않음",
    removeUnresolved: "미해결 source 삭제",
    none: "저장된 override source 없음",
    applied: "수정값을 적용했습니다.",
    restored: "공식 기본값으로 복원했습니다.",
    removed: "미해결 override source를 삭제했습니다.",
    invalid: "가격, 날짜 또는 등급 입력을 확인하세요.",
  },
  results: {
    eyebrow: "Best-fit 경로 계획",
    title: "증거 경계를 지키는 이용 경로 배분",
    authorityNotice: "저장된 source와 내보낸 audit snapshot도 권한이 아닙니다. 확인되지 않은 접근 권한·기능·구독 한도와 실제 비권위 프리셋은 확정 실행 경로로 승격하지 않습니다.",
    exportDisclosure: "Best-fit JSON v5와 Markdown에는 구조화된 route, 복원 가능한 resource/override source, audit-only 해결 증거가 포함됩니다. 내보낸 audit는 복원 권위가 아니며 source를 다시 해석해야 합니다.",
    compatibilityView: "API 가격 호환성 보기",
    compatibilityDescription: "아래의 기존 공급자 비교는 검증된 기본 표준 텍스트 가격과 호출 한도만 사용하는 참고 보기입니다. 저장된 사용자 수정값은 위 Best-fit 계산에만 적용되며, 이 보기는 완전한 Offering 적격성 확인이 아닙니다.",
    budgetRequiredTitle: "Best-fit 계산이 아직 잠겨 있습니다.",
    budgetRequiredDescription: "총 증분 현금 예산의 의미를 확인하면 현재 분석을 다시 호출하지 않고 경로 계획을 계산합니다.",
    analysisRequiredTitle: "Best-fit 작업 분석이 필요합니다.",
    analysisRequiredDescription: "이전 API 전용 분석은 그대로 보존됩니다. Mock 또는 Live 분석을 다시 실행하면 새 작업 요구사항 계약으로 경로 계획을 계산합니다.",
    calculationError: "Best-fit 경로를 다시 계산하지 못했습니다. 입력값을 확인한 뒤 다시 시도하세요.",
    totalIncrementalCash: "총 증분 현금",
    apiTaskPrice: "API 작업 가격 (Low / Expected / High)",
    subscriptionMarginalCash: "구독 한계 현금 귀속액 (Low / Expected / High)",
    subscriptionMarginalCashNotice: "구독 경로의 값은 결정론적 예약 순서에서 이 작업에 귀속된 한계 금액입니다. 독립적인 작업 가격이 아니며 계획 총계가 권위값입니다. 누적 정수 반올림 때문에 세 값은 단조롭지 않을 수 있습니다.",
    apiSpend: "API 사용료",
    subscriptionUsage: "구독 사용량",
    newCommitment: "새 구독 약정액",
    paidOverage: "유료 초과 사용료",
    expectedBudgetStatus: "Expected 예산 상태",
    withinBudget: "예산 이내",
    outsideBudget: "예산 초과",
    highRisk: "High 시나리오는 예산을 넘습니다.",
    noHighRisk: "High 시나리오도 예산 이내입니다.",
    avoidedSpend: "호환 가능한 Premium API 일괄 사용 대비 회피 비용",
    additionalSpend: "Premium API 기준보다 추가되는 비용",
    noPremiumBaseline: "호환 가능한 Premium API 기준선이 없어 절감액을 계산하지 않습니다.",
    activeHeldInfeasible: (active, held, infeasible) => `실행 ${active} · 보류 ${held} · 실행 불가 ${infeasible}`,
    taskNumber: (index) => `작업 ${index}`,
    accessRoute: "추천 이용 경로",
    model: "연결 모델",
    noConfirmedRoute: "확인된 실행 경로 없음",
    whyEnough: "이 경로가 충분한 이유",
    whyNotPremium: "Premium을 선택하지 않은 이유",
    upgradeTriggers: "상향 조건",
    alternative: "대체 경로",
    holdReason: "보류 이유",
    infeasibleReason: "실행 불가 이유",
    holdReasonValue: "확인된 경로의 Expected 증분 현금이 예산을 초과합니다.",
    infeasibleReasonValue: "작업 요구사항을 충족한다고 확인된 이용 경로가 없습니다.",
    conditionalAlternatives: "조건부 구독 대안",
    excludedRoutes: "확정 후보에서 제외된 경로",
    unknownExclusionReason: "확인할 수 없는 내부 제외 사유",
    resourceDiagnostics: "구독 자원 근거 상태",
    noSubscriptionUsage: "확정 배분에 사용된 구독 한도가 없습니다.",
    tasksUsingRoute: (taskIds) => `배정 작업: ${taskIds}`,
    usageUnit: (unit) => `기본 단위: ${unit}`,
    usedRange: (low, expected, high) => `사용량 ${low} / ${expected} / ${high}`,
    remainingRange: (low, expected, high) => `남은 포함량 ${low} / ${expected} / ${high}`,
    overageRange: (low, expected, high) => `초과 사용 ${low} / ${expected} / ${high}`,
    scenarioOverflow: "표시 가능한 정수 범위를 넘은 시나리오가 있습니다. 내부 비교에는 정확한 정수값을 사용했습니다.",
    generatedAt: (date) => `${date} 기준 결정론적 재계산`,
  },
  enums: {
    ownership: { owned: "보유 중", "candidate-new": "신규 검토" },
    availability: { available: "사용 가능", unavailable: "사용 불가", uncertain: "불확실" },
    quotaKind: { metered: "계량형", calibrated: "잔여율 보정형", "initial-capacity": "신규 초기 한도", opaque: "비공개/가변" },
    quotaUnit: { request: "요청", credit: "크레딧", "percent-point": "퍼센트 포인트" },
    resetKind: { none: "초기화 없음", fixed: "고정 시각", rolling: "롤링 윈도우", unknown: "알 수 없음" },
    surface: { chat: "채팅", "ide-cli": "IDE / CLI", batch: "배치" },
    planningTier: { economy: "Economy", balanced: "Balanced", premium: "Premium" },
    routeKind: { "owned-within-included-quota": "보유 구독 포함 한도", api: "API", "owned-paid-overage": "보유 구독 유료 초과", "new-subscription": "신규 구독" },
    whyEnough: { "minimum-quality-met": "필요한 최소 품질을 충족합니다.", "higher-tier-saved-cash": "상위 등급이 더 적은 증분 현금을 사용합니다.", "quality-headroom-triggered": "닫힌 상향 조건에 따라 한 단계 여유를 적용했습니다.", "minimum-quality-requires-premium": "호환 가능한 하위 경로가 없어 Premium이 최소 충분 경로입니다." },
    whyNotPremium: { "premium-selected": "Premium 경로를 선택했습니다.", "premium-not-triggered": "Premium 상향 조건이 없습니다.", "lower-tier-sufficient": "더 낮은 등급이 요구사항을 충족합니다.", "no-compatible-premium-api": "호환 가능한 Premium API 기준이 없습니다." },
    upgradeTrigger: { "minimum-quality-requires-premium": "하위 호환 경로 없음", "high-failure-exposure": "높은 실패 노출", "deadline-retry-risk": "마감 전 재시도 위험", "deep-reasoning": "깊은 추론", "large-code-change": "대규모 코드 변경" },
    exclusionReason: {
      "catalog-reference-unresolved": "카탈로그 참조를 확인할 수 없음", "catalog-version-mismatch": "카탈로그 버전 불일치", "catalog-claim-mismatch": "카탈로그 주장 불일치", "preset-reference-unresolved": "프리셋 참조를 확인할 수 없음", "preset-version-mismatch": "프리셋 버전 불일치", "connector-unverified": "커넥터 미검증", "connector-binding-mismatch": "계정 연결 불일치", "connector-snapshot-stale": "사용량 스냅샷 만료", "connector-snapshot-replayed": "스냅샷 재사용 감지", "connector-receipt-invalid": "커넥터 영수증 무효", "evidence-authority-invalid": "근거 권한 미확인", "profile-unverified": "적격성 프로필 미검증", "model-limits-incomplete": "모델 한도 정보 불완전", "access-limits-incomplete": "이용 경로 한도 정보 불완전", "model-capabilities-incomplete": "모델 기능 정보 불완전", "access-capabilities-incomplete": "이용 경로 기능 정보 불완전", "availability-uncertain": "현재 가용성 불확실", "consumption-user-observed": "사용량이 사용자 관측값임", "quota-calibrated": "한도가 관측값으로 보정됨", "quota-opaque": "정확한 한도가 비공개임", "quota-insufficient-observed": "관측된 잔여 한도 부족", "initial-capacity-unpublished": "신규 초기 한도 미공개",
      "model-reference-missing": "연결 모델 참조 없음",
      "surface-incompatible": "필요한 사용 환경과 호환되지 않음",
      "below-minimum-quality": "최소 품질 등급 미달",
      "required-capability-missing": "필수 기능 미지원",
      "input-limit-exceeded": UI_COPY.ko.enums.invocationFailure["input-limit-exceeded"],
      "output-limit-exceeded": UI_COPY.ko.enums.invocationFailure["output-limit-exceeded"],
      "context-limit-exceeded": UI_COPY.ko.enums.invocationFailure["context-limit-exceeded"],
      "price-schedule-not-applicable": "적용 가능한 가격 일정 없음",
      "standard-price-input-limit-exceeded": "표준 가격의 입력 구간 초과",
      "catalog-entry-not-found": "카탈로그 항목 없음",
      "invalid-pricing-as-of": "가격 기준일이 유효하지 않음",
      "catalog-price-schedule-invalid": "카탈로그 가격 일정이 유효하지 않음",
      "catalog-invocation-limits-unresolved": "카탈로그 호출 한도를 확인할 수 없음",
      "invalid-token-scenarios": "토큰 시나리오가 유효하지 않음",
      "invalid-user-override": "사용자 가격 수정값이 유효하지 않음",
      "override-target-unresolved": "가격 수정 대상을 확인할 수 없음",
      "override-target-mismatch": "가격 수정 대상이 카탈로그 항목과 일치하지 않음",
      "invocation-limit-exceeded": "하나 이상의 호출 토큰 한도 초과",
      "resource-unavailable": "현재 사용할 수 없는 자원",
      "api-route-not-confirmed": "API 이용 경로 미확인",
    },
  },
};

const en: BestFitUiCopy = {
  ...ko,
  hero: {
    eyebrow: "Work requirements · access routes · incremental cost",
    titleLine1: "Choose what fits the work,",
    titleLine2: "not the most expensive model.",
    description: "Compare subscriptions and APIs to meet the required quality while reducing avoidable spend and quota use. GPT-5.6 analyzes bounded workload requirements; deterministic code selects prices, providers, and final access routes.",
  },
  budget: {
    label: "Total incremental cash budget",
    help: "Includes API spend, new subscription commitments, and paid overage. Existing subscription fees are not charged again.",
    unconfirmedTitle: "Confirm the budget meaning",
    unconfirmedDescription: "A legacy API-only budget is never silently reinterpreted as total incremental cash. Confirm the same amount before Best-fit planning.",
    confirmedTitle: "Incremental cash budget confirmed",
    confirmedDescription: (date) => `You confirmed this meaning on ${date}.`,
    confirm: "Confirm as total incremental cash budget",
    revoke: "Revoke confirmation",
    invalid: "Enter a valid budget before confirming.",
  },
  resources: {
    ...ko.resources,
    eyebrow: "Available AI resources",
    title: "Owned and candidate subscriptions",
    description: "Enter remaining quota and the supported work surface. Real presets do not prove official execution access or capacity, so unresolved values remain conditional or excluded.",
    sessionOnly: "Resource drafts and per-fact observation times are stored as versioned raw source in this browser's latest LocalStorage v6 scenario. Restore re-resolves evidence and recalculates routes and ledgers.",
    addLegend: "Add a preset",
    addPreset: (name) => `Add ${name}`,
    maximumReached: "Supports one resource per preset, up to four resources.",
    emptyTitle: "No subscription resources added.",
    emptyDescription: "The API compatibility view remains available. Added subscriptions include their evidence state and conditional reasons.",
    resourceLegend: (index) => `AI resource ${index}`,
    remove: "Remove",
    nameLabel: "Display name",
    ownershipLabel: "Ownership",
    availabilityLabel: "Current availability",
    surfaceLabel: "Work surface",
    feeLabel: "Plan-period fee (USD)",
    existingFeeHelp: "An existing fee is informational and is not counted again as incremental cash.",
    newFeeHelp: "A selected new subscription is charged once for the complete plan.",
    quotaKindLabel: "Quota type",
    quotaUnitLabel: "Quota unit",
    includedLabel: "Included amount",
    remainingLabel: "Remaining amount",
    observedUseLabel: "Observed use per task",
    observedUseHelp: "Enter Low / Expected / High and the observation sample size. User observations are not confirmed evidence.",
    consumptionBasisLabel: "Consumption basis",
    taskBasis: "Per task",
    iterationBasis: "Per analysis iteration",
    sampleSizeLabel: "Observation sample size",
    opaqueDescriptionLabel: "Quota description",
    opaqueDescriptionPlaceholder: "For example: variable private limit based on usage",
    resetKindLabel: "Reset policy",
    nextResetLabel: "Next reset time",
    cadenceDaysLabel: "Reset cadence (days)",
    rollingHoursLabel: "Rolling window (hours)",
    conditionalNotice: "Persistence and restore never promote user input to provider-published evidence. Current real presets remain conditional or excluded; the API price compatibility view stays separate.",
    conditionalStatus: "Conditional resource",
    invalidStatus: "Input needs review",
    fieldError: "Check required fields and numeric ranges.",
    relinkTitle: "Reconnect the stored preset.",
    relinkDescription: "Choose a current preset to replace the old reference and reset preset-bound surface, quota, and reset fields to safe blank defaults. Display name, ownership, availability, and fee are preserved.",
    relinkLabel: "Replacement preset",
    relinkPlaceholder: "Choose a current preset",
    presets: {
      "chatgpt-like-variable": { name: "ChatGPT-like variable plan", description: "Record a descriptive limit without inventing an exact task count." },
      "github-copilot-like-credits": { name: "GitHub Copilot-like credits", description: "Enter remaining IDE/CLI credits and observed consumption." },
      "glm-like-rolling": { name: "GLM-like rolling quota", description: "Record a rolling window and user-observed capacity as conditional data." },
      "custom-subscription": { name: "Custom subscription", description: "A user-defined cloud subscription that claims neither arbitrary API access nor local execution." },
    },
  },
  overrides: {
    eyebrow: "Bounded catalog overrides",
    title: "Adjust verified API planning values",
    description: "Only planning tier and standard-text input/output prices for the existing nine entries can change.",
    sessionOnly: "User override source is recorded separately in LocalStorage v6 and Best-fit JSON v5/Markdown. Official defaults and evidence remain unchanged; restoring defaults deletes the user override entry.",
    accessBoundary: "A price or planning-tier override does not confirm access, capabilities, or invocation limits.",
    providerLabel: "Provider",
    catalogTierLabel: "Catalog entry",
    planningTierLabel: "Planning tier",
    keepDefaultTier: "Keep verified default tier",
    inputPriceLabel: "Input USD / 1M tokens",
    outputPriceLabel: "Output USD / 1M tokens",
    effectiveFromLabel: "Effective from",
    officialDefault: "Verified default",
    apply: "Apply override",
    restore: "Restore default",
    active: "Stored override source",
    userSupplied: "User-supplied",
    unresolvedSource: "Unresolved · not applied",
    futureSource: "Future schedule rejected · not applied",
    removeUnresolved: "Remove unresolved source",
    none: "No stored override source",
    applied: "Override applied.",
    restored: "Verified defaults restored.",
    removed: "Unresolved override source removed.",
    invalid: "Check the price, date, and tier values.",
  },
  results: {
    ...ko.results,
    eyebrow: "Best-fit route plan",
    title: "Access-route allocation with evidence boundaries",
    authorityNotice: "Stored source and exported audit snapshots are not authority. Unknown access, capability, subscription quota, and real non-authoritative presets never become confirmed executable routes.",
    exportDisclosure: "Best-fit JSON v5 and Markdown include structured routes, restorable resource/override source, and audit-only resolved evidence. Exported audit data is never restore authority; source must be re-resolved.",
    compatibilityView: "API price compatibility view",
    compatibilityDescription: "The existing provider comparison below uses only verified default standard-text prices and invocation limits. Persisted user overrides apply only to the Best-fit calculation above; this view is not complete Offering eligibility.",
    budgetRequiredTitle: "Best-fit planning is locked.",
    budgetRequiredDescription: "Confirm the total incremental cash budget to recalculate routes without another model request.",
    analysisRequiredTitle: "A Best-fit workload analysis is required.",
    analysisRequiredDescription: "The legacy API-only analysis remains preserved. Run Mock or Live analysis again to plan routes with the new workload contract.",
    calculationError: "The Best-fit routes could not be recalculated. Check the source inputs and try again.",
    totalIncrementalCash: "Total incremental cash",
    apiTaskPrice: "API task price (Low / Expected / High)",
    subscriptionMarginalCash: "Subscription marginal cash attribution (Low / Expected / High)",
    subscriptionMarginalCashNotice: "For a subscription route, this is the marginal amount attributed to the task at its deterministic reservation position. It is not a standalone task price; plan totals are authoritative. Cumulative integer rounding can make the three values non-monotonic.",
    apiSpend: "API spend",
    subscriptionUsage: "Subscription usage",
    newCommitment: "New subscription commitment",
    paidOverage: "Paid overage",
    expectedBudgetStatus: "Expected budget status",
    withinBudget: "Within budget",
    outsideBudget: "Over budget",
    highRisk: "The High scenario exceeds the budget.",
    noHighRisk: "The High scenario remains within budget.",
    avoidedSpend: "Avoided spend versus compatible all-Premium API use",
    additionalSpend: "Additional spend versus the Premium API baseline",
    noPremiumBaseline: "No compatible Premium API baseline is available, so no savings value is shown.",
    activeHeldInfeasible: (active, held, infeasible) => `Active ${active} · held ${held} · infeasible ${infeasible}`,
    taskNumber: (index) => `Task ${index}`,
    accessRoute: "Recommended access route",
    model: "Connected model",
    noConfirmedRoute: "No confirmed executable route",
    whyEnough: "Why this is enough",
    whyNotPremium: "Why not Premium",
    upgradeTriggers: "Upgrade triggers",
    alternative: "Alternative route",
    holdReason: "Hold reason",
    infeasibleReason: "Infeasible reason",
    holdReasonValue: "Expected incremental cash for confirmed routes exceeds the budget.",
    infeasibleReasonValue: "No access route is confirmed to meet this workload's requirements.",
    conditionalAlternatives: "Conditional subscription alternatives",
    excludedRoutes: "Routes excluded from confirmed candidates",
    unknownExclusionReason: "Unrecognized internal exclusion reason",
    resourceDiagnostics: "Subscription resource evidence",
    noSubscriptionUsage: "No confirmed subscription quota was allocated.",
    tasksUsingRoute: (taskIds) => `Assigned tasks: ${taskIds}`,
    usageUnit: (unit) => `Native unit: ${unit}`,
    usedRange: (low, expected, high) => `Used ${low} / ${expected} / ${high}`,
    remainingRange: (low, expected, high) => `Included remaining ${low} / ${expected} / ${high}`,
    overageRange: (low, expected, high) => `Overage ${low} / ${expected} / ${high}`,
    scenarioOverflow: "A scenario exceeds the display-safe integer range. Exact integers were retained for internal comparison.",
    generatedAt: (date) => `Deterministically recalculated as of ${date}`,
  },
  enums: {
    ...ko.enums,
    ownership: { owned: "Owned", "candidate-new": "Candidate new" },
    availability: { available: "Available", unavailable: "Unavailable", uncertain: "Uncertain" },
    quotaKind: { metered: "Metered", calibrated: "Calibrated percent", "initial-capacity": "New initial capacity", opaque: "Opaque / variable" },
    quotaUnit: { request: "request", credit: "credit", "percent-point": "percentage point" },
    resetKind: { none: "No reset", fixed: "Fixed time", rolling: "Rolling window", unknown: "Unknown" },
    surface: { chat: "Chat", "ide-cli": "IDE / CLI", batch: "Batch" },
    routeKind: { "owned-within-included-quota": "Owned included quota", api: "API", "owned-paid-overage": "Owned paid overage", "new-subscription": "New subscription" },
    whyEnough: { "minimum-quality-met": "Meets the minimum required quality.", "higher-tier-saved-cash": "A higher tier uses less incremental cash.", "quality-headroom-triggered": "One tier of headroom was applied by a closed trigger.", "minimum-quality-requires-premium": "Premium is the minimum sufficient route because no compatible lower route remains." },
    whyNotPremium: { "premium-selected": "Premium was selected.", "premium-not-triggered": "No Premium upgrade trigger applies.", "lower-tier-sufficient": "A lower tier satisfies the requirements.", "no-compatible-premium-api": "No compatible Premium API baseline is available." },
    upgradeTrigger: { "minimum-quality-requires-premium": "No compatible lower route", "high-failure-exposure": "High failure exposure", "deadline-retry-risk": "Deadline retry risk", "deep-reasoning": "Deep reasoning", "large-code-change": "Large code change" },
    exclusionReason: {
      "catalog-reference-unresolved": "Catalog reference unresolved", "catalog-version-mismatch": "Catalog version mismatch", "catalog-claim-mismatch": "Catalog claim mismatch", "preset-reference-unresolved": "Preset reference unresolved", "preset-version-mismatch": "Preset version mismatch", "connector-unverified": "Connector unverified", "connector-binding-mismatch": "Account binding mismatch", "connector-snapshot-stale": "Usage snapshot stale", "connector-snapshot-replayed": "Snapshot replay detected", "connector-receipt-invalid": "Connector receipt invalid", "evidence-authority-invalid": "Evidence authority unverified", "profile-unverified": "Eligibility profile unverified", "model-limits-incomplete": "Model limits incomplete", "access-limits-incomplete": "Access-route limits incomplete", "model-capabilities-incomplete": "Model capabilities incomplete", "access-capabilities-incomplete": "Access-route capabilities incomplete", "availability-uncertain": "Current availability uncertain", "consumption-user-observed": "Consumption is user-observed", "quota-calibrated": "Quota is observation-calibrated", "quota-opaque": "Exact quota is private", "quota-insufficient-observed": "Observed remaining quota is insufficient", "initial-capacity-unpublished": "New-plan initial capacity unpublished",
      "model-reference-missing": "Connected model reference missing",
      "surface-incompatible": "Incompatible with the required work surface",
      "below-minimum-quality": "Below the minimum quality tier",
      "required-capability-missing": "Required capability unsupported",
      "input-limit-exceeded": UI_COPY.en.enums.invocationFailure["input-limit-exceeded"],
      "output-limit-exceeded": UI_COPY.en.enums.invocationFailure["output-limit-exceeded"],
      "context-limit-exceeded": UI_COPY.en.enums.invocationFailure["context-limit-exceeded"],
      "price-schedule-not-applicable": "No applicable price schedule",
      "standard-price-input-limit-exceeded": "Outside the standard-price input band",
      "catalog-entry-not-found": "Catalog entry not found",
      "invalid-pricing-as-of": "Invalid pricing reference date",
      "catalog-price-schedule-invalid": "Invalid catalog price schedule",
      "catalog-invocation-limits-unresolved": "Catalog invocation limits unresolved",
      "invalid-token-scenarios": "Invalid token scenarios",
      "invalid-user-override": "Invalid user price override",
      "override-target-unresolved": "Override target unresolved",
      "override-target-mismatch": "Override target does not match the catalog entry",
      "invocation-limit-exceeded": "One or more invocation token limits exceeded",
      "resource-unavailable": "Resource is currently unavailable",
      "api-route-not-confirmed": "API route is not confirmed",
    },
  },
};

const ja: BestFitUiCopy = {
  ...en,
  hero: {
    eyebrow: "作業要件・利用経路・追加支出",
    titleLine1: "最も高価なモデルではなく、",
    titleLine2: "作業に合う選択を。",
    description: "サブスクリプションとAPIを比較し、必要な品質を守りながら不要な支出と利用枠の消費を減らします。GPT-5.6は限定された作業要件だけを分析し、価格・提供者・最終経路は決定論的なプログラムが計算します。",
  },
  budget: {
    label: "追加支出の総予算",
    help: "API料金、新規サブスクリプション契約、従量超過料金を含みます。既存のサブスクリプション料金は再加算しません。",
    unconfirmedTitle: "予算の意味を確認してください",
    unconfirmedDescription: "従来のAPI専用予算を追加支出の総予算へ自動変換しません。Best-fit計画の前に同じ金額の意味を明示的に確認してください。",
    confirmedTitle: "追加支出の総予算を確認済み",
    confirmedDescription: (date) => `${date}にこの意味を確認しました。`,
    confirm: "追加支出の総予算として確認",
    revoke: "確認を取り消す",
    invalid: "有効な予算を入力してから確認してください。",
  },
  resources: {
    ...en.resources,
    eyebrow: "利用可能なAIリソース",
    title: "保有中および検討中のサブスクリプション",
    description: "残りの利用枠と作業環境を入力します。実在プリセットは公式の実行権限や容量を証明しないため、未解決の値は条件付きまたは除外として表示します。",
    sessionOnly: "リソースdraftと項目別の観測時刻は、このブラウザの最新シナリオにversioned raw sourceとしてLocalStorage v6へ保存します。復元時に根拠を再解決し、ルートとledgerを再計算します。",
    addLegend: "プリセットを追加",
    addPreset: (name) => `${name}を追加`,
    maximumReached: "各プリセット1件、最大4件をサポートします。",
    emptyTitle: "追加されたサブスクリプションはありません。",
    emptyDescription: "API互換性ビューは引き続き利用できます。追加したサブスクリプションには根拠状態と条件理由を表示します。",
    resourceLegend: (index) => `AIリソース ${index}`,
    remove: "削除",
    nameLabel: "表示名",
    ownershipLabel: "保有状態",
    availabilityLabel: "現在の可用性",
    surfaceLabel: "利用環境",
    feeLabel: "プラン期間料金（USD）",
    existingFeeHelp: "既存料金は参考情報であり、追加支出として再計上しません。",
    newFeeHelp: "新規サブスクリプションを選ぶ場合、計画全体で一度だけ加算します。",
    quotaKindLabel: "利用枠の種類",
    quotaUnitLabel: "利用枠の単位",
    includedLabel: "含まれる量",
    remainingLabel: "残り",
    observedUseLabel: "1作業あたりの観測使用量",
    observedUseHelp: "Low / Expected / Highと観測サンプル数を入力します。ユーザー観測値は確定根拠ではありません。",
    consumptionBasisLabel: "使用量の基準",
    taskBasis: "作業1件あたり",
    iterationBasis: "分析反復1回あたり",
    sampleSizeLabel: "観測サンプル数",
    opaqueDescriptionLabel: "利用枠の説明",
    opaqueDescriptionPlaceholder: "例：使用状況によって変動する非公開上限",
    resetKindLabel: "リセット方式",
    nextResetLabel: "次回リセット時刻",
    cadenceDaysLabel: "リセット周期（日）",
    rollingHoursLabel: "ローリング期間（時間）",
    conditionalNotice: "保存・復元してもユーザー入力を提供者公開の根拠へ昇格しません。現在の実在プリセットは条件付きまたは除外のままで、API価格互換性ビューは別に提供します。",
    conditionalStatus: "条件付きリソース",
    invalidStatus: "入力の確認が必要",
    fieldError: "必須項目と数値範囲を確認してください。",
    relinkTitle: "保存されたプリセットを再接続してください。",
    relinkDescription: "現在のプリセットを選ぶと古い参照を置き換え、プリセット依存の利用環境・利用枠・リセット項目を安全な空の既定値へ戻します。表示名、保有状態、可用性、料金は保持します。",
    relinkLabel: "代替プリセット",
    relinkPlaceholder: "現在のプリセットを選択",
    presets: {
      "chatgpt-like-variable": { name: "ChatGPT型の可変プラン", description: "正確な作業数を作らず、説明形式の上限として記録します。" },
      "github-copilot-like-credits": { name: "GitHub Copilot型クレジット", description: "IDE/CLI用の残りクレジットと観測消費量を入力します。" },
      "glm-like-rolling": { name: "GLM型ローリング枠", description: "ローリング期間と観測上限を条件付き情報として記録します。" },
      "custom-subscription": { name: "カスタムサブスクリプション", description: "任意のAPIアクセスやローカル実行を主張しないユーザー定義クラウド契約です。" },
    },
  },
  overrides: {
    eyebrow: "限定カタログ修正",
    title: "検証済みAPI計画値の調整",
    description: "既存9項目の計画ティアと標準テキスト入出力価格だけを変更できます。",
    sessionOnly: "ユーザー修正sourceはLocalStorage v6とBest-fit JSON v5/Markdownへ別に記録します。公式既定値と根拠は変更せず、既定値への復元はユーザー修正項目を削除します。",
    accessBoundary: "価格や計画ティアの変更は、アクセス権・機能対応・呼び出し上限を確認するものではありません。",
    providerLabel: "提供者",
    catalogTierLabel: "カタログ項目",
    planningTierLabel: "計画ティア",
    keepDefaultTier: "検証済み既定ティアを維持",
    inputPriceLabel: "入力 USD / 1M tokens",
    outputPriceLabel: "出力 USD / 1M tokens",
    effectiveFromLabel: "適用開始日",
    officialDefault: "検証済み既定値",
    apply: "修正を適用",
    restore: "既定値に戻す",
    active: "保存済みoverride source",
    userSupplied: "ユーザー入力",
    unresolvedSource: "未解決 · 未適用",
    futureSource: "将来予約を拒否・未適用",
    removeUnresolved: "未解決sourceを削除",
    none: "保存済みoverride sourceなし",
    applied: "修正値を適用しました。",
    restored: "検証済み既定値に戻しました。",
    removed: "未解決override sourceを削除しました。",
    invalid: "価格、日付、ティアの入力を確認してください。",
  },
  results: {
    ...en.results,
    eyebrow: "Best-fit経路計画",
    title: "根拠境界を守る利用経路の配分",
    authorityNotice: "保存済みsourceとexport済みaudit snapshotも権限ではありません。未確認のアクセス権・機能・利用枠と非権威の実在プリセットを確定実行経路へ昇格しません。",
    exportDisclosure: "Best-fit JSON v5とMarkdownには構造化route、復元可能なresource/override source、audit-onlyの解決済み根拠が含まれます。export済みauditは復元権限ではなく、sourceを再解決します。",
    compatibilityView: "API価格互換性ビュー",
    compatibilityDescription: "下の既存比較は検証済みの標準テキスト既定価格と呼び出し上限だけを使う参考表示です。保存済みユーザー修正値は上のBest-fit計算だけに適用され、この表示はOffering適格性の完全な確認ではありません。",
    budgetRequiredTitle: "Best-fit計画はまだロックされています。",
    budgetRequiredDescription: "追加支出の総予算を確認すると、モデルを再呼び出しせずに経路を再計算します。",
    analysisRequiredTitle: "Best-fit用の作業分析が必要です。",
    analysisRequiredDescription: "従来のAPI専用分析は保持されます。MockまたはLive分析を再実行すると、新しい作業契約で経路を計画します。",
    calculationError: "Best-fit経路を再計算できませんでした。入力値を確認してもう一度お試しください。",
    totalIncrementalCash: "追加支出の合計",
    apiTaskPrice: "API作業価格（Low / Expected / High）",
    subscriptionMarginalCash: "サブスクリプション限界支出の帰属額（Low / Expected / High）",
    subscriptionMarginalCashNotice: "サブスクリプション経路では、決定論的な予約順序上の位置でこの作業に帰属する限界額です。独立した作業価格ではなく、計画全体の合計が正式な値です。整数の累積丸めにより、3つの値が単調にならない場合があります。",
    apiSpend: "API支出",
    subscriptionUsage: "サブスクリプション使用量",
    newCommitment: "新規サブスクリプション契約額",
    paidOverage: "従量超過料金",
    expectedBudgetStatus: "Expected予算状態",
    withinBudget: "予算内",
    outsideBudget: "予算超過",
    highRisk: "Highシナリオは予算を超えます。",
    noHighRisk: "Highシナリオも予算内です。",
    avoidedSpend: "互換性のある全Premium API利用に対する回避支出",
    additionalSpend: "Premium API基準より追加される支出",
    noPremiumBaseline: "互換性のあるPremium API基準がないため、節約額を表示しません。",
    activeHeldInfeasible: (active, held, infeasible) => `実行 ${active}・保留 ${held}・実行不可 ${infeasible}`,
    taskNumber: (index) => `作業 ${index}`,
    accessRoute: "推奨利用経路",
    model: "接続モデル",
    noConfirmedRoute: "確認済み実行経路なし",
    whyEnough: "この経路で十分な理由",
    whyNotPremium: "Premiumを選ばない理由",
    upgradeTriggers: "アップグレード条件",
    alternative: "代替経路",
    holdReason: "保留理由",
    infeasibleReason: "実行不可の理由",
    holdReasonValue: "確認済み経路のExpected追加支出が予算を超えています。",
    infeasibleReasonValue: "この作業要件を満たすと確認された利用経路がありません。",
    conditionalAlternatives: "条件付きサブスクリプション候補",
    excludedRoutes: "確定候補から除外された経路",
    unknownExclusionReason: "認識できない内部除外理由",
    resourceDiagnostics: "サブスクリプション資源の根拠状態",
    noSubscriptionUsage: "確定配分で使用されたサブスクリプション枠はありません。",
    tasksUsingRoute: (taskIds) => `割り当て作業：${taskIds}`,
    usageUnit: (unit) => `基本単位：${unit}`,
    usedRange: (low, expected, high) => `使用量 ${low} / ${expected} / ${high}`,
    remainingRange: (low, expected, high) => `残りの包含量 ${low} / ${expected} / ${high}`,
    overageRange: (low, expected, high) => `超過使用 ${low} / ${expected} / ${high}`,
    scenarioOverflow: "表示可能な整数範囲を超えたシナリオがあります。内部比較には正確な整数を使用しました。",
    generatedAt: (date) => `${date}時点の決定論的再計算`,
  },
  enums: {
    ...en.enums,
    ownership: { owned: "保有中", "candidate-new": "新規検討" },
    availability: { available: "利用可能", unavailable: "利用不可", uncertain: "不確実" },
    quotaKind: { metered: "従量型", calibrated: "残量率の補正型", "initial-capacity": "新規初期枠", opaque: "非公開・可変" },
    quotaUnit: { request: "リクエスト", credit: "クレジット", "percent-point": "パーセントポイント" },
    resetKind: { none: "リセットなし", fixed: "固定時刻", rolling: "ローリング期間", unknown: "不明" },
    surface: { chat: "チャット", "ide-cli": "IDE / CLI", batch: "バッチ" },
    routeKind: { "owned-within-included-quota": "保有契約の包含枠", api: "API", "owned-paid-overage": "保有契約の従量超過", "new-subscription": "新規サブスクリプション" },
    whyEnough: { "minimum-quality-met": "必要な最低品質を満たします。", "higher-tier-saved-cash": "上位ティアの方が追加支出を抑えます。", "quality-headroom-triggered": "閉じた条件により1ティアの余裕を適用しました。", "minimum-quality-requires-premium": "互換性のある下位経路がないため、Premiumが最低限十分な経路です。" },
    whyNotPremium: { "premium-selected": "Premium経路を選択しました。", "premium-not-triggered": "Premiumへのアップグレード条件がありません。", "lower-tier-sufficient": "下位ティアで要件を満たします。", "no-compatible-premium-api": "互換性のあるPremium API基準がありません。" },
    upgradeTrigger: { "minimum-quality-requires-premium": "互換性のある下位経路なし", "high-failure-exposure": "高い失敗影響", "deadline-retry-risk": "期限前の再試行リスク", "deep-reasoning": "深い推論", "large-code-change": "大規模コード変更" },
    exclusionReason: {
      "catalog-reference-unresolved": "カタログ参照を解決できない", "catalog-version-mismatch": "カタログバージョン不一致", "catalog-claim-mismatch": "カタログ主張の不一致", "preset-reference-unresolved": "プリセット参照を解決できない", "preset-version-mismatch": "プリセットバージョン不一致", "connector-unverified": "コネクタ未検証", "connector-binding-mismatch": "アカウント接続の不一致", "connector-snapshot-stale": "使用量スナップショットの期限切れ", "connector-snapshot-replayed": "スナップショット再利用を検出", "connector-receipt-invalid": "コネクタ受領情報が無効", "evidence-authority-invalid": "根拠権限が未確認", "profile-unverified": "適格性プロファイル未検証", "model-limits-incomplete": "モデル上限情報が不完全", "access-limits-incomplete": "利用経路の上限情報が不完全", "model-capabilities-incomplete": "モデル機能情報が不完全", "access-capabilities-incomplete": "利用経路の機能情報が不完全", "availability-uncertain": "現在の可用性が不確実", "consumption-user-observed": "使用量がユーザー観測値", "quota-calibrated": "利用枠が観測値で補正済み", "quota-opaque": "正確な利用枠が非公開", "quota-insufficient-observed": "観測された残量が不足", "initial-capacity-unpublished": "新規プランの初期枠が未公開",
      "model-reference-missing": "接続モデルの参照なし",
      "surface-incompatible": "必要な利用環境と互換性なし",
      "below-minimum-quality": "最低品質ティア未満",
      "required-capability-missing": "必須機能に未対応",
      "input-limit-exceeded": UI_COPY.ja.enums.invocationFailure["input-limit-exceeded"],
      "output-limit-exceeded": UI_COPY.ja.enums.invocationFailure["output-limit-exceeded"],
      "context-limit-exceeded": UI_COPY.ja.enums.invocationFailure["context-limit-exceeded"],
      "price-schedule-not-applicable": "適用可能な価格スケジュールなし",
      "standard-price-input-limit-exceeded": "標準価格の入力範囲外",
      "catalog-entry-not-found": "カタログ項目なし",
      "invalid-pricing-as-of": "価格基準日が無効",
      "catalog-price-schedule-invalid": "カタログ価格スケジュールが無効",
      "catalog-invocation-limits-unresolved": "カタログの呼び出し上限を確認できない",
      "invalid-token-scenarios": "トークンシナリオが無効",
      "invalid-user-override": "ユーザー価格修正値が無効",
      "override-target-unresolved": "価格修正対象を確認できない",
      "override-target-mismatch": "価格修正対象がカタログ項目と一致しない",
      "invocation-limit-exceeded": "1つ以上の呼び出しトークン上限超過",
      "resource-unavailable": "現在利用できないリソース",
      "api-route-not-confirmed": "API経路が未確認",
    },
  },
};

export const BEST_FIT_UI_COPY: Readonly<Record<UiLocale, BestFitUiCopy>> =
  Object.freeze({ ko, en, ja });

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
  validation: {
    title: string;
    description: string;
    budgetDescription: string;
    checkField: (field: string) => string;
    close: string;
  };
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
    requirementHelp: string;
    requiredField: string;
    optionalField: string;
    addLegend: string;
    presetSelectLabel: string;
    presetSelectPlaceholder: string;
    addSelected: string;
    maximumReached: string;
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
    quotaGuide: {
      open: string;
      title: string;
      intro: string;
      recordTitle: string;
      recordDescription: string;
      unknown: string;
      officialLink: string;
      close: string;
      presets: Record<
        SubscriptionPresetId,
        { title: string; steps: readonly string[] }
      >;
    };
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
    resetKindLabel: string;
    nextResetLabel: string;
    cadenceDaysLabel: string;
    rollingHoursLabel: string;
    rollingHoursHelp: string;
    conditionalNotice: string;
    conditionalStatus: string;
    invalidStatus: string;
    fieldError: string;
    fieldsToCheck: string;
    technicalDetails: string;
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
    savedSources: string;
    userSupplied: string;
    unresolvedSource: string;
    futureSource: string;
    removeUnresolved: string;
    none: string;
    applied: string;
    restored: string;
    removed: string;
    invalid: string;
    validationTitle: string;
    validationDescription: string;
    inputPriceRequired: string;
    outputPriceRequired: string;
    priceInvalid: string;
    effectiveDateInvalid: string;
    noChanges: string;
    maximumSources: string;
    validationClose: string;
  };
  results: {
    eyebrow: string;
    title: string;
    authorityNotice: string;
    exportDisclosure: string;
    compatibilityView: string;
    compatibilityDescription: string;
    referencePlanView: string;
    referencePlanDescription: string;
    referenceSummaryEyebrow: string;
    referenceSummaryTitle: string;
    referenceSummaryDescription: string;
    referenceProviderChoice: string;
    referenceExpectedTotal: string;
    referenceIncludedTasks: (active: number, total: number) => string;
    referenceTaskModel: string;
    referenceTaskExpectedCost: string;
    referenceHeldTask: string;
    referenceInfeasibleTask: string;
    referenceOpenDetails: string;
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
    budgetNotAssessed: string;
    budgetNotAssessedDescription: string;
    excludedCostNoticeTitle: string;
    excludedCostNotice: (count: number, allTasks: boolean) => string;
    avoidedSpend: string;
    additionalSpend: string;
    noPremiumBaseline: string;
    activeHeldInfeasible: (active: number, held: number, infeasible: number) => string;
    taskNumber: (index: number) => string;
    accessRoute: string;
    model: string;
    noConfirmedRoute: string;
    whyEnough: string;
    premiumChoice: string;
    upgradeTriggers: string;
    alternative: string;
    holdReason: string;
    infeasibleReason: string;
    holdReasonValue: string;
    infeasibleReasonValue: string;
    needsVerificationStatus: string;
    requirementsUnmetStatus: string;
    apiSetupTitle: string;
    apiSetupDescription: string;
    apiSetupPrivacy: string;
    apiSetupLink: (providerName: string) => string;
    infeasibleHelp: {
      open: string;
      title: (taskName: string) => string;
      intro: string;
      reviewedRoutes: (count: number) => string;
      causesTitle: string;
      noCause: string;
      resourceIssuesTitle: string;
      resourceIssue: (resourceName: string, fields: string) => string;
      inputProblemTitle: string;
      inputProblemDescription: string;
      inputProblemCaveat: string;
      systemProblemTitle: string;
      systemProblemDescription: string;
      systemProblemStatus: string;
      accountStatusNotice: string;
      systemTaskConstraintNote: string;
      taskProblemTitle: string;
      taskProblemDescription: string;
      genericProblemTitle: string;
      genericProblemDescription: string;
      goToResourceInput: string;
      reviewTaskInput: string;
      showRouteDetails: string;
      viewReferencePlan: string;
      nextStepsTitle: string;
      guidance: {
        providerVerification: string;
        resourceSettings: string;
        workloadScope: string;
        qualityRequirements: string;
        pricingData: string;
        technicalConfiguration: string;
        reviewDetails: string;
      };
      detailHint: string;
      close: string;
    };
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
  validation: {
    title: "입력을 마무리해 주세요",
    description: "다음 항목 때문에 계획을 만들 수 없습니다.",
    budgetDescription: "다음 항목 때문에 예산을 확인할 수 없습니다.",
    checkField: (field) => `${field} 항목을 확인해 주세요.`,
    close: "입력으로 돌아가기",
  },
  hero: {
    eyebrow: "작업 입력 → 예산·구독 설정 → 맞춤 계획 확인",
    titleLine1: "가장 비싼 모델보다",
    titleLine2: "작업에 맞는 선택을",
    description:
      "할 일과 예산을 입력하면, 이용 중인 AI 구독과 API를 비교해 작업별 이용 방법과 예상 비용을 정리합니다.",
  },
  budget: {
    label: "추가로 쓸 수 있는 금액",
    help: "추가로 쓸 수 있는 최대 금액입니다.",
    unconfirmedTitle: "예산 범위를 확인해 주세요",
    unconfirmedDescription:
      "API 사용료와 새로 선택하는 구독료까지 포함한 총액인지 확인해 주세요.",
    confirmedTitle: "예산 확인 완료",
    confirmedDescription: (date) => `${date}에 확인했습니다.`,
    confirm: "이 금액으로 계획하기",
    revoke: "확인 취소",
    invalid: "유효한 예산을 입력한 뒤 확인하세요.",
  },
  resources: {
    eyebrow: "선택 사항",
    title: "이용 중인 AI 구독",
    description:
      "ChatGPT나 Copilot 같은 구독이 있다면 추가하세요. 정확한 크레딧을 몰라도 되며, 구독이 없다면 건너뛸 수 있습니다.",
    sessionOnly: "입력 내용은 이 브라우저에 저장되며 복원할 때 계획을 다시 계산합니다.",
    requirementHelp: "구독 추가는 선택입니다. 카드를 추가했다면 ‘필수’ 표시가 있는 항목만 반드시 입력해 주세요.",
    requiredField: "필수",
    optionalField: "선택",
    addLegend: "AI 구독 추가",
    presetSelectLabel: "추가할 AI 구독",
    presetSelectPlaceholder: "구독 종류 선택",
    addSelected: "추가",
    maximumReached: "프리셋당 자원 1개, 최대 4개를 지원합니다.",
    resourceLegend: (index) => `AI 구독 ${index}`,
    remove: "제거",
    nameLabel: "표시 이름",
    ownershipLabel: "이 구독을 보유하고 있나요?",
    availabilityLabel: "지금 사용할 수 있나요?",
    surfaceLabel: "주로 어디서 사용하나요?",
    feeLabel: "이번 결제 기간 요금 (USD)",
    existingFeeHelp: "이미 내는 구독료는 새 비용에 다시 더하지 않습니다.",
    newFeeHelp: "새 구독을 선택하면 계획 전체에 한 번만 더합니다.",
    quotaKindLabel: "한도를 얼마나 알고 있나요?",
    quotaGuide: {
      open: "한도 확인 방법",
      title: "구독 한도는 어디서 확인하나요?",
      intro:
        "공식 서비스에 로그인한 뒤 아래 경로를 확인하세요. 메뉴 이름은 서비스 업데이트에 따라 달라질 수 있습니다.",
      recordTitle: "어떤 값을 옮기면 되나요?",
      recordDescription:
        "공식 화면의 포함량, 남은 양, 사용률, 초기화 시간만 그대로 입력하세요. 작업당 사용량은 직접 관측한 경우에만 별도로 입력합니다.",
      unknown:
        "숫자가 보이지 않으면 추정하지 말고 ‘정확히 모름’을 선택해도 됩니다.",
      officialLink: "공식 안내·서비스 열기 (새 탭)",
      close: "닫기",
      presets: {
        "chatgpt-like-variable": {
          title: "ChatGPT",
          steps: [
            "ChatGPT에 로그인한 뒤 현재 이용 중인 요금제를 확인합니다.",
            "모델 선택기와 화면에 표시되는 한도·초기화 안내를 확인합니다. 정확한 남은 횟수가 항상 표시되는 것은 아닙니다.",
          ],
        },
        "github-copilot-like-credits": {
          title: "GitHub Copilot",
          steps: [
            "GitHub의 Settings → Billing & licensing을 열고 Metered usage의 Copilot 또는 AI usage를 확인합니다.",
            "포함된 AI credits 사용량을 확인합니다. VS Code에서는 상태 표시줄의 Copilot 아이콘으로 한도 진행률과 초기화 날짜도 볼 수 있습니다.",
          ],
        },
        "glm-like-rolling": {
          title: "GLM Coding Plan",
          steps: [
            "ZCode에서 Usage Stats → Coding Plan을 엽니다. Z.ai Subscription 페이지에서도 구독 상태를 확인할 수 있습니다.",
            "5시간·주간 한도의 진행률과 남은 양을 확인합니다.",
          ],
        },
        "custom-subscription": {
          title: "기타 구독",
          steps: [
            "공급자 공식 사이트에서 Account, Plan, Billing, Usage 또는 Limits 메뉴를 찾습니다.",
            "공식 화면에 실제로 표시되는 값만 입력하고, 표시되지 않는 값은 비워 둡니다.",
          ],
        },
      },
    },
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
    opaqueDescriptionLabel: "한도 메모",
    resetKindLabel: "한도는 언제 초기화되나요?",
    nextResetLabel: "다음 초기화 시각",
    cadenceDaysLabel: "초기화 주기 (일)",
    rollingHoursLabel: "사용분이 돌아오는 시간 (시간)",
    rollingHoursHelp: "예: 24를 입력하면 지금 사용한 양이 24시간 뒤 한도 계산에서 빠집니다.",
    conditionalNotice: "저장·복원해도 사용자 입력은 공식 제공자 근거로 승격되지 않습니다. 현재 실제 프리셋은 조건부 또는 제외 상태로 남으며 API 가격 호환성 보기는 별도로 제공합니다.",
    conditionalStatus: "참고 정보",
    invalidStatus: "입력 마무리 필요",
    fieldError: "표시 이름, 사용 환경, 요금을 확인하세요. 상세 설정을 선택했다면 해당 값도 모두 입력해야 합니다.",
    fieldsToCheck: "다음 항목을 확인해 주세요",
    technicalDetails: "기술 세부정보 보기",
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
        description: "정확한 크레딧을 몰라도 IDE/CLI 구독으로 추가할 수 있습니다.",
      },
      "glm-like-rolling": {
        name: "GLM 유형 시간 경과 복구 한도",
        description: "사용한 양이 일정 시간 뒤 차례로 돌아오는 유형입니다. 정확한 시간을 몰라도 추가할 수 있습니다.",
      },
      "custom-subscription": {
        name: "사용자 지정 구독",
        description: "특정 API나 로컬 실행을 주장하지 않는 사용자 정의 클라우드 구독입니다.",
      },
    },
  },
  overrides: {
    eyebrow: "고급 설정 · 선택",
    title: "API 가격을 직접 수정하려면 펼치기",
    description: "공식 기본 가격과 다른 값을 시험할 때만 사용합니다.",
    sessionOnly: "직접 입력한 값은 공식 기본값과 별도로 이 브라우저와 내보내기 파일에 저장됩니다. 기본값 복원 시 사용자 값만 삭제합니다.",
    accessBoundary: "가격을 바꿔도 실제 이용 권한이나 기능 지원이 확인되는 것은 아닙니다.",
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
    active: "적용 중인 사용자 설정",
    savedSources: "저장된 사용자 가격 설정",
    userSupplied: "사용자 입력",
    unresolvedSource: "미해결 · 적용되지 않음",
    futureSource: "미래 예약 거부 · 적용되지 않음",
    removeUnresolved: "미해결 source 삭제",
    none: "저장된 사용자 가격 설정 없음",
    applied: "수정값을 적용했습니다.",
    restored: "공식 기본값으로 복원했습니다.",
    removed: "미해결 override source를 삭제했습니다.",
    invalid: "가격, 날짜 또는 등급 입력을 확인하세요.",
    validationTitle: "API 가격 수정 입력을 확인해 주세요",
    validationDescription: "다음 항목 때문에 수정값을 적용할 수 없습니다.",
    inputPriceRequired: "출력 가격을 입력했다면 입력 가격도 입력해야 합니다.",
    outputPriceRequired: "입력 가격을 입력했다면 출력 가격도 입력해야 합니다.",
    priceInvalid: "입력·출력 가격은 0~1,000,000 사이이며 소수점 아래 최대 6자리여야 합니다.",
    effectiveDateInvalid: "적용 시작일은 비워 둘 수 없으며 현재 계산 기준일보다 미래일 수 없습니다.",
    noChanges: "계획 등급이나 입력·출력 가격 중 하나 이상을 수정해 주세요.",
    maximumSources: "사용자 가격 설정은 최대 9개까지 저장할 수 있습니다. 기존 설정을 복원하거나 삭제한 뒤 다시 시도해 주세요.",
    validationClose: "입력으로 돌아가기",
  },
  results: {
    eyebrow: "맞춤 작업 계획",
    title: "작업별 추천 이용 방법과 예상 비용",
    authorityNotice: "확인되지 않은 구독 한도나 접근 권한은 확정된 실행 방법으로 표시하지 않습니다.",
    exportDisclosure: "내보낸 파일에는 계획 결과와 입력값이 포함됩니다. 다시 불러올 때는 현재 기준으로 입력값을 다시 확인하고 계산합니다.",
    compatibilityView: "공급자별 상세 비교 (선택)",
    compatibilityDescription: "모델별 가격과 계산 근거가 필요한 경우에만 펼쳐보세요.",
    referencePlanView: "참고 API 계획 상세 보기 (선택)",
    referencePlanDescription: "공급자별 가격, 모델, 토큰 계산 근거가 더 필요할 때만 펼쳐보세요.",
    referenceSummaryEyebrow: "확정 결과와 분리된 참고 정보",
    referenceSummaryTitle: "검증 전 참고 API 비용계획",
    referenceSummaryDescription: "현재 확정 경로는 없지만 표준 API 가격과 토큰 한도만으로 예상 모델과 비용을 계산했습니다. 이 참고 계산은 작업 기능 적격성과 개인 계정의 사용 가능 상태를 판정하지 않으며, 위 확정 비용·예산 판정에는 포함되지 않습니다.",
    referenceProviderChoice: "공급자별 참고 비용",
    referenceExpectedTotal: "Expected 참고 총비용",
    referenceIncludedTasks: (active, total) => `비용 계산 포함 ${active}/${total}개 작업`,
    referenceTaskModel: "참고 모델",
    referenceTaskExpectedCost: "Expected 참고 비용",
    referenceHeldTask: "예산상 참고 계산에서 보류",
    referenceInfeasibleTask: "호출 한도상 참고 비용 계산 불가",
    referenceOpenDetails: "공급자·모델별 상세 계산 보기",
    budgetRequiredTitle: "예산 확인이 필요합니다.",
    budgetRequiredDescription: "입력한 금액의 범위를 확인하면 분석을 다시 실행하지 않고 작업 계획을 계산합니다.",
    analysisRequiredTitle: "새 방식으로 작업을 분석해 주세요.",
    analysisRequiredDescription: "저장된 이전 결과는 유지됩니다. 예시 또는 실제 분석으로 새 계획을 만들 수 있습니다.",
    calculationError: "작업 계획을 다시 계산하지 못했습니다. 입력값을 확인한 뒤 다시 시도하세요.",
    totalIncrementalCash: "새로 필요한 총비용",
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
    budgetNotAssessed: "예산 판정 보류",
    budgetNotAssessedDescription: "비용을 계산할 확정 경로가 없어 예산 상태를 판단하지 않았습니다.",
    excludedCostNoticeTitle: "표시된 비용을 먼저 확인해 주세요",
    excludedCostNotice: (count, allTasks) =>
      allTasks
        ? `작업 ${count}건 모두 확정 경로가 없어 비용 합계에서 제외되었습니다. US$0.00은 모든 작업을 무료로 실행할 수 있다는 뜻이 아닙니다.`
        : `확정 경로가 없는 작업 ${count}건의 비용은 합계와 예산 판정에서 제외되었습니다.`,
    avoidedSpend: "호환 가능한 Premium API 일괄 사용 대비 회피 비용",
    additionalSpend: "Premium API 기준보다 추가되는 비용",
    noPremiumBaseline: "호환 가능한 Premium API 기준선이 없어 절감액을 계산하지 않습니다.",
    activeHeldInfeasible: (active, held, infeasible) => `실행 ${active} · 보류 ${held} · 실행 불가 ${infeasible}`,
    taskNumber: (index) => `작업 ${index}`,
    accessRoute: "추천 이용 경로",
    model: "연결 모델",
    noConfirmedRoute: "확인된 실행 경로 없음",
    whyEnough: "이 경로가 충분한 이유",
    premiumChoice: "Premium 선택",
    upgradeTriggers: "상향 조건",
    alternative: "대체 경로",
    holdReason: "보류 이유",
    infeasibleReason: "실행 불가 이유",
    holdReasonValue: "확인된 이용 방법의 예상 추가 비용이 예산을 초과합니다.",
    infeasibleReasonValue: "작업 요구사항을 충족한다고 확인된 이용 경로가 없습니다.",
    needsVerificationStatus: "경로 확인 필요",
    requirementsUnmetStatus: "조건 불충족",
    apiSetupTitle: "실행 전 API 준비",
    apiSetupDescription: "계획은 공식 모델/API 정보로 계산했습니다. 실제 실행 전에는 아래 공급자의 계정, 결제 설정과 API 키를 확인해 주세요.",
    apiSetupPrivacy: "이 앱은 API 키를 요청하거나 저장하지 않으며, 개인 계정의 사용 가능 상태를 검사하지 않습니다.",
    apiSetupLink: (providerName) => `${providerName} 설정 안내 열기`,
    infeasibleHelp: {
      open: "왜 경로를 확정하지 못했나요?",
      title: (taskName) => `${taskName}: 경로를 확정하지 못한 이유`,
      intro: "확정 경로가 없는 이유와 지금 할 수 있는 조치를 구분해 안내합니다.",
      reviewedRoutes: (count) => `검토한 이용 경로 ${count}개`,
      causesTitle: "이번 계산에서 확인되지 않은 부분",
      noCause: "세부 제외 사유를 확인하지 못했습니다.",
      resourceIssuesTitle: "계획 전체에서 미완성된 구독 입력",
      resourceIssue: (resourceName, fields) => `${resourceName}: ${fields}`,
      inputProblemTitle: "먼저 완료할 구독 입력이 있습니다",
      inputProblemDescription: "계획 전체에 미완성 구독 카드가 있습니다. 아래 필수 항목을 확인해 주세요.",
      inputProblemCaveat: "필수 입력을 완료해도 앱에 모델/API 기능이나 한도 정보가 없는 경로는 확정할 수 없습니다.",
      systemProblemTitle: "사용자가 고칠 입력은 없습니다",
      systemProblemDescription: "앱에 저장된 모델/API 정보에 이 작업을 판단할 기능이나 한도가 빠져 있거나 현재 경로와 연결되지 않았습니다. 입력을 더 채워도 해결되지 않습니다.",
      systemProblemStatus: "지금은 예상 모델과 비용을 아래 참고 계획에서 확인할 수 있습니다.",
      accountStatusNotice: "이 판정은 개인 계정이나 API 키가 현재 사용할 수 있는 상태인지 검사한 결과가 아닙니다.",
      systemTaskConstraintNote: "일부 경로는 입력·출력 한도, 최소 품질 또는 필수 기능 조건도 충족하지 못했습니다.",
      taskProblemTitle: "현재 작업 조건을 만족하는 경로가 없습니다",
      taskProblemDescription: "작업을 더 작은 단위로 나누거나 필요한 산출물 범위를 검토한 뒤 다시 분석해 주세요. 변경해도 경로 확정이 보장되지는 않습니다.",
      genericProblemTitle: "경로별 상세 사유를 확인해 주세요",
      genericProblemDescription: "현재 화면에서 바로 고칠 수 있는 입력을 찾지 못했습니다. 후보마다 제외된 이유를 확인할 수 있습니다.",
      goToResourceInput: "첫 번째 필수 입력으로 이동",
      reviewTaskInput: "작업 입력 검토하기",
      showRouteDetails: "경로별 상세 사유 보기",
      viewReferencePlan: "검증 전 참고 계획 보기",
      nextStepsTitle: "확인하거나 바꿀 수 있는 방법",
      guidance: {
        providerVerification: "앱에 저장된 이 모델/API 경로의 기능이나 한도 정보가 빠져 있거나 연결되지 않았습니다. 아래 경로는 가격과 등록된 한도만 사용한 참고 후보이며, 개인 계정이나 API 키의 사용 가능 여부는 별도로 확인해야 합니다.",
        resourceSettings: "구독 카드에서 사용 환경, 보유 여부, 현재 사용 가능 여부, 이번 결제 기간 요금과 한도를 확인해 주세요. 다만 사용자 입력만으로 공급자 공식 근거 부족까지 해소되지는 않습니다.",
        workloadScope: "입력·출력 또는 전체 문맥 한도를 넘었다면 작업을 더 작은 단위로 나누거나 필요한 산출물 범위를 줄인 뒤 다시 분석해 주세요.",
        qualityRequirements: "분석된 최소 품질이나 필수 기능을 만족하는 경로가 없습니다. 작업 설명의 제약과 산출물을 더 구체적으로 적어 다시 분석하거나, 해당 기능이 확인된 다른 경로가 필요합니다.",
        pricingData: "현재 날짜에 적용할 수 있는 가격표를 확인하지 못했습니다. 공식 기본값을 복원하거나 가격 적용일과 사용자 수정값을 확인해 주세요.",
        technicalConfiguration: "저장된 프리셋, 카탈로그 참조 또는 계정 연결 정보가 현재 설정과 맞지 않습니다. 해당 항목을 다시 연결하거나 기본값으로 복원해 주세요.",
        reviewDetails: "아래 ‘확정 후보에서 제외된 경로’를 펼치면 경로별 세부 사유를 확인할 수 있습니다.",
      },
      detailHint: "팝업을 닫은 뒤 ‘확정 후보에서 제외된 경로’를 펼치면 모델별 상세 사유를 볼 수 있습니다.",
      close: "닫기",
    },
    conditionalAlternatives: "조건부 구독 대안",
    excludedRoutes: "확정 후보에서 제외된 경로",
    unknownExclusionReason: "확인할 수 없는 내부 제외 사유",
    resourceDiagnostics: "구독 확인 상태",
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
    quotaKind: { metered: "정확한 수치를 알고 있음", calibrated: "대략적인 잔여율을 알고 있음", "initial-capacity": "신규 초기 한도", opaque: "정확히 모름 (권장)" },
    quotaUnit: { request: "요청", credit: "크레딧", "percent-point": "퍼센트 포인트" },
    resetKind: { none: "자동 초기화 없음", fixed: "정해진 시각에 전체 초기화", rolling: "사용분이 일정 시간 뒤 차례로 복구", unknown: "잘 모르겠음 (권장)" },
    surface: { chat: "채팅", "ide-cli": "IDE / CLI", batch: "배치" },
    planningTier: { economy: "Economy", balanced: "Balanced", premium: "Premium" },
    routeKind: { "owned-within-included-quota": "보유 구독 포함 한도", api: "API", "owned-paid-overage": "보유 구독 유료 초과", "new-subscription": "신규 구독" },
    whyEnough: { "minimum-quality-met": "필요한 최소 품질을 충족합니다.", "higher-tier-saved-cash": "상위 등급이 더 적은 추가 비용을 사용합니다.", "quality-headroom-triggered": "정해진 조건에 따라 한 단계 여유를 적용했습니다.", "minimum-quality-requires-premium": "호환 가능한 하위 경로가 없어 Premium이 최소 충분 경로입니다." },
    whyNotPremium: { "premium-selected": "선택함 · 최소 품질 또는 적용된 상향 조건에 따라 Premium이 필요합니다.", "premium-not-triggered": "선택하지 않음 · Premium이 필요한 상향 조건이 없습니다.", "lower-tier-sufficient": "선택하지 않음 · 더 낮은 등급이 요구사항을 충족합니다.", "no-compatible-premium-api": "비교 불가 · 호환 가능한 Premium API 기준이 없습니다." },
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
  validation: {
    title: "Finish the required inputs",
    description: "The plan cannot be created until you fix the following items.",
    budgetDescription: "The budget cannot be confirmed until you fix the following items.",
    checkField: (field) => `Check the ${field} field.`,
    close: "Return to inputs",
  },
  hero: {
    eyebrow: "Add work → Set budget and subscriptions → Review your plan",
    titleLine1: "Choose what fits the work",
    titleLine2: "not the priciest model",
    description: "Enter your work and budget to compare existing AI subscriptions with APIs and see a practical option and estimated cost for each task.",
  },
  budget: {
    label: "Amount you can spend now",
    help: "Maximum new spending for this plan.",
    unconfirmedTitle: "Confirm what the budget includes",
    unconfirmedDescription: "Confirm that this total includes API use and any new subscription you choose.",
    confirmedTitle: "Budget confirmed",
    confirmedDescription: (date) => `Confirmed on ${date}.`,
    confirm: "Plan with this amount",
    revoke: "Revoke confirmation",
    invalid: "Enter a valid budget before confirming.",
  },
  resources: {
    ...ko.resources,
    eyebrow: "Optional",
    title: "AI subscriptions you use",
    description: "Add plans such as ChatGPT or Copilot if you use them. Exact credits are optional, and you can skip this step if you have no subscription.",
    sessionOnly: "Inputs are saved in this browser and the plan is recalculated when restored.",
    requirementHelp: "Adding a subscription is optional. If you add a card, complete every field marked Required.",
    requiredField: "Required",
    optionalField: "Optional",
    addLegend: "Add a preset",
    presetSelectLabel: "AI subscription to add",
    presetSelectPlaceholder: "Choose a subscription type",
    addSelected: "Add",
    maximumReached: "Supports one resource per preset, up to four resources.",
    resourceLegend: (index) => `AI subscription ${index}`,
    remove: "Remove",
    nameLabel: "Display name",
    ownershipLabel: "Do you already have this plan?",
    availabilityLabel: "Can you use it now?",
    surfaceLabel: "Where do you mainly use it?",
    feeLabel: "Fee this billing period (USD)",
    existingFeeHelp: "A fee you already pay is not added again as a new cost.",
    newFeeHelp: "A selected new subscription is charged once for the complete plan.",
    quotaKindLabel: "How much do you know about the limit?",
    quotaGuide: {
      open: "How to check",
      title: "Where can I check the subscription limit?",
      intro: "Sign in to the official service and follow the path below. Menu names can change as services update.",
      recordTitle: "What should I copy?",
      recordDescription: "Enter only the included amount, remaining amount, usage percentage, and reset time shown by the official service. Enter per-task use separately only when you observed it yourself.",
      unknown: "If no number is shown, do not estimate it. You can keep ‘I do not know the exact limit’ selected.",
      officialLink: "Open official guidance or service (new tab)",
      close: "Close",
      presets: {
        "chatgpt-like-variable": {
          title: "ChatGPT",
          steps: [
            "Sign in to ChatGPT and confirm the plan currently in use.",
            "Check the model picker and any on-screen limit or reset notice. An exact remaining message count is not always shown.",
          ],
        },
        "github-copilot-like-credits": {
          title: "GitHub Copilot",
          steps: [
            "Open GitHub Settings → Billing & licensing, then check Copilot under Metered usage or open AI usage.",
            "Review included AI credits used. In VS Code, the Copilot status-bar icon also shows limit progress and the reset date.",
          ],
        },
        "glm-like-rolling": {
          title: "GLM Coding Plan",
          steps: [
            "Open Usage Stats → Coding Plan in ZCode. You can also confirm subscription status on the Z.ai Subscription page.",
            "Check progress and remaining capacity for the five-hour and weekly limits.",
          ],
        },
        "custom-subscription": {
          title: "Other subscription",
          steps: [
            "Look for Account, Plan, Billing, Usage, or Limits on the provider’s official site.",
            "Enter only values actually shown by the provider and leave undisclosed values blank.",
          ],
        },
      },
    },
    quotaUnitLabel: "Quota unit",
    includedLabel: "Included amount",
    remainingLabel: "Remaining amount",
    observedUseLabel: "Observed use per task",
    observedUseHelp: "Enter Low / Expected / High and the observation sample size. User observations are not confirmed evidence.",
    consumptionBasisLabel: "Consumption basis",
    taskBasis: "Per task",
    iterationBasis: "Per analysis iteration",
    sampleSizeLabel: "Observation sample size",
    opaqueDescriptionLabel: "Quota note",
    resetKindLabel: "When does the limit reset?",
    nextResetLabel: "Next reset time",
    cadenceDaysLabel: "Reset cadence (days)",
    rollingHoursLabel: "Hours until used capacity returns",
    rollingHoursHelp: "For example, 24 means usage from now stops counting toward the limit 24 hours later.",
    conditionalNotice: "Persistence and restore never promote user input to provider-published evidence. Current real presets remain conditional or excluded; the API price compatibility view stays separate.",
    conditionalStatus: "Reference information",
    invalidStatus: "Finish setup",
    fieldError: "Check the display name, work surface, and fee. If you selected detailed settings, complete those values too.",
    fieldsToCheck: "Check the following fields",
    technicalDetails: "Show technical details",
    relinkTitle: "Reconnect the stored preset.",
    relinkDescription: "Choose a current preset to replace the old reference and reset preset-bound surface, quota, and reset fields to safe blank defaults. Display name, ownership, availability, and fee are preserved.",
    relinkLabel: "Replacement preset",
    relinkPlaceholder: "Choose a current preset",
    presets: {
      "chatgpt-like-variable": { name: "ChatGPT-like variable plan", description: "Record a descriptive limit without inventing an exact task count." },
      "github-copilot-like-credits": { name: "GitHub Copilot-like credits", description: "Add an IDE/CLI subscription even if you do not know the exact credits." },
      "glm-like-rolling": { name: "GLM-like timed recovery plan", description: "Used capacity returns after a set time. You can add it even if you do not know the exact interval." },
      "custom-subscription": { name: "Custom subscription", description: "A user-defined cloud subscription that claims neither arbitrary API access nor local execution." },
    },
  },
  overrides: {
    eyebrow: "Advanced · optional",
    title: "Open to enter custom API prices",
    description: "Use this only when you want to test values other than the official defaults.",
    sessionOnly: "Your values are stored separately from official defaults in this browser and exported files. Restoring defaults removes only your values.",
    accessBoundary: "Changing a price does not confirm real access or feature support.",
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
    active: "Active custom settings",
    savedSources: "Saved custom price settings",
    userSupplied: "User-supplied",
    unresolvedSource: "Unresolved · not applied",
    futureSource: "Future schedule rejected · not applied",
    removeUnresolved: "Remove unresolved source",
    none: "No saved custom price settings",
    applied: "Override applied.",
    restored: "Verified defaults restored.",
    removed: "Unresolved override source removed.",
    invalid: "Check the price, date, and tier values.",
    validationTitle: "Check the API price override",
    validationDescription: "The override cannot be applied until you fix the following items.",
    inputPriceRequired: "Enter an input price when an output price is provided.",
    outputPriceRequired: "Enter an output price when an input price is provided.",
    priceInvalid: "Input and output prices must be between 0 and 1,000,000 with no more than six decimal places.",
    effectiveDateInvalid: "The effective date is required and cannot be later than the current calculation date.",
    noChanges: "Change at least one planning tier or input/output price value.",
    maximumSources: "You can save up to nine custom price settings. Restore or remove an existing setting, then try again.",
    validationClose: "Return to inputs",
  },
  results: {
    ...ko.results,
    eyebrow: "Your tailored work plan",
    title: "Recommended access and estimated cost by task",
    authorityNotice: "Unverified subscription limits or access are never shown as confirmed execution methods.",
    exportDisclosure: "Exports include plan results and inputs. When restored, the inputs are checked and recalculated against the current rules.",
    compatibilityView: "Detailed provider comparison (optional)",
    compatibilityDescription: "Open this only when you need model-level prices and calculation details.",
    referencePlanView: "Detailed reference API plan (optional)",
    referencePlanDescription: "Open only when you need provider prices, models, and token-calculation details.",
    referenceSummaryEyebrow: "Reference information kept separate from confirmed results",
    referenceSummaryTitle: "Pre-verification reference API cost plan",
    referenceSummaryDescription: "No route is confirmed, but estimated models and costs were calculated from standard API prices and token limits only. This reference calculation does not assess task capability eligibility or personal account readiness, and its values are excluded from the confirmed totals and budget assessment above.",
    referenceProviderChoice: "Reference cost by provider",
    referenceExpectedTotal: "Expected reference total",
    referenceIncludedTasks: (active, total) => `${active}/${total} tasks included in the cost calculation`,
    referenceTaskModel: "Reference model",
    referenceTaskExpectedCost: "Expected reference cost",
    referenceHeldTask: "Held from the reference calculation for budget",
    referenceInfeasibleTask: "Reference cost unavailable under invocation limits",
    referenceOpenDetails: "View provider and model calculation details",
    budgetRequiredTitle: "Confirm your budget first.",
    budgetRequiredDescription: "Confirm what the amount includes to calculate the plan without running the analysis again.",
    analysisRequiredTitle: "Analyze the work with the new planner.",
    analysisRequiredDescription: "Your previous result is preserved. Create a new sample plan or analyze your tasks when ready.",
    calculationError: "The work plan could not be recalculated. Check the inputs and try again.",
    totalIncrementalCash: "Total new cost",
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
    budgetNotAssessed: "Budget assessment pending",
    budgetNotAssessedDescription: "No confirmed route is available to price, so budget status was not assessed.",
    excludedCostNoticeTitle: "Check what the displayed cost includes",
    excludedCostNotice: (count, allTasks) =>
      allTasks
        ? `All ${count} task${count === 1 ? "" : "s"} lack a confirmed route and were excluded from the cost total. US$0.00 does not mean every task can run for free.`
        : `${count} task${count === 1 ? "" : "s"} without a confirmed route ${count === 1 ? "was" : "were"} excluded from totals and budget assessment.`,
    avoidedSpend: "Avoided spend versus compatible all-Premium API use",
    additionalSpend: "Additional spend versus the Premium API baseline",
    noPremiumBaseline: "No compatible Premium API baseline is available, so no savings value is shown.",
    activeHeldInfeasible: (active, held, infeasible) => `Active ${active} · held ${held} · infeasible ${infeasible}`,
    taskNumber: (index) => `Task ${index}`,
    accessRoute: "Recommended access route",
    model: "Connected model",
    noConfirmedRoute: "No confirmed executable route",
    whyEnough: "Why this is enough",
    premiumChoice: "Premium choice",
    upgradeTriggers: "Upgrade triggers",
    alternative: "Alternative route",
    holdReason: "Hold reason",
    infeasibleReason: "Infeasible reason",
    holdReasonValue: "Expected incremental cash for confirmed routes exceeds the budget.",
    infeasibleReasonValue: "No access route is confirmed to meet this workload's requirements.",
    needsVerificationStatus: "Route needs verification",
    requirementsUnmetStatus: "Requirements unmet",
    apiSetupTitle: "Prepare the API before running",
    apiSetupDescription: "This plan uses verified model and API catalog data. Before execution, check the account, billing setup, and API key for each provider below.",
    apiSetupPrivacy: "This app never requests or stores API keys, and it does not test your personal account access.",
    apiSetupLink: (providerName) => `Open ${providerName} setup guide`,
    infeasibleHelp: {
      open: "Why wasn't a route confirmed?",
      title: (taskName) => `${taskName}: why no route was confirmed`,
      intro: "This separates why no route was confirmed from what you can do now.",
      reviewedRoutes: (count) => `${count} access route${count === 1 ? "" : "s"} reviewed`,
      causesTitle: "What remained unverified in this calculation",
      noCause: "No detailed exclusion reason was available.",
      resourceIssuesTitle: "Incomplete subscription inputs in this plan",
      resourceIssue: (resourceName, fields) => `${resourceName}: ${fields}`,
      inputProblemTitle: "Some subscription inputs still need attention",
      inputProblemDescription: "A subscription card in this plan is incomplete. Review the required fields below.",
      inputProblemCaveat: "Completing the required inputs still cannot confirm a route whose model/API capability or limit data is missing from the app.",
      systemProblemTitle: "There is no user input to fix",
      systemProblemDescription: "The model/API data saved in the app is missing a capability or limit needed for this task, or it is not linked to the current route. Filling in more fields will not fix it.",
      systemProblemStatus: "For now, you can review the estimated model and cost in the reference plan below.",
      accountStatusNotice: "This result does not check whether your account or API key currently has access.",
      systemTaskConstraintNote: "Some routes also fail this task's input/output limits, minimum quality, or required-capability conditions.",
      taskProblemTitle: "No route meets the current task conditions",
      taskProblemDescription: "Review whether the work can be split or the deliverable narrowed, then analyze it again. A change does not guarantee that a route can be confirmed.",
      genericProblemTitle: "Review the reason for each route",
      genericProblemDescription: "No input that can be fixed directly on this screen was found. You can inspect why each candidate was excluded.",
      goToResourceInput: "Go to the first required input",
      reviewTaskInput: "Review task input",
      showRouteDetails: "Show route-by-route reasons",
      viewReferencePlan: "View the pre-verification reference plan",
      nextStepsTitle: "What you can check or change",
      guidance: {
        providerVerification: "Capability or limit data for this model/API route is missing from the app or is not linked. The routes below are reference candidates based only on price and registered limits; verify account or API-key access separately.",
        resourceSettings: "Review the subscription card's surface, ownership, current availability, fee for this billing period, and limit. User input still cannot replace missing official provider evidence.",
        workloadScope: "If input, output, or total context exceeds a limit, split the work into smaller tasks or reduce the requested deliverable, then analyze it again.",
        qualityRequirements: "No route meets the analyzed minimum quality or required capabilities. Clarify the task constraints and deliverable before analyzing again, or use another route whose capability is verified.",
        pricingData: "No price schedule applies at the current date. Restore the official default or review the effective date and user override.",
        technicalConfiguration: "A saved preset, catalog reference, or account connection does not match the current configuration. Relink it or restore the default.",
        reviewDetails: "Expand “Routes excluded from confirmed candidates” below for route-by-route details.",
      },
      detailHint: "After closing this dialog, expand “Routes excluded from confirmed candidates” to see model-level details.",
      close: "Close",
    },
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
    quotaKind: { metered: "I know the exact numbers", calibrated: "I know the approximate percentage", "initial-capacity": "New initial capacity", opaque: "I do not know exactly (recommended)" },
    quotaUnit: { request: "request", credit: "credit", "percent-point": "percentage point" },
    resetKind: { none: "No automatic reset", fixed: "Full reset at a set time", rolling: "Used capacity returns after a set time", unknown: "I am not sure (recommended)" },
    surface: { chat: "Chat", "ide-cli": "IDE / CLI", batch: "Batch" },
    routeKind: { "owned-within-included-quota": "Owned included quota", api: "API", "owned-paid-overage": "Owned paid overage", "new-subscription": "New subscription" },
    whyEnough: { "minimum-quality-met": "Meets the minimum required quality.", "higher-tier-saved-cash": "A higher tier uses less incremental cash.", "quality-headroom-triggered": "One tier of headroom was applied by a closed trigger.", "minimum-quality-requires-premium": "Premium is the minimum sufficient route because no compatible lower route remains." },
    whyNotPremium: { "premium-selected": "Selected · Premium is required by the minimum quality or an applied upgrade condition.", "premium-not-triggered": "Not selected · No condition requires a Premium upgrade.", "lower-tier-sufficient": "Not selected · A lower tier satisfies the requirements.", "no-compatible-premium-api": "Not comparable · No compatible Premium API baseline is available." },
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
  validation: {
    title: "必須入力を完了してください",
    description: "次の項目を修正するまで計画を作成できません。",
    budgetDescription: "次の項目を修正するまで予算を確認できません。",
    checkField: (field) => `${field}の項目を確認してください。`,
    close: "入力に戻る",
  },
  hero: {
    eyebrow: "作業を入力 → 予算・契約を設定 → 自分の計画を確認",
    titleLine1: "最も高価なモデルではなく",
    titleLine2: "作業に合う選択を",
    description: "作業と予算から、利用中のAIサービスとAPIを比べ、作業ごとの方法と見積コストを整理します。",
  },
  budget: {
    label: "追加で使える金額",
    help: "この計画で追加できる上限額です。",
    unconfirmedTitle: "予算に含む範囲を確認してください",
    unconfirmedDescription: "API利用料と新たに選ぶサブスクリプション料金を含む合計か確認してください。",
    confirmedTitle: "予算を確認しました",
    confirmedDescription: (date) => `${date}に確認しました。`,
    confirm: "この金額で計画する",
    revoke: "確認を取り消す",
    invalid: "有効な予算を入力してから確認してください。",
  },
  resources: {
    ...en.resources,
    eyebrow: "任意",
    title: "利用中のAIサブスクリプション",
    description: "ChatGPTやCopilotなどを利用している場合は追加してください。正確なクレジット数は不要で、契約がなければスキップできます。",
    sessionOnly: "入力内容はこのブラウザに保存され、復元時に計画を再計算します。",
    requirementHelp: "サブスクリプションの追加は任意です。カードを追加した場合は「必須」の項目をすべて入力してください。",
    requiredField: "必須",
    optionalField: "任意",
    addLegend: "プリセットを追加",
    presetSelectLabel: "追加するAIサブスクリプション",
    presetSelectPlaceholder: "サブスクリプションの種類を選択",
    addSelected: "追加",
    maximumReached: "各プリセット1件、最大4件をサポートします。",
    resourceLegend: (index) => `AIサブスクリプション ${index}`,
    remove: "削除",
    nameLabel: "表示名",
    ownershipLabel: "このプランを保有していますか？",
    availabilityLabel: "今すぐ利用できますか？",
    surfaceLabel: "主にどこで利用しますか？",
    feeLabel: "今回の請求期間の料金（USD）",
    existingFeeHelp: "すでに支払っている料金は新しい費用として再加算しません。",
    newFeeHelp: "新規サブスクリプションを選ぶ場合、計画全体で一度だけ加算します。",
    quotaKindLabel: "利用上限をどの程度把握していますか？",
    quotaGuide: {
      open: "上限の確認方法",
      title: "サブスクリプションの上限はどこで確認できますか？",
      intro: "公式サービスにログインし、以下の経路を確認してください。更新によりメニュー名が変わる場合があります。",
      recordTitle: "何を入力すればよいですか？",
      recordDescription: "公式画面に表示された総量、残量、使用率、リセット時刻だけを入力してください。作業ごとの使用量は、自分で観測した場合のみ別に入力します。",
      unknown: "数値が表示されない場合は推測せず、「正確な上限は不明」のままで構いません。",
      officialLink: "公式案内・サービスを開く（新しいタブ）",
      close: "閉じる",
      presets: {
        "chatgpt-like-variable": {
          title: "ChatGPT",
          steps: [
            "ChatGPTにログインし、現在利用中のプランを確認します。",
            "モデル選択画面と、画面に表示される上限・リセット案内を確認します。正確な残り回数が常に表示されるとは限りません。",
          ],
        },
        "github-copilot-like-credits": {
          title: "GitHub Copilot",
          steps: [
            "GitHubの Settings → Billing & licensing を開き、Metered usageのCopilotまたはAI usageを確認します。",
            "使用済みのAI creditsを確認します。VS CodeではステータスバーのCopilotアイコンから上限の進捗とリセット日も確認できます。",
          ],
        },
        "glm-like-rolling": {
          title: "GLM Coding Plan",
          steps: [
            "ZCodeで Usage Stats → Coding Plan を開きます。Z.aiのSubscriptionページでも契約状態を確認できます。",
            "5時間・週間上限の進捗と残量を確認します。",
          ],
        },
        "custom-subscription": {
          title: "その他のサブスクリプション",
          steps: [
            "提供者の公式サイトでAccount、Plan、Billing、Usage、Limitsなどのメニューを探します。",
            "公式画面に実際に表示される値だけを入力し、非公開の値は空欄にします。",
          ],
        },
      },
    },
    quotaUnitLabel: "利用枠の単位",
    includedLabel: "含まれる量",
    remainingLabel: "残り",
    observedUseLabel: "1作業あたりの観測使用量",
    observedUseHelp: "Low / Expected / Highと観測サンプル数を入力します。ユーザー観測値は確定根拠ではありません。",
    consumptionBasisLabel: "使用量の基準",
    taskBasis: "作業1件あたり",
    iterationBasis: "分析反復1回あたり",
    sampleSizeLabel: "観測サンプル数",
    opaqueDescriptionLabel: "利用上限のメモ",
    resetKindLabel: "利用上限はいつリセットされますか？",
    nextResetLabel: "次回リセット時刻",
    cadenceDaysLabel: "リセット周期（日）",
    rollingHoursLabel: "使用分が戻るまでの時間（時間）",
    rollingHoursHelp: "例：24なら、今使った分は24時間後に上限計算から外れます。",
    conditionalNotice: "保存・復元してもユーザー入力を提供者公開の根拠へ昇格しません。現在の実在プリセットは条件付きまたは除外のままで、API価格互換性ビューは別に提供します。",
    conditionalStatus: "参考情報",
    invalidStatus: "設定を完了してください",
    fieldError: "表示名、利用環境、料金を確認してください。詳細設定を選んだ場合は、その値もすべて入力してください。",
    fieldsToCheck: "次の項目を確認してください",
    technicalDetails: "技術的な詳細を表示",
    relinkTitle: "保存されたプリセットを再接続してください。",
    relinkDescription: "現在のプリセットを選ぶと古い参照を置き換え、プリセット依存の利用環境・利用枠・リセット項目を安全な空の既定値へ戻します。表示名、保有状態、可用性、料金は保持します。",
    relinkLabel: "代替プリセット",
    relinkPlaceholder: "現在のプリセットを選択",
    presets: {
      "chatgpt-like-variable": { name: "ChatGPT型の可変プラン", description: "正確な作業数を作らず、説明形式の上限として記録します。" },
      "github-copilot-like-credits": { name: "GitHub Copilot型クレジット", description: "正確なクレジット数が分からなくてもIDE/CLIサブスクリプションとして追加できます。" },
      "glm-like-rolling": { name: "GLM型 時間経過回復枠", description: "使用分が一定時間後に順次戻る方式です。正確な時間が分からなくても追加できます。" },
      "custom-subscription": { name: "カスタムサブスクリプション", description: "任意のAPIアクセスやローカル実行を主張しないユーザー定義クラウド契約です。" },
    },
  },
  overrides: {
    eyebrow: "詳細設定・任意",
    title: "API価格を直接入力する場合に開く",
    description: "公式の既定値とは異なる価格を試す場合のみ使用します。",
    sessionOnly: "入力した値は公式の既定値とは別に、このブラウザとエクスポートファイルへ保存されます。既定値へ戻すとユーザー値だけを削除します。",
    accessBoundary: "価格を変更しても、実際のアクセス権や機能対応が確認されるわけではありません。",
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
    active: "適用中のユーザー設定",
    savedSources: "保存されたユーザー価格設定",
    userSupplied: "ユーザー入力",
    unresolvedSource: "未解決 · 未適用",
    futureSource: "将来予約を拒否・未適用",
    removeUnresolved: "未解決sourceを削除",
    none: "保存されたユーザー価格設定なし",
    applied: "修正値を適用しました。",
    restored: "検証済み既定値に戻しました。",
    removed: "未解決override sourceを削除しました。",
    invalid: "価格、日付、ティアの入力を確認してください。",
    validationTitle: "API価格修正の入力を確認してください",
    validationDescription: "次の項目を修正するまで変更を適用できません。",
    inputPriceRequired: "出力価格を入力した場合は、入力価格も入力してください。",
    outputPriceRequired: "入力価格を入力した場合は、出力価格も入力してください。",
    priceInvalid: "入力・出力価格は0〜1,000,000の範囲で、小数点以下6桁以内にしてください。",
    effectiveDateInvalid: "適用開始日は必須で、現在の計算基準日より後にはできません。",
    noChanges: "計画ティアまたは入力・出力価格のいずれかを変更してください。",
    maximumSources: "ユーザー価格設定は最大9件まで保存できます。既存設定を復元または削除してから再試行してください。",
    validationClose: "入力に戻る",
  },
  results: {
    ...en.results,
    eyebrow: "あなた向けの作業計画",
    title: "作業ごとの推奨利用方法と見積コスト",
    authorityNotice: "未確認のサブスクリプション上限やアクセス権は、確定した実行方法として表示しません。",
    exportDisclosure: "エクスポートには計画結果と入力値が含まれます。復元時は現在の基準で入力値を再確認し、再計算します。",
    compatibilityView: "プロバイダー別の詳細比較（任意）",
    compatibilityDescription: "モデルごとの価格や計算根拠が必要な場合のみ開いてください。",
    referencePlanView: "参考API計画の詳細（任意）",
    referencePlanDescription: "プロバイダー別料金、モデル、トークン計算の根拠が必要な場合のみ開いてください。",
    referenceSummaryEyebrow: "確定結果とは分離した参考情報",
    referenceSummaryTitle: "検証前の参考APIコスト計画",
    referenceSummaryDescription: "確定経路はありませんが、標準API料金とトークン上限だけで想定モデルとコストを計算しました。この参考計算はタスク機能の適格性や個人アカウントの利用可能状態を判定せず、上の確定合計と予算判定には含まれません。",
    referenceProviderChoice: "プロバイダー別の参考コスト",
    referenceExpectedTotal: "Expected参考合計",
    referenceIncludedTasks: (active, total) => `コスト計算に含む作業 ${active}/${total}件`,
    referenceTaskModel: "参考モデル",
    referenceTaskExpectedCost: "Expected参考コスト",
    referenceHeldTask: "予算上、参考計算で保留",
    referenceInfeasibleTask: "呼び出し上限により参考コストを計算不可",
    referenceOpenDetails: "プロバイダー・モデル別の詳細計算を見る",
    budgetRequiredTitle: "最初に予算を確認してください。",
    budgetRequiredDescription: "金額に含む範囲を確認すると、分析を再実行せずに計画を計算します。",
    analysisRequiredTitle: "新しい方法で作業を分析してください。",
    analysisRequiredDescription: "以前の結果は保持されます。サンプルまたは実際の分析で新しい計画を作成できます。",
    calculationError: "作業計画を再計算できませんでした。入力値を確認してもう一度お試しください。",
    totalIncrementalCash: "新たに必要な総コスト",
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
    budgetNotAssessed: "予算判定を保留",
    budgetNotAssessedDescription: "コストを計算できる確定経路がないため、予算状態を判定していません。",
    excludedCostNoticeTitle: "表示コストの対象を確認してください",
    excludedCostNotice: (count, allTasks) =>
      allTasks
        ? `全${count}件の作業に確定経路がなく、コスト合計から除外されています。US$0.00は、すべての作業を無料で実行できるという意味ではありません。`
        : `確定経路がない作業${count}件のコストは、合計と予算判定から除外されています。`,
    avoidedSpend: "互換性のある全Premium API利用に対する回避支出",
    additionalSpend: "Premium API基準より追加される支出",
    noPremiumBaseline: "互換性のあるPremium API基準がないため、節約額を表示しません。",
    activeHeldInfeasible: (active, held, infeasible) => `実行 ${active}・保留 ${held}・実行不可 ${infeasible}`,
    taskNumber: (index) => `作業 ${index}`,
    accessRoute: "推奨利用経路",
    model: "接続モデル",
    noConfirmedRoute: "確認済み実行経路なし",
    whyEnough: "この経路で十分な理由",
    premiumChoice: "Premiumの選択",
    upgradeTriggers: "アップグレード条件",
    alternative: "代替経路",
    holdReason: "保留理由",
    infeasibleReason: "実行不可の理由",
    holdReasonValue: "確認済み経路のExpected追加支出が予算を超えています。",
    infeasibleReasonValue: "この作業要件を満たすと確認された利用経路がありません。",
    needsVerificationStatus: "経路の確認が必要",
    requirementsUnmetStatus: "条件未達",
    apiSetupTitle: "実行前のAPI準備",
    apiSetupDescription: "この計画は公式のモデル/API情報を使って計算しています。実行前に、以下の各プロバイダーでアカウント、請求設定、APIキーを確認してください。",
    apiSetupPrivacy: "このアプリはAPIキーを要求・保存せず、個人アカウントで現在利用できるかどうかも検査しません。",
    apiSetupLink: (providerName) => `${providerName}の設定ガイドを開く`,
    infeasibleHelp: {
      open: "経路を確定できない理由は？",
      title: (taskName) => `${taskName}：経路を確定できない理由`,
      intro: "経路を確定できなかった理由と、今できることを分けて案内します。",
      reviewedRoutes: (count) => `確認した利用経路：${count}件`,
      causesTitle: "今回の計算で確認できなかった項目",
      noCause: "詳細な除外理由を確認できませんでした。",
      resourceIssuesTitle: "この計画全体で未完了のサブスクリプション入力",
      resourceIssue: (resourceName, fields) => `${resourceName}：${fields}`,
      inputProblemTitle: "先に完了するサブスクリプション入力があります",
      inputProblemDescription: "この計画に未完了のサブスクリプションカードがあります。以下の必須項目を確認してください。",
      inputProblemCaveat: "必須入力を完了しても、アプリにモデル/APIの機能・上限情報がない経路は確定できません。",
      systemProblemTitle: "ユーザーが修正する入力はありません",
      systemProblemDescription: "アプリに保存されたモデル/API情報に、この作業の判定に必要な機能や上限がないか、現在の経路に関連付けられていません。入力欄を追加で埋めても解決しません。",
      systemProblemStatus: "現在は、下の参考計画で想定モデルとコストを確認できます。",
      accountStatusNotice: "この判定では、個人アカウントやAPIキーで現在利用できるかどうかは確認していません。",
      systemTaskConstraintNote: "一部の経路は、この作業の入出力上限、最低品質、または必須機能の条件も満たしていません。",
      taskProblemTitle: "現在の作業条件を満たす経路がありません",
      taskProblemDescription: "作業を分割できるか、成果物の範囲を狭められるかを確認してから再分析してください。変更しても経路の確定は保証されません。",
      genericProblemTitle: "経路ごとの詳細理由を確認してください",
      genericProblemDescription: "この画面で直接修正できる入力は見つかりませんでした。候補ごとの除外理由を確認できます。",
      goToResourceInput: "最初の必須入力へ移動",
      reviewTaskInput: "作業入力を確認",
      showRouteDetails: "経路ごとの詳細理由を見る",
      viewReferencePlan: "検証前の参考計画を見る",
      nextStepsTitle: "確認・変更できる方法",
      guidance: {
        providerVerification: "このモデル/API経路の機能や上限情報がアプリにないか、現在の経路に関連付けられていません。下の経路は価格と登録済み上限だけに基づく参考候補であり、個人アカウントやAPIキーで利用できるかは別途確認が必要です。",
        resourceSettings: "サブスクリプションカードで利用環境、保有状態、現在の利用可否、今回の請求期間の料金、上限を確認してください。ただし、ユーザー入力だけでは不足している公式根拠を置き換えられません。",
        workloadScope: "入力・出力・全体コンテキストの上限を超えた場合は、作業を小さく分割するか成果物の範囲を減らしてから再分析してください。",
        qualityRequirements: "分析された最低品質または必須機能を満たす経路がありません。作業の制約と成果物を明確にして再分析するか、機能が確認済みの別経路が必要です。",
        pricingData: "現在の日付に適用できる価格表を確認できません。公式既定値を復元するか、適用日とユーザー修正値を確認してください。",
        technicalConfiguration: "保存されたプリセット、カタログ参照、またはアカウント接続が現在の設定と一致しません。再接続するか既定値に戻してください。",
        reviewDetails: "下の「確定候補から除外された経路」を開くと、経路ごとの詳細理由を確認できます。",
      },
      detailHint: "この画面を閉じた後、「確定候補から除外された経路」を開くとモデルごとの詳細理由を確認できます。",
      close: "閉じる",
    },
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
    quotaKind: { metered: "正確な数値が分かる", calibrated: "おおよその残量率が分かる", "initial-capacity": "新規初期枠", opaque: "正確には分からない（推奨）" },
    quotaUnit: { request: "リクエスト", credit: "クレジット", "percent-point": "パーセントポイント" },
    resetKind: { none: "自動リセットなし", fixed: "決まった時刻に全体をリセット", rolling: "使用分が一定時間後に順次回復", unknown: "よく分からない（推奨）" },
    surface: { chat: "チャット", "ide-cli": "IDE / CLI", batch: "バッチ" },
    routeKind: { "owned-within-included-quota": "保有契約の包含枠", api: "API", "owned-paid-overage": "保有契約の従量超過", "new-subscription": "新規サブスクリプション" },
    whyEnough: { "minimum-quality-met": "必要な最低品質を満たします。", "higher-tier-saved-cash": "上位ティアの方が追加支出を抑えます。", "quality-headroom-triggered": "閉じた条件により1ティアの余裕を適用しました。", "minimum-quality-requires-premium": "互換性のある下位経路がないため、Premiumが最低限十分な経路です。" },
    whyNotPremium: { "premium-selected": "選択 · 最低品質または適用されたアップグレード条件によりPremiumが必要です。", "premium-not-triggered": "未選択 · Premiumへのアップグレードが必要となる条件はありません。", "lower-tier-sufficient": "未選択 · 下位ティアで要件を満たします。", "no-compatible-premium-api": "比較不可 · 互換性のあるPremium API基準がありません。" },
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

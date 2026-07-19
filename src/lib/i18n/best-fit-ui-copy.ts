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
import type { SubscriptionAccessArrangement } from "@/types/resource-drafts";
import type { SubscriptionUsagePercentKey } from "@/lib/subscriptions/usage-snapshot";
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
    confirmBudgetIssue: string;
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
    sharedGooglePlanWarningTitle: string;
    sharedGooglePlanWarningDescription: string;
    resourceLegend: (index: number) => string;
    remove: string;
    nameLabel: string;
    accessArrangementLabel: string;
    accessArrangementHelp: string;
    accessArrangement: Record<
      SubscriptionAccessArrangement | "unresolved",
      string
    >;
    provisionedByLabel: string;
    provisionedBy: Record<"unspecified" | "personal" | "organization", string>;
    organizationOwnershipHelp: string;
    organizationCostTitle: string;
    organizationCostHelp: string;
    ownershipLabel: string;
    availabilityLabel: string;
    availabilityHelp: string;
    surfaceLabel: string;
    surfaceHelp: string;
    feeLabel: string;
    currentFeeLabel: string;
    newSubscriptionFeeLabel: string;
    existingFeeHelp: string;
    newFeeHelp: string;
    usageSnapshot: {
      title: string;
      description: string;
      metricLabels: Record<SubscriptionUsagePercentKey, string>;
      record: string;
      edit: string;
      save: string;
      cancel: string;
      clear: string;
      unrecorded: string;
      invalid: string;
      remaining: (percent: number) => string;
      used: (percent: number) => string;
      bottleneck: (percent: number) => string;
      bottleneckHelp: string;
      modelLabel: string;
      modelPlaceholder: string;
    };
    quotaKindLabel: string;
    quotaComplexityHelp: string;
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
    unknownRouteLabel: string;
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
    confirmBudgetIssue: "2단계에서 ‘이 금액으로 계획하기’를 눌러 예산 범위를 확인해 주세요.",
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
    title: "이번 계획에 쓸 AI 구독이 있나요?",
    description:
      "이번 계획에 쓸 ChatGPT·Claude·Gemini·GitHub Copilot 구독을 추가하세요. 개인 구독과 회사·학교 제공 계정을 함께 기록할 수 있습니다. 구독과 API는 별도이므로 회사 계정도 조직 API 권한으로 계산하지 않습니다. 없으면 건너뛰세요.",
    sessionOnly: "입력은 이 브라우저에 저장되며 복원할 때 다시 계산합니다.",
    requirementHelp: "구독 추가는 선택입니다. 추가한 카드에서는 ‘필수’ 항목만 입력하세요.",
    requiredField: "필수",
    optionalField: "선택",
    addLegend: "AI 구독 추가",
    presetSelectLabel: "추가할 AI 구독",
    presetSelectPlaceholder: "구독 종류 선택",
    addSelected: "추가",
    maximumReached: "최대 8개를 지원합니다. 같은 서비스의 서로 다른 계정도 각각 추가할 수 있습니다.",
    sharedGooglePlanWarningTitle: "Google 구독 비용 중복 입력을 확인해 주세요",
    sharedGooglePlanWarningDescription:
      "Gemini Apps와 Antigravity는 같은 Google AI Pro·Ultra 요금제에 함께 포함될 수 있습니다. 이 앱은 아직 두 항목의 구독료를 자동으로 한 번만 계산할 수 없습니다. 같은 요금제라면 이번에 실제로 사용할 카드 하나만 ‘새로 가입’으로 두세요. 계정과 결제가 각각 다르면 둘 다 입력해도 됩니다.",
    resourceLegend: (index) => `AI 구독 ${index}`,
    remove: "제거",
    nameLabel: "표시 이름",
    accessArrangementLabel: "구독 이용 형태",
    accessArrangementHelp:
      "현재 상황에 맞는 항목을 고르면 필요한 비용과 이용 정보만 보여 줍니다.",
    accessArrangement: {
      unresolved: "이용 형태를 선택해 주세요",
      "personal-existing": "이미 이용 중인 개인 구독",
      "personal-new": "새로 가입할 개인 구독",
      "organization-provided": "회사·학교에서 제공받은 구독",
    },
    provisionedByLabel: "어떻게 제공받았나요?",
    provisionedBy: {
      unspecified: "아직 구분하지 않음",
      personal: "직접 결제·관리",
      organization: "회사·학교에서 제공",
    },
    organizationOwnershipHelp: "회사·학교에서 이미 배정받은 계정으로 기록합니다.",
    organizationCostTitle: "개인 예산 반영액 US$0",
    organizationCostHelp:
      "이 계산에서는 좌석 비용이나 초과 사용료를 조직 부담으로 가정해 개인 예산에 더하지 않습니다. 실제 이용 가능 여부와 관리자 제한은 별도로 확인합니다.",
    ownershipLabel: "이 서비스를 어떻게 이용하나요?",
    availabilityLabel: "이번 계획에 사용할 수 있나요?",
    availabilityHelp: "‘이 계획에서 제외’를 선택하면 정보는 저장되지만 추천 이용 방법에는 넣지 않습니다.",
    surfaceLabel: "이번 계획에서 사용할 곳 (하나만)",
    surfaceHelp: "여기서 고른 사용 환경과 맞는 작업만 이 구독의 추천 대상으로 검토합니다.",
    feeLabel: "구독 비용 (USD)",
    currentFeeLabel: "현재 내는 구독료 · 참고용 (USD)",
    newSubscriptionFeeLabel: "새로 가입할 때 드는 비용 (USD)",
    existingFeeHelp: "이미 내는 구독료는 새 비용에 다시 더하지 않습니다.",
    newFeeHelp: "새 구독을 선택하면 계획 전체에 한 번만 더합니다.",
    usageSnapshot: {
      title: "현재 남은 사용량",
      description:
        "공식 사용량 화면에 보이는 항목만 기록하세요. 슬라이더는 남은 비율이며 사용한 비율도 함께 보여 줍니다.",
      metricLabels: {
        fiveHourRemainingPercent: "5시간 한도",
        weeklyRemainingPercent: "주간 한도",
        modelWeeklyRemainingPercent: "모델별 주간 한도",
        dailyRemainingPercent: "일일 요청 한도",
        creditRemainingPercent: "포함 크레딧",
      },
      record: "입력하기",
      edit: "수정",
      save: "저장",
      cancel: "취소",
      clear: "삭제",
      unrecorded: "아직 기록하지 않음",
      invalid: "0~100 사이의 정수를 입력해 주세요",
      remaining: (percent) => `남음 ${percent}%`,
      used: (percent) => `사용 ${percent}%`,
      bottleneck: (percent) => `가장 적게 남은 한도 ${percent}%`,
      bottleneckHelp:
        "입력한 한도 중 가장 적게 남은 비율을 먼저 보여 줍니다. 작업마다 줄어드는 양을 알 수 없으므로 남은 작업 수를 임의로 계산하지 않습니다.",
      modelLabel: "공식 화면의 모델 이름",
      modelPlaceholder: "예: 공식 화면에 표시된 모델 이름",
    },
    quotaKindLabel: "상세 한도 입력 방식",
    quotaComplexityHelp:
      "5시간·주간처럼 한도가 여러 개이거나 모델마다 차감량이 다르면 ‘정확히 모름’을 선택하고 한도 메모에 그대로 적어 주세요. 같은 계정의 여러 한도를 별도 구독 카드로 나누면 안 됩니다.",
    quotaGuide: {
      open: "한도 확인 방법",
      title: "구독 한도는 어디서 확인하나요?",
      intro:
        "공식 서비스에 로그인한 뒤 아래 순서대로 확인하세요. 메뉴 이름은 서비스 업데이트에 따라 달라질 수 있습니다.",
      recordTitle: "어떤 값을 옮기면 되나요?",
      recordDescription:
        "공식 화면의 포함량, 남은 양, 사용률, 초기화 시간만 그대로 입력하세요. 작업당 사용량은 직접 관측한 경우에만 별도로 입력합니다.",
      unknown:
        "숫자가 보이지 않으면 추정하지 말고 ‘정확히 모름’을 선택해도 됩니다.",
      officialLink: "공식 안내·서비스 열기 (새 탭)",
      close: "닫기",
      presets: {
        "chatgpt-like-variable": {
          title: "ChatGPT · Codex",
          steps: [
            "ChatGPT에 로그인한 뒤 현재 이용 중인 요금제를 확인합니다.",
            "ChatGPT의 모델 선택기와 한도 안내를 확인합니다. Codex는 CLI의 /usage에서 사용량을 볼 수 있으며, 5시간 한도와 추가 주간 한도가 함께 적용될 수 있으므로 하나의 숫자로 합치지 않습니다.",
          ],
        },
        "claude-subscription": {
          title: "Claude",
          steps: [
            "Claude의 Settings → Usage를 엽니다. 회사 계정은 관리자가 개인 사용량 보기를 허용한 경우에만 자신의 사용량과 한도를 볼 수 있습니다.",
            "5시간·전체 주간 한도와 모델별 주간 한도가 함께 보일 수 있습니다. 현재 화면에 표시되는 모델 이름과 비율만 각각 기록합니다.",
          ],
        },
        "gemini-subscription": {
          title: "Gemini 채팅",
          steps: [
            "개인 계정은 Gemini 설정과 Usage limits 안내를 확인합니다. 회사·학교 계정은 Workspace 관리자가 라이선스와 사용 권한을 확인해야 할 수 있습니다.",
            "Gemini Apps의 5시간·주간 한도는 채팅용입니다. 채팅에서 코드를 작성할 수는 있지만 이 구독을 CLI 권한으로 간주하지 않으며, 개인 코딩 CLI는 Antigravity에서 별도로 확인합니다.",
          ],
        },
        "google-antigravity": {
          title: "Google Antigravity · CLI",
          steps: [
            "Antigravity 설정의 사용량 화면에서 현재 플랜과 모델별 기준 한도를 확인합니다.",
            "Google AI Pro·Ultra는 5시간 단위 기준 한도와 주간 한도가 함께 적용될 수 있습니다. 한 숫자로 합치지 말고 보이는 내용을 한도 메모에 기록합니다.",
          ],
        },
        "gemini-code-assist": {
          title: "Gemini Code Assist Standard / Enterprise · CLI",
          steps: [
            "회사 계정의 Gemini Code Assist 라이선스가 배정됐는지 관리자 또는 Google Cloud 프로젝트 담당자에게 확인합니다.",
            "Standard·Enterprise의 IDE/CLI 한도는 일일 요청 수 기준입니다. Gemini 채팅, Antigravity, Code Assist와 API 한도를 같은 이용권으로 간주하지 않습니다.",
          ],
        },
        "github-copilot-like-credits": {
          title: "GitHub Copilot",
          steps: [
            "GitHub의 Settings → Billing & licensing을 열고 Metered usage의 Copilot 또는 AI usage를 확인합니다.",
            "포함된 AI credits 사용량을 확인합니다. VS Code에서는 상태 표시줄의 Copilot 아이콘으로 한도 진행률과 초기화 날짜도 볼 수 있습니다.",
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
    observedUseLabel: "직접 확인한 작업당 사용량",
    observedUseHelp: "작업당 사용량을 적게·보통·많이 쓴 경우로 나눠 적고, 직접 확인한 횟수도 입력합니다. 입력값은 참고 자료로만 사용합니다.",
    consumptionBasisLabel: "사용량 기준",
    taskBasis: "작업 1개당",
    iterationBasis: "분석 반복 1회당",
    lowLabel: "적게 사용",
    expectedLabel: "보통 사용",
    highLabel: "많이 사용",
    sampleSizeLabel: "직접 확인한 횟수",
    opaqueDescriptionLabel: "한도 메모",
    resetKindLabel: "사용량 초기화 방식",
    nextResetLabel: "다음 초기화 시각",
    cadenceDaysLabel: "초기화 주기 (일)",
    rollingHoursLabel: "사용 후 초기화까지 (시간)",
    rollingHoursHelp: "공식 안내에 각 사용량이 몇 시간 뒤 따로 초기화된다고 적혀 있을 때만 입력하세요. 5시간 한도와 주간 한도가 함께 보이면 ‘정확히 모름’을 선택하세요.",
    conditionalNotice: "직접 입력한 구독 정보는 참고용입니다. 이용 권한이나 한도를 확인하지 못한 경우 확정 추천에는 넣지 않으며, API 예상 비용은 참고 계획에서 따로 보여 줍니다.",
    conditionalStatus: "참고 정보",
    invalidStatus: "입력 마무리 필요",
    fieldError: "표시 이름, 사용 환경, 요금을 확인하세요. 상세 설정을 선택했다면 해당 값도 모두 입력해야 합니다.",
    fieldsToCheck: "다음 항목을 확인해 주세요",
    technicalDetails: "확인이 필요한 기타 항목",
    relinkTitle: "저장된 구독 종류를 다시 선택해 주세요.",
    relinkDescription: "저장 당시의 구독 종류가 지금 목록과 맞지 않습니다. 현재 구독 종류를 고르면 사용 위치와 한도 정보는 비우고, 표시 이름·사용 여부·요금은 유지합니다.",
    relinkLabel: "현재 구독 종류",
    relinkPlaceholder: "구독 종류 선택",
    presets: {
      "chatgpt-like-variable": {
        name: "ChatGPT · Codex 구독",
        description: "ChatGPT 또는 그 요금제에 포함된 Codex를 사용할 때 선택합니다. 5시간·주간 한도를 몰라도 추가할 수 있습니다.",
      },
      "claude-subscription": {
        name: "Claude 구독",
        description: "Claude, Claude Code 또는 Cowork를 사용하는 개인·회사 계정을 기록합니다.",
      },
      "gemini-subscription": {
        name: "Gemini 채팅 구독",
        description: "Gemini Apps 채팅용입니다. 코딩 질문은 가능하지만 CLI 이용 권한으로 계산하지 않습니다.",
      },
      "google-antigravity": {
        name: "Google Antigravity 코딩 도구",
        description: "개인용 IDE·CLI 코딩 도구를 기록합니다. Gemini 채팅이나 API와 한도가 별도일 수 있습니다.",
      },
      "gemini-code-assist": {
        name: "Gemini Code Assist Standard / Enterprise",
        description: "회사·조직이 배정한 IDE·CLI 코딩 도구를 기록합니다. 개인용 Antigravity나 Gemini API와 별도입니다.",
      },
      "github-copilot-like-credits": {
        name: "GitHub Copilot 코딩 도구",
        description: "코드 편집기나 CLI에서 사용하는 AI 코딩 도구입니다. AI 크레딧 잔여량을 몰라도 추가할 수 있습니다.",
      },
      "custom-subscription": {
        name: "다른 AI 구독 직접 입력",
        description: "위에 없는 채팅·코딩 AI 구독을 기록합니다. 회사 제공 계정이어도 조직 API 권한으로 간주하지 않습니다.",
      },
    },
  },
  overrides: {
    eyebrow: "고급 설정 · 선택",
    title: "API 가격을 직접 수정하려면 펼치기",
    description: "공식 기본 가격과 다른 값을 시험할 때만 사용합니다.",
    sessionOnly: "직접 입력한 값은 공식 기본값과 별도로 이 브라우저와 내보내기 파일에 저장됩니다. 기본값 복원 시 사용자 값만 삭제합니다.",
    accessBoundary: "가격을 바꿔도 실제 이용 권한이나 기능 지원이 확인되는 것은 아닙니다.",
    providerLabel: "AI 회사",
    catalogTierLabel: "모델",
    planningTierLabel: "계획 등급",
    keepDefaultTier: "공식 기본 등급 유지",
    inputPriceLabel: "토큰 100만 개당 입력 가격 (USD)",
    outputPriceLabel: "토큰 100만 개당 출력 가격 (USD)",
    effectiveFromLabel: "적용 시작일",
    officialDefault: "공식 기본값",
    apply: "수정 적용",
    restore: "기본값 복원",
    active: "적용 중인 사용자 설정",
    savedSources: "저장된 사용자 가격 설정",
    userSupplied: "사용자 입력",
    unresolvedSource: "대상을 찾을 수 없음 · 적용 안 됨",
    futureSource: "미래 날짜 설정 · 적용 안 됨",
    removeUnresolved: "적용할 수 없는 가격 설정 삭제",
    none: "저장된 사용자 가격 설정 없음",
    applied: "수정값을 적용했습니다.",
    restored: "공식 기본값으로 복원했습니다.",
    removed: "적용할 수 없는 가격 설정을 삭제했습니다.",
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
    referenceSummaryTitle: "참고용 API 예상 비용",
    referenceSummaryDescription: "공개 API 가격과 토큰 한도만 사용한 참고 비용입니다. 필요한 기능을 지원하는지와 내 계정에서 쓸 수 있는지는 확인하지 않았으며, 위 전체 비용과 예산 판단에는 포함하지 않습니다.",
    referenceProviderChoice: "공급자별 참고 비용",
    referenceExpectedTotal: "보통 사용 기준 참고 총비용",
    referenceIncludedTasks: (active, total) => `비용 계산 포함 ${active}/${total}개 작업`,
    referenceTaskModel: "참고 모델",
    referenceTaskExpectedCost: "보통 사용 기준 참고 비용",
    referenceHeldTask: "예산상 참고 계산에서 보류",
    referenceInfeasibleTask: "모델의 입력·출력 한도를 넘어 비용을 계산할 수 없음",
    referenceOpenDetails: "공급자·모델별 상세 계산 보기",
    budgetRequiredTitle: "예산 확인이 필요합니다.",
    budgetRequiredDescription: "입력한 금액의 범위를 확인하면 분석을 다시 실행하지 않고 작업 계획을 계산합니다.",
    analysisRequiredTitle: "새 방식으로 작업을 분석해 주세요.",
    analysisRequiredDescription: "저장된 이전 결과는 유지됩니다. 예시 또는 실제 분석으로 새 계획을 만들 수 있습니다.",
    calculationError: "작업 계획을 다시 계산하지 못했습니다. 입력값을 확인한 뒤 다시 시도하세요.",
    totalIncrementalCash: "새로 필요한 총비용",
    apiTaskPrice: "API 예상 비용 (적게 / 보통 / 많이 사용)",
    subscriptionMarginalCash: "이 작업에 배분된 구독 비용 (적게 / 보통 / 많이 사용)",
    subscriptionMarginalCashNotice: "여러 작업이 같은 새 구독을 사용할 때 전체 구독 비용 중 이 작업에 나눈 몫입니다. 작업 하나의 실제 가격은 아니므로 계획의 전체 비용을 함께 확인하세요.",
    apiSpend: "API 사용료",
    subscriptionUsage: "구독 사용량",
    newCommitment: "새 구독료",
    paidOverage: "유료 초과 사용료",
    expectedBudgetStatus: "보통 사용 기준 예산 상태",
    withinBudget: "예산 이내",
    outsideBudget: "예산 초과",
    highRisk: "많이 사용하는 경우 예산을 넘습니다.",
    noHighRisk: "많이 사용하는 경우도 예산 이내입니다.",
    budgetNotAssessed: "예산 판정 보류",
    budgetNotAssessedDescription: "비용을 확실히 계산할 이용 방법이 없어 예산 상태를 판단하지 않았습니다.",
    excludedCostNoticeTitle: "표시된 비용을 먼저 확인해 주세요",
    excludedCostNotice: (count, allTasks) =>
      allTasks
        ? `작업 ${count}건 모두 이용 방법을 확정하지 못해 비용 합계에서 제외했습니다. US$0.00은 모든 작업을 무료로 실행할 수 있다는 뜻이 아닙니다.`
        : `이용 방법을 확정하지 못한 작업 ${count}건의 비용은 합계와 예산 판단에서 제외했습니다.`,
    avoidedSpend: "고성능 API만 사용할 때보다 아낄 수 있는 금액",
    additionalSpend: "고성능 API만 사용할 때보다 더 드는 금액",
    noPremiumBaseline: "비교할 고성능 API 계획이 없어 절감액을 계산하지 않습니다.",
    activeHeldInfeasible: (active, held, infeasible) => `실행 ${active} · 보류 ${held} · 실행 불가 ${infeasible}`,
    taskNumber: (index) => `작업 ${index}`,
    accessRoute: "추천 이용 방법",
    model: "연결 모델",
    unknownRouteLabel: "확인할 수 없는 이용 방법",
    noConfirmedRoute: "추천을 확정할 수 있는 이용 방법 없음",
    whyEnough: "이 이용 방법을 고른 이유",
    premiumChoice: "고성능 등급 사용 여부",
    upgradeTriggers: "상위 등급을 선택한 이유",
    alternative: "다른 이용 방법",
    holdReason: "보류 이유",
    infeasibleReason: "실행 불가 이유",
    holdReasonValue: "확인된 이용 방법의 보통 사용 비용이 예산을 초과합니다.",
    infeasibleReasonValue: "이 작업의 조건을 만족한다고 확인된 이용 방법이 없습니다.",
    needsVerificationStatus: "추가 확인 필요",
    requirementsUnmetStatus: "조건 불충족",
    apiSetupTitle: "실행 전 API 준비",
    apiSetupDescription: "계획은 공식 모델/API 정보로 계산했습니다. 실제 실행 전에는 아래 공급자의 계정, 결제 설정과 API 키를 확인해 주세요.",
    apiSetupPrivacy: "이 앱은 API 키를 요청하거나 저장하지 않으며, 개인 계정의 사용 가능 상태를 검사하지 않습니다.",
    apiSetupLink: (providerName) => `${providerName} 설정 안내 열기`,
    infeasibleHelp: {
      open: "왜 이용 방법을 확정하지 못했나요?",
      title: (taskName) => `${taskName}: 이용 방법을 확정하지 못한 이유`,
      intro: "추천을 확정하지 못한 이유와 지금 할 수 있는 일을 나눠 안내합니다.",
      reviewedRoutes: (count) => `검토한 이용 방법 ${count}개`,
      causesTitle: "이번 계산에서 확인되지 않은 부분",
      noCause: "세부 제외 사유를 확인하지 못했습니다.",
      resourceIssuesTitle: "계획 전체에서 미완성된 구독 입력",
      resourceIssue: (resourceName, fields) => `${resourceName}: ${fields}`,
      inputProblemTitle: "먼저 완료할 구독 입력이 있습니다",
      inputProblemDescription: "계획 전체에 미완성 구독 카드가 있습니다. 아래 필수 항목을 확인해 주세요.",
      inputProblemCaveat: "필수 입력을 완료해도 앱에 모델/API 기능이나 한도 정보가 없는 이용 방법은 확정할 수 없습니다.",
      systemProblemTitle: "사용자가 고칠 입력은 없습니다",
      systemProblemDescription: "앱의 모델/API 정보에 이 작업을 판단할 기능이나 한도가 빠져 있거나 현재 이용 방법과 연결되지 않았습니다. 입력을 더 채워도 해결되지 않습니다.",
      systemProblemStatus: "지금은 예상 모델과 비용을 아래 참고 계획에서 확인할 수 있습니다.",
      accountStatusNotice: "이 판정은 개인 계정이나 API 키가 현재 사용할 수 있는 상태인지 검사한 결과가 아닙니다.",
      systemTaskConstraintNote: "일부 이용 방법은 입력·출력 한도, 최소 품질 또는 필수 기능 조건도 충족하지 못했습니다.",
      taskProblemTitle: "현재 작업 조건을 만족하는 이용 방법이 없습니다",
      taskProblemDescription: "작업을 더 작은 단위로 나누거나 필요한 산출물 범위를 검토한 뒤 다시 분석해 주세요. 변경해도 추천을 확정할 수 있다고 보장되지는 않습니다.",
      genericProblemTitle: "이용 방법별 상세 이유를 확인해 주세요",
      genericProblemDescription: "현재 화면에서 바로 고칠 수 있는 입력을 찾지 못했습니다. 후보마다 제외된 이유를 확인할 수 있습니다.",
      goToResourceInput: "첫 번째 필수 입력으로 이동",
      reviewTaskInput: "작업 입력 검토하기",
      showRouteDetails: "이용 방법별 상세 이유 보기",
      viewReferencePlan: "검증 전 참고 계획 보기",
      nextStepsTitle: "확인하거나 바꿀 수 있는 방법",
      guidance: {
        providerVerification: "앱에 이 모델/API의 기능이나 한도 정보가 부족하거나 현재 이용 방법과 연결되지 않았습니다. 아래 항목은 가격과 등록된 한도만 사용한 참고 후보이며, 내 계정이나 API 키로 쓸 수 있는지는 별도로 확인해야 합니다.",
        resourceSettings: "구독 카드에서 사용 환경, 보유 여부, 현재 사용 가능 여부, 이번 결제 기간 요금과 한도를 확인해 주세요. 다만 사용자 입력만으로 공급자 공식 근거 부족까지 해소되지는 않습니다.",
        workloadScope: "입력·출력 또는 전체 문맥 한도를 넘었다면 작업을 더 작은 단위로 나누거나 필요한 산출물 범위를 줄인 뒤 다시 분석해 주세요.",
        qualityRequirements: "분석된 최소 품질이나 필수 기능을 만족하는 이용 방법이 없습니다. 작업 설명의 제약과 산출물을 더 구체적으로 적어 다시 분석하거나, 해당 기능이 확인된 다른 이용 방법이 필요합니다.",
        pricingData: "현재 날짜에 적용할 수 있는 가격표를 확인하지 못했습니다. 공식 기본값을 복원하거나 가격 적용일과 사용자 수정값을 확인해 주세요.",
        technicalConfiguration: "저장된 구독 종류, 모델 정보 또는 계정 연결이 현재 설정과 맞지 않습니다. 해당 항목을 다시 선택하거나 기본값으로 복원해 주세요.",
        reviewDetails: "아래 ‘추천하지 못한 이용 방법’을 펼치면 항목별 세부 이유를 확인할 수 있습니다.",
      },
      detailHint: "팝업을 닫은 뒤 ‘추천하지 못한 이용 방법’을 펼치면 모델별 상세 이유를 볼 수 있습니다.",
      close: "닫기",
    },
    conditionalAlternatives: "확인이 더 필요한 구독 선택지",
    excludedRoutes: "추천하지 못한 이용 방법",
    unknownExclusionReason: "자세한 제외 이유를 확인하지 못함",
    resourceDiagnostics: "구독 정보 확인 결과",
    noSubscriptionUsage: "계획에 반영된 구독 사용량이 없습니다.",
    tasksUsingRoute: (taskIds) => `배정 작업: ${taskIds}`,
    usageUnit: (unit) => `기본 단위: ${unit}`,
    usedRange: (low, expected, high) => `사용량 ${low} / ${expected} / ${high}`,
    remainingRange: (low, expected, high) => `남은 포함량 ${low} / ${expected} / ${high}`,
    overageRange: (low, expected, high) => `초과 사용 ${low} / ${expected} / ${high}`,
    scenarioOverflow: "예상 비용이 너무 커 화면에 정확히 표시할 수 없습니다. 비교 계산에는 원래 값을 사용했습니다.",
    generatedAt: (date) => `${date} 기준 · 정해진 규칙으로 다시 계산`,
  },
  enums: {
    ownership: { owned: "이미 이용 중", "candidate-new": "새로 구독 검토" },
    availability: { available: "예, 사용", unavailable: "이 계획에서 제외", uncertain: "확인 필요" },
    quotaKind: { metered: "정확한 수치를 알고 있음", calibrated: "남은 비율을 알고 있음", "initial-capacity": "새 구독의 시작 한도", opaque: "정확히 모름 (권장)" },
    quotaUnit: { request: "요청", credit: "크레딧", "percent-point": "퍼센트 포인트" },
    resetKind: { none: "자동 초기화 없음", fixed: "정해진 시각에 전체 초기화", rolling: "사용한 시점마다 일정 시간 뒤 초기화", unknown: "잘 모르겠음 (권장)" },
    surface: { chat: "채팅", "ide-cli": "IDE / CLI", batch: "배치" },
    planningTier: { economy: "절약형", balanced: "균형형", premium: "고성능" },
    routeKind: { "owned-within-included-quota": "보유 구독의 포함 사용량", api: "API", "owned-paid-overage": "보유 구독의 유료 초과 사용", "new-subscription": "새 구독" },
    whyEnough: { "minimum-quality-met": "필요한 최소 품질을 충족합니다.", "higher-tier-saved-cash": "한 단계 높은 등급이 오히려 추가 비용이 적습니다.", "quality-headroom-triggered": "정해진 조건에 따라 한 단계 높은 등급을 선택했습니다.", "minimum-quality-requires-premium": "더 낮은 등급이 작업 조건을 만족하지 않아 고성능 등급이 필요합니다." },
    whyNotPremium: { "premium-selected": "사용 · 최소 품질 또는 적용된 상향 조건에 따라 고성능 등급이 필요합니다.", "premium-not-triggered": "사용하지 않음 · 고성능 등급이 필요한 조건이 없습니다.", "lower-tier-sufficient": "사용하지 않음 · 더 낮은 등급이 작업 조건을 충족합니다.", "no-compatible-premium-api": "비교 불가 · 작업 조건을 만족하는 고성능 API 계획이 없습니다." },
    upgradeTrigger: { "minimum-quality-requires-premium": "조건을 만족하는 더 낮은 등급 없음", "high-failure-exposure": "실패했을 때 영향이 큼", "deadline-retry-risk": "마감 전에 다시 시도할 여유가 적음", "deep-reasoning": "여러 단계를 생각해야 하는 작업", "large-code-change": "변경할 코드 범위가 큼" },
    exclusionReason: {
      "catalog-reference-unresolved": "앱에서 해당 모델 정보를 찾지 못함", "catalog-version-mismatch": "저장된 모델 정보가 현재 버전과 맞지 않음", "catalog-claim-mismatch": "저장된 모델 정보가 현재 공식 정보와 다름", "preset-reference-unresolved": "저장된 구독 종류를 찾지 못함", "preset-version-mismatch": "저장된 구독 종류가 현재 버전과 맞지 않음", "connector-unverified": "계정 연결 상태를 확인하지 못함", "connector-binding-mismatch": "연결된 계정 정보가 맞지 않음", "connector-snapshot-stale": "저장된 사용량 정보가 너무 오래됨", "connector-snapshot-replayed": "같은 사용량 정보가 다시 들어옴", "connector-receipt-invalid": "계정 연결 확인 정보가 올바르지 않음", "evidence-authority-invalid": "공식 확인 자료가 없음", "profile-unverified": "이 작업에 맞는 기능인지 확인되지 않음", "model-limits-incomplete": "모델 한도 정보가 부족함", "access-limits-incomplete": "이용 방법의 한도 정보가 부족함", "model-capabilities-incomplete": "모델 기능 정보가 부족함", "access-capabilities-incomplete": "이용 방법의 기능 정보가 부족함", "availability-uncertain": "현재 사용할 수 있는지 확실하지 않음", "consumption-user-observed": "사용량이 사용자 입력값임", "quota-calibrated": "한도가 사용자가 확인한 값으로 입력됨", "quota-opaque": "정확한 한도가 공개되지 않음", "quota-insufficient-observed": "입력한 남은 한도가 부족함", "initial-capacity-unpublished": "새 구독의 시작 한도가 공개되지 않음",
      "model-reference-missing": "연결할 모델 정보가 없음",
      "surface-incompatible": "필요한 사용 환경(채팅, IDE·CLI 등)을 지원하지 않음",
      "below-minimum-quality": "필요한 품질 기준보다 낮음",
      "required-capability-missing": "작업에 필요한 기능을 지원하지 않음",
      "input-limit-exceeded": UI_COPY.ko.enums.invocationFailure["input-limit-exceeded"],
      "output-limit-exceeded": UI_COPY.ko.enums.invocationFailure["output-limit-exceeded"],
      "context-limit-exceeded": UI_COPY.ko.enums.invocationFailure["context-limit-exceeded"],
      "price-schedule-not-applicable": "현재 날짜에 적용할 가격을 찾을 수 없음",
      "standard-price-input-limit-exceeded": "표준 가격이 적용되는 입력 길이를 초과함",
      "catalog-entry-not-found": "해당 모델 정보를 찾을 수 없음",
      "invalid-pricing-as-of": "가격 기준일이 유효하지 않음",
      "catalog-price-schedule-invalid": "저장된 가격 정보가 올바르지 않음",
      "catalog-invocation-limits-unresolved": "한 번에 처리할 입력·출력 한도를 확인할 수 없음",
      "invalid-token-scenarios": "예상 사용량을 계산할 수 없음",
      "invalid-user-override": "직접 수정한 가격이 올바르지 않음",
      "override-target-unresolved": "가격 수정 대상을 확인할 수 없음",
      "override-target-mismatch": "수정한 가격과 선택한 모델이 맞지 않음",
      "invocation-limit-exceeded": "한 번에 처리할 수 있는 토큰 수를 초과함",
      "resource-unavailable": "이번 계획에서 사용할 수 없는 구독",
      "api-route-not-confirmed": "이 API를 사용할 수 있는지 확인되지 않음",
    },
  },
};

const en: BestFitUiCopy = {
  ...ko,
  validation: {
    title: "Finish the required inputs",
    description: "The plan cannot be created until you fix the following items.",
    budgetDescription: "The budget cannot be confirmed until you fix the following items.",
    confirmBudgetIssue: "In Step 2, select ‘Plan with this amount’ to confirm what the budget includes.",
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
    title: "Do you have an AI subscription to use in this plan?",
    description: "Add the ChatGPT, Claude, Gemini, or GitHub Copilot subscriptions you can use for this plan. Personal subscriptions and work- or school-provided accounts can be recorded together. Subscriptions and APIs are separate, so a managed account does not count as organization API access. Skip this step if none apply.",
    sessionOnly: "Inputs are saved in this browser and recalculated when restored.",
    requirementHelp: "Adding a subscription is optional. In an added card, complete only the fields marked Required.",
    requiredField: "Required",
    optionalField: "Optional",
    addLegend: "Add an AI subscription",
    presetSelectLabel: "AI subscription to add",
    presetSelectPlaceholder: "Choose a subscription type",
    addSelected: "Add",
    maximumReached: "Up to eight resources are supported. Add separate accounts for the same service as separate resources.",
    sharedGooglePlanWarningTitle: "Check for a duplicated Google subscription fee",
    sharedGooglePlanWarningDescription:
      "Gemini Apps and Antigravity can be included in the same Google AI Pro or Ultra plan. This app cannot yet count the two entries as one subscription fee automatically. If they share one plan, mark only the card you expect to use as a new subscription. Enter both only when they use separate accounts and separate payments.",
    resourceLegend: (index) => `AI subscription ${index}`,
    remove: "Remove",
    nameLabel: "Display name",
    accessArrangementLabel: "Subscription arrangement",
    accessArrangementHelp: "Choose the option that matches your situation to show only the cost and access details you need.",
    accessArrangement: {
      unresolved: "Choose how you use this subscription",
      "personal-existing": "Personal subscription I already use",
      "personal-new": "Personal subscription I may add",
      "organization-provided": "Provided by work or school",
    },
    provisionedByLabel: "How is it provided?",
    provisionedBy: {
      unspecified: "Not specified yet",
      personal: "I pay for and manage it directly",
      organization: "Provided by work or school",
    },
    organizationOwnershipHelp: "Recorded as an account already assigned by your work or school.",
    organizationCostTitle: "US$0 applied to the personal budget",
    organizationCostHelp: "This calculation treats seat fees and overage as organization costs, so they are not added to your personal budget. Availability and admin restrictions are still checked separately.",
    ownershipLabel: "How do you access this service?",
    availabilityLabel: "Can you use it for this plan?",
    availabilityHelp: "Choose ‘Exclude from this plan’ to keep the information saved without adding it to the recommended usage methods.",
    surfaceLabel: "Where will you use it in this plan? (Choose one)",
    surfaceHelp: "Only tasks that match this environment are considered for this subscription.",
    feeLabel: "Subscription cost (USD)",
    currentFeeLabel: "Subscription fee you already pay · reference only (USD)",
    newSubscriptionFeeLabel: "Cost to add this subscription (USD)",
    existingFeeHelp: "A fee you already pay is not added again as a new cost.",
    newFeeHelp: "A selected new subscription is charged once for the complete plan.",
    usageSnapshot: {
      title: "Current usage remaining",
      description: "Record only items visible on the official usage screen. Each slider is the percentage remaining and also shows the percentage used.",
      metricLabels: {
        fiveHourRemainingPercent: "Five-hour limit",
        weeklyRemainingPercent: "Weekly limit",
        modelWeeklyRemainingPercent: "Model-specific weekly limit",
        dailyRemainingPercent: "Daily request limit",
        creditRemainingPercent: "Included credits",
      },
      record: "Enter value",
      edit: "Edit",
      save: "Save",
      cancel: "Cancel",
      clear: "Delete",
      unrecorded: "Not recorded yet",
      invalid: "Enter a whole number from 0 to 100",
      remaining: (percent) => `${percent}% remaining`,
      used: (percent) => `${percent}% used`,
      bottleneck: (percent) => `Lowest remaining limit: ${percent}%`,
      bottleneckHelp: "The lowest recorded percentage is shown first. Without observed use per task, the planner does not invent an exact number of tasks that will fit.",
      modelLabel: "Model name shown by the service",
      modelPlaceholder: "For example: the model name shown on screen",
    },
    quotaKindLabel: "Detailed limit input",
    quotaComplexityHelp: "If several limits apply at once, such as a five-hour and a weekly limit, or models consume different amounts, choose ‘I do not know the exact limit’ and record what you see in the quota note. Do not split multiple limits for one account into separate subscription cards.",
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
          title: "ChatGPT · Codex",
          steps: [
            "Sign in to ChatGPT and confirm the plan currently in use.",
            "Check the ChatGPT model picker and limit notices. In Codex, use /usage. A five-hour limit and additional weekly limits can apply together, so do not combine them into one number.",
          ],
        },
        "claude-subscription": {
          title: "Claude",
          steps: [
            "Open Claude Settings → Usage. On a work account, your own usage and spend limit are visible only when the administrator enables member analytics.",
            "A five-hour limit, an all-model weekly limit, and a model-specific weekly limit can appear together. Record only the model names and percentages currently shown.",
          ],
        },
        "gemini-subscription": {
          title: "Gemini chat",
          steps: [
            "For a personal account, check Gemini Settings and any Usage limits notice. For a work or school account, a Workspace administrator may need to confirm the license and access.",
            "Gemini Apps five-hour and weekly limits apply to chat. Chat can write code, but the subscription does not include coding CLI access; check Antigravity separately.",
          ],
        },
        "google-antigravity": {
          title: "Google Antigravity · CLI",
          steps: [
            "Open the Antigravity usage settings and check the current plan and the base limit shown for each model.",
            "Google AI Pro and Ultra can combine a five-hour base limit with a weekly limit. Do not merge them; record the wording shown in the quota note.",
          ],
        },
        "gemini-code-assist": {
          title: "Gemini Code Assist Standard / Enterprise · CLI",
          steps: [
            "Ask the administrator or Google Cloud project owner whether a Gemini Code Assist license is assigned to the work account.",
            "Standard and Enterprise IDE/CLI plans use daily request limits. Gemini chat, Antigravity, Code Assist, and APIs do not share one access right or usage limit.",
          ],
        },
        "github-copilot-like-credits": {
          title: "GitHub Copilot",
          steps: [
            "Open GitHub Settings → Billing & licensing, then check Copilot under Metered usage or open AI usage.",
            "Review included AI credits used. In VS Code, the Copilot status-bar icon also shows limit progress and the reset date.",
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
    observedUseLabel: "Use measured for one task",
    observedUseHelp: "Enter lower, likely, and higher use for one task plus how many times you measured it. These values remain reference information.",
    consumptionBasisLabel: "Consumption basis",
    taskBasis: "Per task",
    iterationBasis: "Per analysis iteration",
    lowLabel: "Lower use",
    expectedLabel: "Likely use",
    highLabel: "Higher use",
    sampleSizeLabel: "Number of measurements",
    opaqueDescriptionLabel: "Quota note",
    resetKindLabel: "When does the limit reset?",
    nextResetLabel: "Next reset time",
    cadenceDaysLabel: "Reset cadence (days)",
    rollingHoursLabel: "Hours from use until reset",
    rollingHoursHelp: "Use this only when the official guide says each use resets separately after a set number of hours. If five-hour and weekly limits both apply, choose ‘I do not know exactly.’",
    conditionalNotice: "Subscription details you enter are for reference. When access or limits cannot be verified, the subscription is not included in a confirmed recommendation; estimated API costs remain available in the reference plan.",
    conditionalStatus: "Reference information",
    invalidStatus: "Finish setup",
    fieldError: "Check the display name, work surface, and fee. If you selected detailed settings, complete those values too.",
    fieldsToCheck: "Check the following fields",
    technicalDetails: "Other item to check",
    relinkTitle: "Choose the saved subscription type again.",
    relinkDescription: "The saved subscription type no longer matches the current list. Choosing a current type clears its usage location and limit details while keeping the display name, availability, and fee.",
    relinkLabel: "Current subscription type",
    relinkPlaceholder: "Choose a subscription type",
    presets: {
      "chatgpt-like-variable": { name: "ChatGPT · Codex subscription", description: "Choose this for ChatGPT or Codex included with its plan. You can add it without knowing the five-hour and weekly limits." },
      "claude-subscription": { name: "Claude subscription", description: "Record a personal or managed account used with Claude, Claude Code, or Cowork." },
      "gemini-subscription": { name: "Gemini chat subscription", description: "For Gemini Apps chat. It can answer coding questions, but the subscription does not include coding CLI access." },
      "google-antigravity": { name: "Google Antigravity coding tool", description: "Record the personal IDE or CLI coding tool. Its limits can be separate from Gemini chat and API access." },
      "gemini-code-assist": { name: "Gemini Code Assist Standard / Enterprise", description: "Record an IDE or CLI coding tool assigned by an organization. It is separate from personal Antigravity and Gemini API access." },
      "github-copilot-like-credits": { name: "GitHub Copilot coding tool", description: "An AI coding tool used in code editors or a CLI. You can add it without knowing the remaining AI credits." },
      "custom-subscription": { name: "Enter another AI subscription", description: "Record a chat or coding AI subscription not listed above. A managed account still does not count as organization API access." },
    },
  },
  overrides: {
    eyebrow: "Advanced · optional",
    title: "Open to enter custom API prices",
    description: "Use this only when you want to test values other than the official defaults.",
    sessionOnly: "Your values are stored separately from official defaults in this browser and exported files. Restoring defaults removes only your values.",
    accessBoundary: "Changing a price does not confirm real access or feature support.",
    providerLabel: "AI company",
    catalogTierLabel: "Model",
    planningTierLabel: "Plan tier",
    keepDefaultTier: "Keep the official default tier",
    inputPriceLabel: "Input price per 1 million tokens (USD)",
    outputPriceLabel: "Output price per 1 million tokens (USD)",
    effectiveFromLabel: "Effective from",
    officialDefault: "Verified default",
    apply: "Apply override",
    restore: "Restore default",
    active: "Active custom settings",
    savedSources: "Saved custom price settings",
    userSupplied: "User-supplied",
    unresolvedSource: "Target unavailable · not applied",
    futureSource: "Future-dated setting · not applied",
    removeUnresolved: "Remove price setting that cannot be applied",
    none: "No saved custom price settings",
    applied: "Override applied.",
    restored: "Verified defaults restored.",
    removed: "Price setting that could not be applied was removed.",
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
    referenceSummaryDescription: "This reference cost uses only public API prices and token limits. It does not verify required features or access from your account, and it is excluded from the total and budget decision above.",
    referenceProviderChoice: "Reference cost by provider",
    referenceExpectedTotal: "Likely-use reference total",
    referenceIncludedTasks: (active, total) => `${active}/${total} tasks included in the cost calculation`,
    referenceTaskModel: "Reference model",
    referenceTaskExpectedCost: "Likely-use reference cost",
    referenceHeldTask: "Held from the reference calculation for budget",
    referenceInfeasibleTask: "Reference cost unavailable under invocation limits",
    referenceOpenDetails: "View provider and model calculation details",
    budgetRequiredTitle: "Confirm your budget first.",
    budgetRequiredDescription: "Confirm what the amount includes to calculate the plan without running the analysis again.",
    analysisRequiredTitle: "Analyze the work with the new planner.",
    analysisRequiredDescription: "Your previous result is preserved. Create a new sample plan or analyze your tasks when ready.",
    calculationError: "The work plan could not be recalculated. Check the inputs and try again.",
    totalIncrementalCash: "Total new cost",
    apiTaskPrice: "Estimated API cost (Lower / Likely / Higher use)",
    subscriptionMarginalCash: "Subscription cost assigned to this task (Lower / Likely / Higher use)",
    subscriptionMarginalCashNotice: "When several tasks share one new subscription, this is the portion of the subscription cost assigned to this task. It is not the actual standalone price of the task, so review the total plan cost too.",
    apiSpend: "API spend",
    subscriptionUsage: "Subscription usage",
    newCommitment: "New subscription fee",
    paidOverage: "Extra charges after limits",
    expectedBudgetStatus: "Likely-use budget status",
    withinBudget: "Within budget",
    outsideBudget: "Over budget",
    highRisk: "The higher-use case exceeds the budget.",
    noHighRisk: "The higher-use case remains within budget.",
    budgetNotAssessed: "Budget assessment pending",
    budgetNotAssessedDescription: "No usage method could be confirmed and priced, so budget status was not assessed.",
    excludedCostNoticeTitle: "Check what the displayed cost includes",
    excludedCostNotice: (count, allTasks) =>
      allTasks
        ? `No usage method could be confirmed for all ${count} task${count === 1 ? "" : "s"}, so their costs were excluded from the total. US$0.00 does not mean every task can run for free.`
        : `${count} task${count === 1 ? " has" : "s have"} no confirmed usage method, so ${count === 1 ? "its cost was" : "their costs were"} excluded from totals and budget assessment.`,
    avoidedSpend: "Estimated savings versus using only high-performance APIs",
    additionalSpend: "Additional cost versus using only high-performance APIs",
    noPremiumBaseline: "No high-performance API plan meets the task conditions, so no savings value is shown.",
    activeHeldInfeasible: (active, held, infeasible) => `Planned ${active} · waiting ${held} · no matching option ${infeasible}`,
    taskNumber: (index) => `Task ${index}`,
    accessRoute: "Recommended way to use AI",
    model: "Connected model",
    unknownRouteLabel: "Usage method unavailable",
    noConfirmedRoute: "No usage method could be confirmed",
    whyEnough: "Why this method was chosen",
    premiumChoice: "Use of the high-performance tier",
    upgradeTriggers: "Why a higher tier was selected",
    alternative: "Another usage method",
    holdReason: "Hold reason",
    infeasibleReason: "Why no matching option was found",
    holdReasonValue: "The likely-use cost of confirmed methods exceeds the budget.",
    infeasibleReasonValue: "No usage method is confirmed to meet this task's conditions.",
    needsVerificationStatus: "Needs more verification",
    requirementsUnmetStatus: "Requirements unmet",
    apiSetupTitle: "Prepare the API before running",
    apiSetupDescription: "This plan uses verified model and API catalog data. Before execution, check the account, billing setup, and API key for each provider below.",
    apiSetupPrivacy: "This app never requests or stores API keys, and it does not test your personal account access.",
    apiSetupLink: (providerName) => `Open ${providerName} setup guide`,
    infeasibleHelp: {
      open: "Why couldn't a usage method be confirmed?",
      title: (taskName) => `${taskName}: why no usage method was confirmed`,
      intro: "This separates the reason from what you can do now.",
      reviewedRoutes: (count) => `${count} usage method${count === 1 ? "" : "s"} reviewed`,
      causesTitle: "What remained unverified in this calculation",
      noCause: "No detailed exclusion reason was available.",
      resourceIssuesTitle: "Incomplete subscription inputs in this plan",
      resourceIssue: (resourceName, fields) => `${resourceName}: ${fields}`,
      inputProblemTitle: "Some subscription inputs still need attention",
      inputProblemDescription: "A subscription card in this plan is incomplete. Review the required fields below.",
      inputProblemCaveat: "Completing the required inputs still cannot confirm a usage method when its model/API feature or limit data is missing from the app.",
      systemProblemTitle: "There is no user input to fix",
      systemProblemDescription: "The app is missing a model/API feature or limit needed for this task, or the data is not linked to the current usage method. Filling in more fields will not fix it.",
      systemProblemStatus: "For now, you can review the estimated model and cost in the reference plan below.",
      accountStatusNotice: "This result does not check whether your account or API key currently has access.",
      systemTaskConstraintNote: "Some usage methods also fail this task's input/output limits, minimum quality, or required-feature conditions.",
      taskProblemTitle: "No usage method meets the current task conditions",
      taskProblemDescription: "Review whether the work can be split or the deliverable narrowed, then analyze it again. A change does not guarantee a confirmed recommendation.",
      genericProblemTitle: "Review the reason for each usage method",
      genericProblemDescription: "No input that can be fixed directly on this screen was found. You can inspect why each candidate was excluded.",
      goToResourceInput: "Go to the first required input",
      reviewTaskInput: "Review task input",
      showRouteDetails: "Show reasons by usage method",
      viewReferencePlan: "View the pre-verification reference plan",
      nextStepsTitle: "What you can check or change",
      guidance: {
        providerVerification: "Feature or limit data for this model/API is missing or not linked to the current usage method. The items below are reference options based only on price and registered limits; verify account or API-key access separately.",
        resourceSettings: "Review the subscription card's surface, ownership, current availability, fee for this billing period, and limit. User input still cannot replace missing official provider evidence.",
        workloadScope: "If input, output, or total context exceeds a limit, split the work into smaller tasks or reduce the requested deliverable, then analyze it again.",
        qualityRequirements: "No usage method meets the analyzed minimum quality or required features. Clarify the task constraints and deliverable before analyzing again, or use another method whose features are verified.",
        pricingData: "No price schedule applies at the current date. Restore the official default or review the effective date and user override.",
        technicalConfiguration: "A saved subscription type, model record, or account connection no longer matches the current setup. Choose it again or restore the default.",
        reviewDetails: "Expand “Usage methods not recommended” below for details.",
      },
      detailHint: "After closing this dialog, expand “Usage methods not recommended” to see model-level details.",
      close: "Close",
    },
    conditionalAlternatives: "Subscription options that need more verification",
    excludedRoutes: "Usage methods not recommended",
    unknownExclusionReason: "Detailed exclusion reason unavailable",
    resourceDiagnostics: "Subscription information check",
    noSubscriptionUsage: "No subscription usage was included in this plan.",
    tasksUsingRoute: (taskIds) => `Assigned tasks: ${taskIds}`,
    usageUnit: (unit) => `Native unit: ${unit}`,
    usedRange: (low, expected, high) => `Used ${low} / ${expected} / ${high}`,
    remainingRange: (low, expected, high) => `Included remaining ${low} / ${expected} / ${high}`,
    overageRange: (low, expected, high) => `Overage ${low} / ${expected} / ${high}`,
    scenarioOverflow: "An estimated cost is too large to display exactly. The original value is still used for the comparison.",
    generatedAt: (date) => `Recalculated with fixed rules as of ${date}`,
  },
  enums: {
    ...ko.enums,
    ownership: { owned: "Already use", "candidate-new": "Considering a new subscription" },
    availability: { available: "Yes, use it", unavailable: "Exclude from this plan", uncertain: "Need to confirm" },
    quotaKind: { metered: "I know the exact numbers", calibrated: "I know the remaining percentage", "initial-capacity": "Starting limit for a new subscription", opaque: "I do not know exactly (recommended)" },
    quotaUnit: { request: "request", credit: "credit", "percent-point": "percentage point" },
    resetKind: { none: "No automatic reset", fixed: "Full reset at a set time", rolling: "Each use resets after a set time", unknown: "I am not sure (recommended)" },
    surface: { chat: "Chat", "ide-cli": "IDE / CLI", batch: "Batch" },
    planningTier: { economy: "Economy", balanced: "Balanced", premium: "High performance" },
    routeKind: { "owned-within-included-quota": "Included use in an existing subscription", api: "API", "owned-paid-overage": "Paid overage on an existing subscription", "new-subscription": "New subscription" },
    whyEnough: { "minimum-quality-met": "Meets the minimum required quality.", "higher-tier-saved-cash": "A higher tier has a lower additional cost.", "quality-headroom-triggered": "A fixed condition selected one higher tier.", "minimum-quality-requires-premium": "A high-performance tier is needed because lower tiers do not meet the task conditions." },
    whyNotPremium: { "premium-selected": "Used · Minimum quality or an upgrade condition requires the high-performance tier.", "premium-not-triggered": "Not used · No condition requires the high-performance tier.", "lower-tier-sufficient": "Not used · A lower tier meets the task conditions.", "no-compatible-premium-api": "Not comparable · No high-performance API plan meets the task conditions." },
    upgradeTrigger: { "minimum-quality-requires-premium": "No lower tier meets the conditions", "high-failure-exposure": "Failure would have a large impact", "deadline-retry-risk": "Little time to retry before the deadline", "deep-reasoning": "Work requires several reasoning steps", "large-code-change": "A large amount of code must change" },
    exclusionReason: {
      "catalog-reference-unresolved": "The app cannot find this model", "catalog-version-mismatch": "The saved model information does not match this version", "catalog-claim-mismatch": "The saved model information differs from the current official information", "preset-reference-unresolved": "The saved subscription type cannot be found", "preset-version-mismatch": "The saved subscription type does not match this version", "connector-unverified": "The account connection could not be checked", "connector-binding-mismatch": "The connected account details do not match", "connector-snapshot-stale": "The saved usage information is too old", "connector-snapshot-replayed": "The same usage information was received again", "connector-receipt-invalid": "The account-connection check is invalid", "evidence-authority-invalid": "No official verification information is available", "profile-unverified": "The app cannot verify that this option fits the task", "model-limits-incomplete": "Model limit information is incomplete", "access-limits-incomplete": "Limit information for this usage method is incomplete", "model-capabilities-incomplete": "Model feature information is incomplete", "access-capabilities-incomplete": "Feature information for this usage method is incomplete", "availability-uncertain": "Current availability is uncertain", "consumption-user-observed": "Usage comes from a value entered by the user", "quota-calibrated": "The limit comes from a value checked by the user", "quota-opaque": "The exact limit is not published", "quota-insufficient-observed": "The entered remaining limit is insufficient", "initial-capacity-unpublished": "The starting limit for a new subscription is not published",
      "model-reference-missing": "No model information is available to connect",
      "surface-incompatible": "Does not support the required environment, such as chat or IDE/CLI",
      "below-minimum-quality": "Below the required quality level",
      "required-capability-missing": "Does not support a feature required by the task",
      "input-limit-exceeded": UI_COPY.en.enums.invocationFailure["input-limit-exceeded"],
      "output-limit-exceeded": UI_COPY.en.enums.invocationFailure["output-limit-exceeded"],
      "context-limit-exceeded": UI_COPY.en.enums.invocationFailure["context-limit-exceeded"],
      "price-schedule-not-applicable": "No price applies on the current date",
      "standard-price-input-limit-exceeded": "The input is too long for standard pricing",
      "catalog-entry-not-found": "The model information cannot be found",
      "invalid-pricing-as-of": "Invalid pricing reference date",
      "catalog-price-schedule-invalid": "The saved price information is invalid",
      "catalog-invocation-limits-unresolved": "Per-request input and output limits are unavailable",
      "invalid-token-scenarios": "The expected usage could not be calculated",
      "invalid-user-override": "The custom price is invalid",
      "override-target-unresolved": "Override target unresolved",
      "override-target-mismatch": "The custom price does not match the selected model",
      "invocation-limit-exceeded": "The request is larger than a token limit",
      "resource-unavailable": "Subscription cannot be used for this plan",
      "api-route-not-confirmed": "Access to this API is not confirmed",
    },
  },
};

const ja: BestFitUiCopy = {
  ...en,
  validation: {
    title: "必須入力を完了してください",
    description: "次の項目を修正するまで計画を作成できません。",
    budgetDescription: "次の項目を修正するまで予算を確認できません。",
    confirmBudgetIssue: "ステップ2で「この金額で計画する」を押し、予算に含む範囲を確認してください。",
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
    title: "今回の計画で使うAIサブスクリプションはありますか？",
    description: "今回使うChatGPT、Claude、Gemini、GitHub Copilotのサブスクリプションを追加してください。個人契約と会社・学校提供のアカウントを一緒に記録できます。サブスクリプションとAPIは別なので、管理対象アカウントも組織のAPI利用権限とはみなしません。該当しなければスキップできます。",
    sessionOnly: "入力はこのブラウザに保存され、復元時に再計算されます。",
    requirementHelp: "追加は任意です。追加したカードでは「必須」の項目だけを入力してください。",
    requiredField: "必須",
    optionalField: "任意",
    addLegend: "AIサブスクリプションを追加",
    presetSelectLabel: "追加するAIサブスクリプション",
    presetSelectPlaceholder: "サブスクリプションの種類を選択",
    addSelected: "追加",
    maximumReached: "最大8件をサポートします。同じサービスの別アカウントもそれぞれ追加できます。",
    sharedGooglePlanWarningTitle: "Googleサブスクリプション料金の重複入力を確認してください",
    sharedGooglePlanWarningDescription:
      "Gemini AppsとAntigravityは、同じGoogle AI ProまたはUltraプランに含まれる場合があります。このアプリは、2つの項目を自動で1回分の料金として計算できません。同じプランなら、今回実際に使うカードだけを「新規契約」にしてください。別アカウント・別決済なら両方を入力できます。",
    resourceLegend: (index) => `AIサブスクリプション ${index}`,
    remove: "削除",
    nameLabel: "表示名",
    accessArrangementLabel: "サブスクリプションの利用形態",
    accessArrangementHelp: "現在の状況に合う項目を選ぶと、必要な費用と利用情報だけを表示します。",
    accessArrangement: {
      unresolved: "利用形態を選択してください",
      "personal-existing": "現在利用中の個人サブスクリプション",
      "personal-new": "新たに契約を検討する個人サブスクリプション",
      "organization-provided": "会社・学校から提供されたサブスクリプション",
    },
    provisionedByLabel: "どのように提供されていますか？",
    provisionedBy: {
      unspecified: "まだ区分しない",
      personal: "自分で直接支払い・管理",
      organization: "会社・学校から提供",
    },
    organizationOwnershipHelp: "会社・学校からすでに割り当てられたアカウントとして記録します。",
    organizationCostTitle: "個人予算への反映額 US$0",
    organizationCostHelp: "この計算では席料や超過利用料を組織負担として扱い、個人予算に加算しません。実際の利用可否と管理者制限は別に確認します。",
    ownershipLabel: "このサービスをどのように利用しますか？",
    availabilityLabel: "今回の計画で利用できますか？",
    availabilityHelp: "「今回の計画から除外」を選ぶと、情報は保存したまま推奨する利用方法には含めません。",
    surfaceLabel: "今回利用する場所（1つ選択）",
    surfaceHelp: "ここで選んだ利用環境に合う作業だけを、このサブスクリプションの候補として検討します。",
    feeLabel: "サブスクリプション費用（USD）",
    currentFeeLabel: "現在支払っている料金・参考用（USD）",
    newSubscriptionFeeLabel: "新たに契約する場合の費用（USD）",
    existingFeeHelp: "すでに支払っている料金は新しい費用として再加算しません。",
    newFeeHelp: "新規サブスクリプションを選ぶ場合、計画全体で一度だけ加算します。",
    usageSnapshot: {
      title: "現在の残り使用量",
      description: "公式の使用量画面に表示される項目だけを記録してください。スライダーは残りの割合で、使用済み割合も同時に表示します。",
      metricLabels: {
        fiveHourRemainingPercent: "5時間上限",
        weeklyRemainingPercent: "週間上限",
        modelWeeklyRemainingPercent: "モデル別週間上限",
        dailyRemainingPercent: "1日あたりのリクエスト上限",
        creditRemainingPercent: "付与クレジット",
      },
      record: "入力する",
      edit: "編集",
      save: "保存",
      cancel: "キャンセル",
      clear: "削除",
      unrecorded: "未記録",
      invalid: "0～100の整数を入力してください",
      remaining: (percent) => `残り ${percent}%`,
      used: (percent) => `使用 ${percent}%`,
      bottleneck: (percent) => `残りが最も少ない上限 ${percent}%`,
      bottleneckHelp: "入力した上限のうち、残りが最も少ない割合を先に表示します。作業ごとの消費量がないため、残りの作業数を推測して確定はしません。",
      modelLabel: "公式画面に表示されたモデル名",
      modelPlaceholder: "例：公式画面に表示されたモデル名",
    },
    quotaKindLabel: "利用上限の詳細入力方式",
    quotaComplexityHelp: "5時間上限と週間上限のように複数の制限が同時に適用される場合や、モデルごとに消費量が異なる場合は「正確な上限は不明」を選び、表示内容をメモへ記録してください。同じアカウントの複数上限を別カードに分けないでください。",
    quotaGuide: {
      open: "上限の確認方法",
      title: "サブスクリプションの上限はどこで確認できますか？",
      intro: "公式サービスにログインし、以下の手順で確認してください。更新によりメニュー名が変わる場合があります。",
      recordTitle: "何を入力すればよいですか？",
      recordDescription: "公式画面に表示された総量、残量、使用率、リセット時刻だけを入力してください。作業ごとの使用量は、自分で観測した場合のみ別に入力します。",
      unknown: "数値が表示されない場合は推測せず、「正確な上限は不明」のままで構いません。",
      officialLink: "公式案内・サービスを開く（新しいタブ）",
      close: "閉じる",
      presets: {
        "chatgpt-like-variable": {
          title: "ChatGPT・Codex",
          steps: [
            "ChatGPTにログインし、現在利用中のプランを確認します。",
            "ChatGPTのモデル選択と上限案内を確認します。Codexでは /usage を使います。5時間上限と追加の週間上限が同時に適用される場合があるため、1つの数値にまとめません。",
          ],
        },
        "claude-subscription": {
          title: "Claude",
          steps: [
            "Claudeの Settings → Usage を開きます。会社アカウントでは、管理者がメンバー分析を許可した場合にのみ自分の使用量と上限を確認できます。",
            "5時間上限、全モデルの週間上限、モデル別の週間上限が同時に表示される場合があります。現在表示されているモデル名と割合だけを個別に記録します。",
          ],
        },
        "gemini-subscription": {
          title: "Geminiチャット",
          steps: [
            "個人アカウントはGeminiのSettingsとUsage limitsを確認します。会社・学校アカウントではWorkspace管理者によるライセンスと権限の確認が必要な場合があります。",
            "Gemini Appsの5時間・週間上限はチャット用です。チャットでコードを作成できますが、コーディングCLIはこのサブスクリプションに含まれません。Antigravityを別に確認します。",
          ],
        },
        "google-antigravity": {
          title: "Google Antigravity・CLI",
          steps: [
            "Antigravityの使用量設定で、現在のプランとモデルごとに表示される基本上限を確認します。",
            "Google AI Pro・Ultraでは5時間単位の基本上限と週間上限が併用される場合があります。1つにまとめず、表示内容をメモへ記録します。",
          ],
        },
        "gemini-code-assist": {
          title: "Gemini Code Assist Standard / Enterprise・CLI",
          steps: [
            "会社アカウントにGemini Code Assistライセンスが割り当てられているか、管理者またはGoogle Cloudプロジェクト担当者へ確認します。",
            "Standard・EnterpriseのIDE/CLI上限は1日あたりのリクエスト数です。Geminiチャット、Antigravity、Code Assist、APIは利用権限や上限がそれぞれ別です。",
          ],
        },
        "github-copilot-like-credits": {
          title: "GitHub Copilot",
          steps: [
            "GitHubの Settings → Billing & licensing を開き、Metered usageのCopilotまたはAI usageを確認します。",
            "使用済みのAI creditsを確認します。VS CodeではステータスバーのCopilotアイコンから上限の進捗とリセット日も確認できます。",
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
    observedUseLabel: "直接確認した1作業あたりの使用量",
    observedUseHelp: "1作業の使用量を少なめ・標準・多めに分け、直接確認した回数も入力します。入力値は参考情報として扱います。",
    consumptionBasisLabel: "使用量の基準",
    taskBasis: "作業1件あたり",
    iterationBasis: "分析反復1回あたり",
    lowLabel: "少なめ",
    expectedLabel: "標準",
    highLabel: "多め",
    sampleSizeLabel: "直接確認した回数",
    opaqueDescriptionLabel: "利用上限のメモ",
    resetKindLabel: "利用上限はいつリセットされますか？",
    nextResetLabel: "次回リセット時刻",
    cadenceDaysLabel: "リセット周期（日）",
    rollingHoursLabel: "使用後、リセットまで（時間）",
    rollingHoursHelp: "公式案内に、各利用が一定時間後に個別リセットされると書かれている場合だけ入力します。5時間上限と週間上限が両方ある場合は「正確には分からない」を選んでください。",
    conditionalNotice: "入力したサブスクリプション情報は参考用です。利用権限や上限を確認できない場合は確定した推奨に含めず、APIの予想費用は参考計画で別に表示します。",
    conditionalStatus: "参考情報",
    invalidStatus: "設定を完了してください",
    fieldError: "表示名、利用環境、料金を確認してください。詳細設定を選んだ場合は、その値もすべて入力してください。",
    fieldsToCheck: "次の項目を確認してください",
    technicalDetails: "その他の確認項目",
    relinkTitle: "保存されたサブスクリプションの種類を選び直してください。",
    relinkDescription: "保存時の種類が現在の一覧と一致しません。現在の種類を選ぶと、利用場所と上限情報を空にし、表示名・利用可否・料金は保持します。",
    relinkLabel: "現在のサブスクリプション種類",
    relinkPlaceholder: "種類を選択",
    presets: {
      "chatgpt-like-variable": { name: "ChatGPT・Codexサブスクリプション", description: "ChatGPTまたはプランに含まれるCodexを使う場合に選択します。5時間・週間上限が不明でも追加できます。" },
      "claude-subscription": { name: "Claudeサブスクリプション", description: "Claude、Claude Code、Coworkを使う個人または会社アカウントを記録します。" },
      "gemini-subscription": { name: "Geminiチャットサブスクリプション", description: "Gemini Appsのチャット用です。コーディング質問はできますが、コーディングCLIはこの契約に含まれません。" },
      "google-antigravity": { name: "Google Antigravityコーディングツール", description: "個人向けIDE・CLIコーディングツールを記録します。GeminiチャットやAPIとは上限が別の場合があります。" },
      "gemini-code-assist": { name: "Gemini Code Assist Standard / Enterprise", description: "組織から割り当てられたIDE・CLIコーディングツールを記録します。個人向けAntigravityやGemini APIとは別です。" },
      "github-copilot-like-credits": { name: "GitHub Copilotコーディングツール", description: "コードエディターやCLIで使うAIコーディングツールです。AIクレジットの残量が分からなくても追加できます。" },
      "custom-subscription": { name: "別のAIサブスクリプションを入力", description: "上記にないチャット／コーディングAIを記録します。管理対象アカウントでも組織APIの利用権限とはみなしません。" },
    },
  },
  overrides: {
    eyebrow: "詳細設定・任意",
    title: "API価格を直接入力する場合に開く",
    description: "公式の既定値とは異なる価格を試す場合のみ使用します。",
    sessionOnly: "入力した値は公式の既定値とは別に、このブラウザとエクスポートファイルへ保存されます。既定値へ戻すとユーザー値だけを削除します。",
    accessBoundary: "価格を変更しても、実際のアクセス権や機能対応が確認されるわけではありません。",
    providerLabel: "AI会社",
    catalogTierLabel: "モデル",
    planningTierLabel: "計画グレード",
    keepDefaultTier: "公式の既定グレードを維持",
    inputPriceLabel: "100万トークンあたりの入力料金（USD）",
    outputPriceLabel: "100万トークンあたりの出力料金（USD）",
    effectiveFromLabel: "適用開始日",
    officialDefault: "検証済み既定値",
    apply: "修正を適用",
    restore: "既定値に戻す",
    active: "適用中のユーザー設定",
    savedSources: "保存されたユーザー価格設定",
    userSupplied: "ユーザー入力",
    unresolvedSource: "対象を確認できない・未適用",
    futureSource: "将来日付の設定・未適用",
    removeUnresolved: "適用できない価格設定を削除",
    none: "保存されたユーザー価格設定なし",
    applied: "修正値を適用しました。",
    restored: "検証済み既定値に戻しました。",
    removed: "適用できない価格設定を削除しました。",
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
    referenceSummaryDescription: "公開API料金とトークン上限だけを使った参考費用です。必要な機能への対応や自分のアカウントで利用できるかは確認しておらず、上の合計と予算判定には含めません。",
    referenceProviderChoice: "プロバイダー別の参考コスト",
    referenceExpectedTotal: "標準利用時の参考合計",
    referenceIncludedTasks: (active, total) => `コスト計算に含む作業 ${active}/${total}件`,
    referenceTaskModel: "参考モデル",
    referenceTaskExpectedCost: "標準利用時の参考コスト",
    referenceHeldTask: "予算上、参考計算で保留",
    referenceInfeasibleTask: "モデルの入出力上限を超えるため参考コストを計算できません",
    referenceOpenDetails: "プロバイダー・モデル別の詳細計算を見る",
    budgetRequiredTitle: "最初に予算を確認してください。",
    budgetRequiredDescription: "金額に含む範囲を確認すると、分析を再実行せずに計画を計算します。",
    analysisRequiredTitle: "新しい方法で作業を分析してください。",
    analysisRequiredDescription: "以前の結果は保持されます。サンプルまたは実際の分析で新しい計画を作成できます。",
    calculationError: "作業計画を再計算できませんでした。入力値を確認してもう一度お試しください。",
    totalIncrementalCash: "新たに必要な総コスト",
    apiTaskPrice: "API予想費用（少なめ / 標準 / 多め）",
    subscriptionMarginalCash: "この作業に割り当てたサブスクリプション費用（少なめ / 標準 / 多め）",
    subscriptionMarginalCashNotice: "複数の作業が同じ新規サブスクリプションを使う場合に、全体料金からこの作業へ割り当てた分です。作業単体の実際の価格ではないため、計画全体の費用も確認してください。",
    apiSpend: "API支出",
    subscriptionUsage: "サブスクリプション使用量",
    newCommitment: "新規サブスクリプション料金",
    paidOverage: "従量超過料金",
    expectedBudgetStatus: "標準利用時の予算状態",
    withinBudget: "予算内",
    outsideBudget: "予算超過",
    highRisk: "多めに利用する場合は予算を超えます。",
    noHighRisk: "多めに利用する場合も予算内です。",
    budgetNotAssessed: "予算判定を保留",
    budgetNotAssessedDescription: "費用を確実に計算できる利用方法がないため、予算状態を判定していません。",
    excludedCostNoticeTitle: "表示コストの対象を確認してください",
    excludedCostNotice: (count, allTasks) =>
      allTasks
        ? `全${count}件の作業で利用方法を確定できなかったため、費用を合計から除外しました。US$0.00は、すべての作業を無料で実行できるという意味ではありません。`
        : `利用方法を確定できなかった作業${count}件の費用は、合計と予算判定から除外されています。`,
    avoidedSpend: "高性能APIだけを使う場合より節約できる見込み額",
    additionalSpend: "高性能APIだけを使う場合より増える費用",
    noPremiumBaseline: "比較できる高性能API計画がないため、節約額を表示しません。",
    activeHeldInfeasible: (active, held, infeasible) => `実行 ${active}・保留 ${held}・実行不可 ${infeasible}`,
    taskNumber: (index) => `作業 ${index}`,
    accessRoute: "推奨する利用方法",
    model: "接続モデル",
    unknownRouteLabel: "確認できない利用方法",
    noConfirmedRoute: "確定できる利用方法なし",
    whyEnough: "この利用方法を選んだ理由",
    premiumChoice: "高性能グレードの利用有無",
    upgradeTriggers: "上位グレードを選んだ理由",
    alternative: "別の利用方法",
    holdReason: "保留理由",
    infeasibleReason: "実行不可の理由",
    holdReasonValue: "確認済みの利用方法による標準利用時の費用が予算を超えています。",
    infeasibleReasonValue: "この作業条件を満たすと確認された利用方法がありません。",
    needsVerificationStatus: "追加確認が必要",
    requirementsUnmetStatus: "条件未達",
    apiSetupTitle: "実行前のAPI準備",
    apiSetupDescription: "この計画は公式のモデル/API情報を使って計算しています。実行前に、以下の各プロバイダーでアカウント、請求設定、APIキーを確認してください。",
    apiSetupPrivacy: "このアプリはAPIキーを要求・保存せず、個人アカウントで現在利用できるかどうかも検査しません。",
    apiSetupLink: (providerName) => `${providerName}の設定ガイドを開く`,
    infeasibleHelp: {
      open: "利用方法を確定できない理由は？",
      title: (taskName) => `${taskName}：利用方法を確定できない理由`,
      intro: "推奨を確定できなかった理由と、今できることを分けて案内します。",
      reviewedRoutes: (count) => `確認した利用方法：${count}件`,
      causesTitle: "今回の計算で確認できなかった項目",
      noCause: "詳細な除外理由を確認できませんでした。",
      resourceIssuesTitle: "この計画全体で未完了のサブスクリプション入力",
      resourceIssue: (resourceName, fields) => `${resourceName}：${fields}`,
      inputProblemTitle: "先に完了するサブスクリプション入力があります",
      inputProblemDescription: "この計画に未完了のサブスクリプションカードがあります。以下の必須項目を確認してください。",
      inputProblemCaveat: "必須入力を完了しても、アプリにモデル/APIの機能・上限情報がない利用方法は確定できません。",
      systemProblemTitle: "ユーザーが修正する入力はありません",
      systemProblemDescription: "アプリのモデル/API情報に、この作業の判定に必要な機能や上限がないか、現在の利用方法に関連付けられていません。入力欄を追加で埋めても解決しません。",
      systemProblemStatus: "現在は、下の参考計画で想定モデルとコストを確認できます。",
      accountStatusNotice: "この判定では、個人アカウントやAPIキーで現在利用できるかどうかは確認していません。",
      systemTaskConstraintNote: "一部の利用方法は、この作業の入出力上限、最低品質、または必須機能の条件も満たしていません。",
      taskProblemTitle: "現在の作業条件を満たす利用方法がありません",
      taskProblemDescription: "作業を分割できるか、成果物の範囲を狭められるかを確認してから再分析してください。変更しても推奨を確定できるとは限りません。",
      genericProblemTitle: "利用方法ごとの詳しい理由を確認してください",
      genericProblemDescription: "この画面で直接修正できる入力は見つかりませんでした。候補ごとの除外理由を確認できます。",
      goToResourceInput: "最初の必須入力へ移動",
      reviewTaskInput: "作業入力を確認",
      showRouteDetails: "利用方法ごとの詳しい理由を見る",
      viewReferencePlan: "検証前の参考計画を見る",
      nextStepsTitle: "確認・変更できる方法",
      guidance: {
        providerVerification: "このモデル/APIの機能や上限情報がアプリにないか、現在の利用方法に関連付けられていません。下の項目は価格と登録済み上限だけに基づく参考候補であり、個人アカウントやAPIキーで利用できるかは別途確認が必要です。",
        resourceSettings: "サブスクリプションカードで利用環境、保有状態、現在の利用可否、今回の請求期間の料金、上限を確認してください。ただし、ユーザー入力だけでは不足している公式根拠を置き換えられません。",
        workloadScope: "入力・出力・全体コンテキストの上限を超えた場合は、作業を小さく分割するか成果物の範囲を減らしてから再分析してください。",
        qualityRequirements: "分析された最低品質または必須機能を満たす利用方法がありません。作業の制約と成果物を明確にして再分析するか、機能が確認済みの別の利用方法が必要です。",
        pricingData: "現在の日付に適用できる価格表を確認できません。公式既定値を復元するか、適用日とユーザー修正値を確認してください。",
        technicalConfiguration: "保存されたサブスクリプション種類、モデル情報、またはアカウント接続が現在の設定と一致しません。選び直すか既定値に戻してください。",
        reviewDetails: "下の「推奨できなかった利用方法」を開くと、項目ごとの詳しい理由を確認できます。",
      },
      detailHint: "この画面を閉じた後、「推奨できなかった利用方法」を開くとモデルごとの詳しい理由を確認できます。",
      close: "閉じる",
    },
    conditionalAlternatives: "追加確認が必要なサブスクリプション候補",
    excludedRoutes: "推奨できなかった利用方法",
    unknownExclusionReason: "詳しい除外理由を確認できません",
    resourceDiagnostics: "サブスクリプション情報の確認結果",
    noSubscriptionUsage: "この計画に反映されたサブスクリプション使用量はありません。",
    tasksUsingRoute: (taskIds) => `割り当て作業：${taskIds}`,
    usageUnit: (unit) => `基本単位：${unit}`,
    usedRange: (low, expected, high) => `使用量 ${low} / ${expected} / ${high}`,
    remainingRange: (low, expected, high) => `残りの包含量 ${low} / ${expected} / ${high}`,
    overageRange: (low, expected, high) => `超過使用 ${low} / ${expected} / ${high}`,
    scenarioOverflow: "見積費用が大きすぎるため、画面に正確に表示できません。比較には元の値を使用しています。",
    generatedAt: (date) => `${date}時点・決められたルールで再計算`,
  },
  enums: {
    ...en.enums,
    ownership: { owned: "すでに利用中", "candidate-new": "新規契約を検討" },
    availability: { available: "はい、利用する", unavailable: "今回の計画から除外", uncertain: "確認が必要" },
    quotaKind: { metered: "正確な数値が分かる", calibrated: "残りの割合が分かる", "initial-capacity": "新規契約の開始上限", opaque: "正確には分からない（推奨）" },
    quotaUnit: { request: "リクエスト", credit: "クレジット", "percent-point": "パーセントポイント" },
    resetKind: { none: "自動リセットなし", fixed: "決まった時刻に全体をリセット", rolling: "利用した時点ごとに一定時間後リセット", unknown: "よく分からない（推奨）" },
    surface: { chat: "チャット", "ide-cli": "IDE / CLI", batch: "バッチ" },
    planningTier: { economy: "節約", balanced: "バランス", premium: "高性能" },
    routeKind: { "owned-within-included-quota": "利用中の契約に含まれる使用量", api: "API", "owned-paid-overage": "利用中の契約の有料超過分", "new-subscription": "新規サブスクリプション" },
    whyEnough: { "minimum-quality-met": "必要な最低品質を満たします。", "higher-tier-saved-cash": "1段階上のグレードの方が追加費用を抑えます。", "quality-headroom-triggered": "決められた条件により1段階上のグレードを選びました。", "minimum-quality-requires-premium": "下位グレードが作業条件を満たさないため、高性能グレードが必要です。" },
    whyNotPremium: { "premium-selected": "使用・最低品質または適用条件により高性能グレードが必要です。", "premium-not-triggered": "未使用・高性能グレードが必要となる条件はありません。", "lower-tier-sufficient": "未使用・下位グレードで作業条件を満たします。", "no-compatible-premium-api": "比較不可・作業条件を満たす高性能API計画がありません。" },
    upgradeTrigger: { "minimum-quality-requires-premium": "条件を満たす下位グレードなし", "high-failure-exposure": "失敗した場合の影響が大きい", "deadline-retry-risk": "期限前にやり直す余裕が少ない", "deep-reasoning": "複数段階の検討が必要", "large-code-change": "変更するコードの範囲が大きい" },
    exclusionReason: {
      "catalog-reference-unresolved": "アプリで該当モデルの情報を見つけられない", "catalog-version-mismatch": "保存されたモデル情報が現在のバージョンと一致しない", "catalog-claim-mismatch": "保存されたモデル情報が現在の公式情報と異なる", "preset-reference-unresolved": "保存されたサブスクリプション種類を見つけられない", "preset-version-mismatch": "保存されたサブスクリプション種類が現在のバージョンと一致しない", "connector-unverified": "アカウント接続を確認できない", "connector-binding-mismatch": "接続されたアカウント情報が一致しない", "connector-snapshot-stale": "保存された使用量情報が古い", "connector-snapshot-replayed": "同じ使用量情報が再び送られた", "connector-receipt-invalid": "アカウント接続の確認情報が正しくない", "evidence-authority-invalid": "公式の確認資料がない", "profile-unverified": "この作業に合う機能か確認できない", "model-limits-incomplete": "モデルの上限情報が不足", "access-limits-incomplete": "この利用方法の上限情報が不足", "model-capabilities-incomplete": "モデルの機能情報が不足", "access-capabilities-incomplete": "この利用方法の機能情報が不足", "availability-uncertain": "現在利用できるか不明", "consumption-user-observed": "使用量はユーザーが入力した値", "quota-calibrated": "上限はユーザーが確認して入力した値", "quota-opaque": "正確な上限が公開されていない", "quota-insufficient-observed": "入力した残り上限が不足", "initial-capacity-unpublished": "新規契約の開始上限が公開されていない",
      "model-reference-missing": "接続するモデル情報がない",
      "surface-incompatible": "チャットやIDE・CLIなど必要な利用環境に対応していない",
      "below-minimum-quality": "必要な品質基準より低い",
      "required-capability-missing": "作業に必要な機能に対応していない",
      "input-limit-exceeded": UI_COPY.ja.enums.invocationFailure["input-limit-exceeded"],
      "output-limit-exceeded": UI_COPY.ja.enums.invocationFailure["output-limit-exceeded"],
      "context-limit-exceeded": UI_COPY.ja.enums.invocationFailure["context-limit-exceeded"],
      "price-schedule-not-applicable": "現在の日付に適用できる料金がない",
      "standard-price-input-limit-exceeded": "標準料金が適用される入力の長さを超えている",
      "catalog-entry-not-found": "該当モデルの情報が見つからない",
      "invalid-pricing-as-of": "価格基準日が無効",
      "catalog-price-schedule-invalid": "保存された料金情報が正しくない",
      "catalog-invocation-limits-unresolved": "1回あたりの入出力上限を確認できない",
      "invalid-token-scenarios": "予想使用量を計算できない",
      "invalid-user-override": "直接変更した料金が正しくない",
      "override-target-unresolved": "価格修正対象を確認できない",
      "override-target-mismatch": "変更した料金と選択したモデルが一致しない",
      "invocation-limit-exceeded": "1回で処理できるトークン数を超えている",
      "resource-unavailable": "今回の計画では利用できないサブスクリプション",
      "api-route-not-confirmed": "このAPIを利用できるか確認されていない",
    },
  },
};

export const BEST_FIT_UI_COPY: Readonly<Record<UiLocale, BestFitUiCopy>> =
  Object.freeze({ ko, en, ja });

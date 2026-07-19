import {
  createBestFitPlanExportDocument,
  type BestFitExportRouteKey,
  type BestFitPlanExportContext,
  type BestFitPlanExportDocument,
} from "@/lib/export/best-fit";
import { escapeMarkdownText } from "@/lib/export/markdown-escape";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import type { UiLocale } from "@/lib/i18n/ui-copy";

interface BestFitMarkdownCopy {
  title: string;
  tagline: string;
  exportInformation: string;
  exportedAt: string;
  analyzedAt: string;
  analysisMode: string;
  analysisModel: string;
  calculation: string;
  strategy: string;
  planningAsOf: string;
  pricingAsOf: string;
  budget: string;
  allocationMethod: string;
  cash: string;
  total: string;
  apiCash: string;
  subscriptionFee: string;
  paidOverage: string;
  scenarioOverflow: string;
  low: string;
  expected: string;
  high: string;
  tasks: string;
  description: string;
  priority: string;
  deadline: string;
  failureImpact: string;
  status: string;
  route: string;
  routeKey: string;
  routeKind: string;
  model: string;
  confidence: string;
  quality: string;
  targetQuality: string;
  apiTaskPrice: string;
  subscriptionMarginalCash: string;
  subscriptionMarginalCashNotice: string;
  whyEnough: string;
  premiumChoice: string;
  upgradeTriggers: string;
  alternative: string;
  conditionalAlternatives: string;
  fallback: string;
  reasons: string;
  holdReason: string;
  infeasibleReason: string;
  activatedSubscriptions: string;
  subscriptionUsage: string;
  ownership: string;
  quotaUnit: string;
  availableCapacity: string;
  taskIds: string;
  premiumBaseline: string;
  spendComparison: string;
  baseline: string;
  selected: string;
  signedDifference: string;
  avoidedSpend: string;
  additionalSpend: string;
  sourceState: string;
  sourceNotice: string;
  audit: string;
  auditNotice: string;
  resourceResolutions: string;
  candidateResolutions: string;
  confirmedRoutes: string;
  excludedRoutes: string;
  officialApiSources: string;
  resolvedResource: string;
  officialPrice: string;
  none: string;
  statuses: Record<"active" | "held" | "infeasible", string>;
}

const COPY: Record<UiLocale, BestFitMarkdownCopy> = {
  ko: {
    title: "Frontier Workload Planner — 맞춤 이용 계획",
    tagline: "> 입력값과 공개 가격을 기준으로 만든 계획입니다. 아래 계산 상세는 검토용이며 복원 입력으로 사용하지 않습니다.",
    exportInformation: "내보내기 정보",
    exportedAt: "내보낸 시각",
    analyzedAt: "분석 시각",
    analysisMode: "분석 모드",
    analysisModel: "분석 모델",
    calculation: "계산 기준",
    strategy: "전략",
    planningAsOf: "계획 기준 시각",
    pricingAsOf: "가격 기준일",
    budget: "추가로 쓸 수 있는 예산",
    allocationMethod: "작업 배정 규칙",
    cash: "새로 필요한 비용",
    total: "합계",
    apiCash: "API 현금",
    subscriptionFee: "새 구독료",
    paidOverage: "유료 초과 사용",
    scenarioOverflow: "너무 커 정확히 표시하지 못한 예상값",
    low: "적게 사용",
    expected: "보통 사용",
    high: "많이 사용",
    tasks: "작업별 이용 방법",
    description: "작업 설명",
    priority: "우선순위",
    deadline: "작업 기한",
    failureImpact: "실패 영향",
    status: "상태",
    route: "이용 방법 ID",
    routeKey: "내부 이용 방법 키",
    routeKind: "이용 방법 종류",
    model: "모델",
    confidence: "신뢰 상태",
    quality: "품질",
    targetQuality: "전략 목표 품질",
    apiTaskPrice: "API 작업 가격",
    subscriptionMarginalCash: "이 작업에 배분된 구독 비용",
    subscriptionMarginalCashNotice: "> 여러 작업이 같은 새 구독을 사용할 때 전체 구독료 중 이 작업에 나눈 몫입니다. 작업 하나의 실제 가격은 아니므로 계획 전체 비용도 확인하세요.",
    whyEnough: "이 이용 방법을 고른 이유",
    premiumChoice: "고성능 등급 사용 여부",
    upgradeTriggers: "상위 등급을 선택한 이유",
    alternative: "다른 이용 방법",
    conditionalAlternatives: "추가 확인이 필요한 방법",
    fallback: "대체 방법",
    reasons: "확인 결과",
    holdReason: "보류 사유",
    infeasibleReason: "실행 불가 사유",
    activatedSubscriptions: "계획에 사용한 구독",
    subscriptionUsage: "구독 사용량 계산",
    ownership: "소유 상태",
    quotaUnit: "사용량 단위",
    availableCapacity: "가용 용량",
    taskIds: "작업 ID",
    premiumBaseline: "모든 작업에 고성능 API를 쓸 때",
    spendComparison: "비용 비교",
    baseline: "고성능 API만 사용",
    selected: "선택 계획",
    signedDifference: "비용 차이",
    avoidedSpend: "절감 예상액",
    additionalSpend: "추가 지출",
    sourceState: "복원용 입력값",
    sourceNotice: "이 절만 복원 입력으로 사용합니다. 공식 정보와 계산 결과는 복원할 때 현재 기준으로 다시 확인합니다.",
    audit: "검토용 계산 상세",
    auditNotice: "아래 값은 검토용입니다(`importAuthority: false`). 복원할 때는 위 입력값으로 다시 계산합니다.",
    resourceResolutions: "구독 확인 결과",
    candidateResolutions: "작업별 후보 확인 결과",
    confirmedRoutes: "추천에 포함한 후보",
    excludedRoutes: "추천에서 제외한 후보",
    officialApiSources: "공식 API 정보 확인 내역",
    resolvedResource: "계산에 사용한 구독 정보",
    officialPrice: "계산에 사용한 공식 표준 텍스트 가격",
    none: "없음",
    statuses: { active: "실행", held: "보류", infeasible: "실행 불가" },
  },
  en: {
    title: "Frontier Workload Planner — tailored usage plan",
    tagline: "> A plan based on your inputs and published prices. The calculation details below are for review and are not restore inputs.",
    exportInformation: "Export information",
    exportedAt: "Exported at",
    analyzedAt: "Analyzed at",
    analysisMode: "Analysis mode",
    analysisModel: "Analysis model",
    calculation: "Calculation basis",
    strategy: "Strategy",
    planningAsOf: "Planning as of",
    pricingAsOf: "Pricing as of",
    budget: "Additional budget available",
    allocationMethod: "Task assignment rule",
    cash: "New cost",
    total: "Total",
    apiCash: "API cost",
    subscriptionFee: "New subscription fee",
    paidOverage: "Extra charges after limits",
    scenarioOverflow: "Estimates too large to display exactly",
    low: "Lower use",
    expected: "Likely use",
    high: "Higher use",
    tasks: "Usage method by task",
    description: "Task description",
    priority: "Priority",
    deadline: "Task deadline",
    failureImpact: "Failure impact",
    status: "Status",
    route: "Usage method ID",
    routeKey: "Internal usage method key",
    routeKind: "Usage method type",
    model: "Model",
    confidence: "Confidence",
    quality: "Quality",
    targetQuality: "Strategy target quality",
    apiTaskPrice: "API task price",
    subscriptionMarginalCash: "Subscription cost assigned to this task",
    subscriptionMarginalCashNotice: "> When tasks share a new subscription, this is the portion assigned to this task. It is not the task's standalone price; review the full plan cost too.",
    whyEnough: "Why this method was chosen",
    premiumChoice: "Use of the high-performance tier",
    upgradeTriggers: "Why a higher tier was selected",
    alternative: "Another usage method",
    conditionalAlternatives: "Methods needing more confirmation",
    fallback: "Backup method",
    reasons: "Check results",
    holdReason: "Hold reason",
    infeasibleReason: "Infeasible reason",
    activatedSubscriptions: "Subscriptions used in the plan",
    subscriptionUsage: "Subscription usage calculation",
    ownership: "Ownership",
    quotaUnit: "Usage unit",
    availableCapacity: "Available capacity",
    taskIds: "Task IDs",
    premiumBaseline: "Using high-performance APIs for every task",
    spendComparison: "Cost comparison",
    baseline: "High-performance APIs only",
    selected: "Selected plan",
    signedDifference: "Cost difference",
    avoidedSpend: "Estimated savings",
    additionalSpend: "Additional spend",
    sourceState: "Inputs used for restore",
    sourceNotice: "Only this section is used as restore input. Official information and calculated results are checked again against the current version.",
    audit: "Calculation details for review",
    auditNotice: "The values below are for review (`importAuthority: false`). Restoring the plan recalculates from the inputs above.",
    resourceResolutions: "Subscription check results",
    candidateResolutions: "Candidate checks by task",
    confirmedRoutes: "Candidates included in the recommendation",
    excludedRoutes: "Candidates excluded from the recommendation",
    officialApiSources: "Official API information checked",
    resolvedResource: "Subscription information used in the calculation",
    officialPrice: "Official standard text price used in the calculation",
    none: "None",
    statuses: { active: "Active", held: "Held", infeasible: "Infeasible" },
  },
  ja: {
    title: "Frontier Workload Planner — 作業別の利用計画",
    tagline: "> 入力値と公開料金を基に作成した計画です。以下の計算詳細は確認用で、復元入力には使いません。",
    exportInformation: "エクスポート情報",
    exportedAt: "エクスポート日時",
    analyzedAt: "分析日時",
    analysisMode: "分析モード",
    analysisModel: "分析モデル",
    calculation: "計算基準",
    strategy: "戦略",
    planningAsOf: "計画基準日時",
    pricingAsOf: "価格基準日",
    budget: "追加で使える予算",
    allocationMethod: "作業の割り当てルール",
    cash: "新たに必要な費用",
    total: "合計",
    apiCash: "API費用",
    subscriptionFee: "新規サブスクリプション料金",
    paidOverage: "上限超過後の追加料金",
    scenarioOverflow: "大きすぎて正確に表示できない見積値",
    low: "少なめ",
    expected: "標準",
    high: "多め",
    tasks: "作業別の利用方法",
    description: "タスク説明",
    priority: "優先度",
    deadline: "タスク期限",
    failureImpact: "失敗影響",
    status: "状態",
    route: "利用方法ID",
    routeKey: "内部の利用方法キー",
    routeKind: "利用方法の種類",
    model: "モデル",
    confidence: "信頼状態",
    quality: "品質",
    targetQuality: "戦略目標品質",
    apiTaskPrice: "API作業価格",
    subscriptionMarginalCash: "この作業に割り当てたサブスクリプション費用",
    subscriptionMarginalCashNotice: "> 複数の作業が同じ新規サブスクリプションを使う場合に、この作業へ配分した分です。作業単体の価格ではないため、計画全体の費用も確認してください。",
    whyEnough: "この利用方法を選んだ理由",
    premiumChoice: "高性能グレードの利用有無",
    upgradeTriggers: "上位グレードを選んだ理由",
    alternative: "別の利用方法",
    conditionalAlternatives: "追加確認が必要な方法",
    fallback: "代替方法",
    reasons: "確認結果",
    holdReason: "保留理由",
    infeasibleReason: "実行不可理由",
    activatedSubscriptions: "計画で使用したサブスクリプション",
    subscriptionUsage: "サブスクリプション使用量の計算",
    ownership: "所有状態",
    quotaUnit: "使用量の単位",
    availableCapacity: "利用可能容量",
    taskIds: "タスクID",
    premiumBaseline: "すべての作業で高性能APIを使う場合",
    spendComparison: "費用比較",
    baseline: "高性能APIのみを使用",
    selected: "選択計画",
    signedDifference: "費用差",
    avoidedSpend: "節約見込額",
    additionalSpend: "追加支出",
    sourceState: "復元に使う入力値",
    sourceNotice: "この節だけを復元入力として使います。公式情報と計算結果は、復元時に現在の基準で再確認します。",
    audit: "確認用の計算詳細",
    auditNotice: "以下は確認用です（`importAuthority: false`）。復元時は上の入力値から再計算します。",
    resourceResolutions: "サブスクリプション確認結果",
    candidateResolutions: "作業別の候補確認結果",
    confirmedRoutes: "推奨に含めた候補",
    excludedRoutes: "推奨から除外した候補",
    officialApiSources: "確認した公式API情報",
    resolvedResource: "計算に使用したサブスクリプション情報",
    officialPrice: "計算に使用した公式の標準テキスト料金",
    none: "なし",
    statuses: { active: "実行", held: "保留", infeasible: "実行不可" },
  },
};

function code(value: string): string {
  return `\`${value.replace(/`/g, "\\`")}\``;
}

function formatMicroUsd(value: number): string {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const dollars = (absolute / 1_000_000)
    .toFixed(6)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
  return `${sign}$${dollars} USD (${code(String(value))} microUSD)`;
}

function formatSignedMicroUsd(value: number): string {
  return `${value > 0 ? "+" : ""}${formatMicroUsd(value)}`;
}

function routeLines(
  lines: string[],
  copy: BestFitMarkdownCopy,
  identity: { providerId: string; offeringId: string; resourceId: string | null },
  key: BestFitExportRouteKey,
  prefix = "- ",
): void {
  lines.push(
    `${prefix}${copy.route}: ${code(
      [identity.providerId, identity.offeringId, identity.resourceId ?? "null"].join(" / "),
    )}`,
    `${prefix}${copy.routeKey}: ${code(JSON.stringify(key))}`,
  );
}

function appendIndentedJson(lines: string[], value: unknown): void {
  lines.push(
    ...JSON.stringify(value, null, 2)
      .split("\n")
      .map((line) => `    ${line}`),
  );
}

function appendScenarioCash(
  lines: string[],
  copy: BestFitMarkdownCopy,
  label: string,
  values: { low: number; expected: number; high: number },
): void {
  lines.push(
    `- ${label}: ${copy.low} ${formatMicroUsd(values.low)} · ${copy.expected} ${formatMicroUsd(values.expected)} · ${copy.high} ${formatMicroUsd(values.high)}`,
  );
}

export function createBestFitPlanMarkdownFromDocument(
  document: BestFitPlanExportDocument,
  locale: UiLocale = "ko",
): string {
  const copy = COPY[locale];
  const uiCopy = BEST_FIT_UI_COPY[locale];
  const lines: string[] = [
    `# ${copy.title}`,
    "",
    copy.tagline,
    "",
    `## ${copy.exportInformation}`,
    "",
    `- ${copy.exportedAt}: ${code(document.exportedAt)}`,
    `- ${copy.analyzedAt}: ${code(document.analysis.generatedAt)}`,
    `- ${copy.analysisMode}: ${code(document.analysis.mode)}`,
    `- ${copy.analysisModel}: ${code(document.analysis.model)}`,
    `- Schema: ${code(String(document.schemaVersion))} / ${code(document.resultKind)}`,
    "",
    `## ${copy.calculation}`,
    "",
    `- ${copy.strategy}: ${code(document.calculation.strategy)}`,
    `- ${copy.planningAsOf}: ${code(document.calculation.planningAsOf)}`,
    `- ${copy.pricingAsOf}: ${code(document.calculation.pricingAsOf)}`,
    `- ${copy.budget}: ${formatMicroUsd(document.input.incrementalCashBudgetMicroUsd)}`,
    `- ${copy.allocationMethod}: ${code(document.calculation.allocationMethod)}`,
    "",
    `## ${copy.cash}`,
    "",
  ];

  appendScenarioCash(lines, copy, copy.total, {
    low: document.result.cash.lowMicroUsd,
    expected: document.result.cash.expectedMicroUsd,
    high: document.result.cash.highMicroUsd,
  });
  appendScenarioCash(lines, copy, copy.apiCash, document.result.cash.apiMicroUsd);
  lines.push(
    `- ${copy.subscriptionFee}: ${formatMicroUsd(document.result.cash.subscriptionFeeMicroUsd)}`,
  );
  appendScenarioCash(
    lines,
    copy,
    copy.paidOverage,
    document.result.cash.paidOverageMicroUsd,
  );
  const overflowScenarios = (["low", "expected", "high"] as const).filter(
    (scenario) => document.result.cash.scenarioOverflow[scenario],
  );
  lines.push(
    `- ${copy.scenarioOverflow}: ${
      overflowScenarios.length === 0
        ? copy.none
        : overflowScenarios.map(code).join(", ")
    }`,
  );

  lines.push("", `## ${copy.tasks}`, "");
  document.result.tasks.forEach((task, index) => {
    const sourceTask = document.input.tasks[task.originalIndex];
    lines.push(
      `### ${index + 1}. ${escapeMarkdownText(sourceTask?.name ?? task.taskId)} (${code(task.taskId)})`,
      "",
      `- ${copy.description}: ${escapeMarkdownText(sourceTask?.description ?? copy.none)}`,
      `- ${copy.priority}: ${sourceTask === undefined ? copy.none : code(sourceTask.priority)}`,
      `- ${copy.deadline}: ${sourceTask?.deadlineDate === null || sourceTask === undefined ? copy.none : code(sourceTask.deadlineDate)}`,
      `- ${copy.failureImpact}: ${sourceTask === undefined ? copy.none : code(sourceTask.failureImpact)}`,
      `- ${copy.status}: ${copy.statuses[task.status]} (${code(task.status)})`,
      `- ${copy.targetQuality}: ${code(task.strategyTargetTier)}`,
    );
    if (task.routeIdentity !== null && task.routeKey !== null) {
      routeLines(lines, copy, task.routeIdentity, task.routeKey);
      lines.push(
        `- ${copy.confidence}: ${code(task.confidence ?? "unknown")}`,
        `- ${copy.routeKind}: ${code(task.routeKind ?? "unknown")}`,
        `- ${copy.model}: ${task.modelId === null ? "—" : code(task.modelId)}`,
        `- ${copy.quality}: ${code(task.qualityTier ?? "unknown")}`,
      );
      if (task.variableCashMicroUsd !== null) {
        appendScenarioCash(
          lines,
          copy,
          task.routeKind === "api"
            ? copy.apiTaskPrice
            : copy.subscriptionMarginalCash,
          task.variableCashMicroUsd,
        );
        if (task.routeKind !== "api") {
          lines.push("", copy.subscriptionMarginalCashNotice, "");
        }
      }
      lines.push(
        `- ${copy.whyEnough}: ${
          task.whyEnough === null
            ? copy.none
            : escapeMarkdownText(uiCopy.enums.whyEnough[task.whyEnough])
        }`,
        `- ${copy.premiumChoice}: ${
          task.whyNotPremium === null
            ? copy.none
            : escapeMarkdownText(uiCopy.enums.whyNotPremium[task.whyNotPremium])
        }`,
      );
      if (
        task.alternativeRouteIdentity !== null &&
        task.alternativeRouteKey !== null
      ) {
        lines.push(`- ${copy.alternative}:`);
        routeLines(
          lines,
          copy,
          task.alternativeRouteIdentity,
          task.alternativeRouteKey,
          "  - ",
        );
      }
    } else if (task.holdReason !== null) {
      lines.push(`- ${copy.holdReason}: ${code(task.holdReason)}`);
    } else if (task.infeasibleReason !== null) {
      lines.push(`- ${copy.infeasibleReason}: ${code(task.infeasibleReason)}`);
    }

    lines.push(
      `- ${copy.upgradeTriggers}: ${
        task.appliedUpgradeTriggers.length === 0
          ? copy.none
          : task.appliedUpgradeTriggers
              .map((trigger) =>
                escapeMarkdownText(uiCopy.enums.upgradeTrigger[trigger]),
              )
              .join(" · ")
      }`,
    );

    if (task.conditionalAlternatives.length > 0) {
      lines.push(`- ${copy.conditionalAlternatives}:`);
      task.conditionalAlternatives.forEach((alternative) => {
        lines.push(
          `  - ${copy.routeKey}: ${code(JSON.stringify(alternative.routeKey))}`,
          `    - ${copy.fallback}: ${code(JSON.stringify(alternative.fallbackRouteKey))}`,
          `    - ${copy.reasons}: ${alternative.reasonCodes.map(code).join(" → ")}`,
        );
      });
    }
    lines.push("");
  });

  lines.push(`## ${copy.activatedSubscriptions}`, "");
  if (document.result.activatedSubscriptionRoutes.length === 0) {
    lines.push(copy.none);
  } else {
    document.result.activatedSubscriptionRoutes.forEach((route) =>
      routeLines(lines, copy, route.routeIdentity, route.routeKey),
    );
  }

  lines.push("", `## ${copy.subscriptionUsage}`, "");
  if (document.result.subscriptionUsageLedgers.length === 0) {
    lines.push(copy.none);
  } else {
    document.result.subscriptionUsageLedgers.forEach((ledger, index) => {
      lines.push(`### ${index + 1}. ${code(JSON.stringify(ledger.routeKey))}`, "");
      routeLines(lines, copy, ledger.routeIdentity, ledger.routeKey);
      lines.push(
        `- ${copy.ownership}: ${code(ledger.ownership)}`,
        `- ${copy.quotaUnit}: ${code(ledger.quotaUnit)}`,
        `- ${copy.availableCapacity}: ${code(String(ledger.availableMicrounits))} microunits`,
        `- ${copy.taskIds}: ${ledger.taskIds.map(code).join(", ")}`,
      );
      appendIndentedJson(lines, ledger.scenarios);
      lines.push("");
    });
  }

  lines.push("", `## ${copy.premiumBaseline}`, "");
  if (document.result.premiumBaseline === null) {
    lines.push(copy.none);
  } else {
    document.result.premiumBaseline.forEach((task) => {
      lines.push(
        `- ${code(task.taskId)} · ${code(JSON.stringify(task.routeKey))} · ${formatMicroUsd(task.expectedCashMicroUsd)}`,
      );
    });
  }
  lines.push("", `### ${copy.spendComparison}`, "");
  const spend = document.result.spendComparison;
  if (spend === null) {
    lines.push(copy.none);
  } else {
    lines.push(
      `- ${copy.baseline}: ${formatMicroUsd(spend.premiumBaselineExpectedMicroUsd)}`,
      `- ${copy.selected}: ${formatMicroUsd(spend.selectedExpectedIncrementalCashMicroUsd)}`,
      `- ${copy.signedDifference}: ${formatSignedMicroUsd(spend.differenceMicroUsd)}`,
      `- ${copy.avoidedSpend}: ${formatMicroUsd(spend.avoidedSpendMicroUsd)}`,
      `- ${copy.additionalSpend}: ${formatMicroUsd(spend.additionalSpendMicroUsd)}`,
    );
  }

  lines.push(
    "",
    `## ${copy.sourceState}`,
    "",
    copy.sourceNotice,
    "",
  );
  appendIndentedJson(lines, document.input.sourceState);

  lines.push("", `## ${copy.audit}`, "", copy.auditNotice, "");
  lines.push(`### ${copy.resourceResolutions}`, "");
  if (document.audit.resourceResolutions.length === 0) {
    lines.push(copy.none);
  } else {
    document.audit.resourceResolutions.forEach((resource, index) => {
      lines.push(
        `#### ${index + 1}. ${escapeMarkdownText(resource.displayName)} (${code(resource.uiId)})`,
        "",
        `- ${copy.status}: ${code(resource.status)}`,
      );
      if (
        "routeKey" in resource &&
        resource.routeKey !== null &&
        resource.routeIdentity !== null
      ) {
        routeLines(lines, copy, resource.routeIdentity, resource.routeKey);
      }
      if (resource.reasonCodes.length > 0) {
        lines.push(`- ${copy.reasons}: ${resource.reasonCodes.map(code).join(" → ")}`);
      }
      if (resource.resolvedResource !== null) {
        lines.push(`- ${copy.resolvedResource}:`);
        appendIndentedJson(lines, resource.resolvedResource);
      }
      lines.push("");
    });
  }

  lines.push(`### ${copy.candidateResolutions}`, "");
  document.audit.taskCandidateResolutions.forEach((candidateSet) => {
    lines.push(`#### ${code(candidateSet.taskId)}`, "");
    lines.push(`- ${copy.confirmedRoutes}:`);
    if (candidateSet.confirmedRoutes.length === 0) {
      lines.push(`  - ${copy.none}`);
    } else {
      candidateSet.confirmedRoutes.forEach((route) => {
        lines.push(`  - ${code(JSON.stringify(route.routeKey))} · ${code(route.confidence)}`);
      });
    }
    lines.push(`- ${copy.excludedRoutes}:`);
    if (candidateSet.excludedRoutes.length === 0) {
      lines.push(`  - ${copy.none}`);
    } else {
      candidateSet.excludedRoutes.forEach((route) => {
        lines.push(
          `  - ${code(JSON.stringify(route.routeKey))} · ${code(route.status)} · ${route.reasonCodes.map(code).join(" → ")}`,
        );
      });
    }
    lines.push(`- ${copy.conditionalAlternatives}:`);
    if (candidateSet.conditionalAlternatives.length === 0) {
      lines.push(`  - ${copy.none}`);
    } else {
      candidateSet.conditionalAlternatives.forEach((alternative) => {
        lines.push(
          `  - ${copy.routeKey}: ${code(JSON.stringify(alternative.routeKey))}`,
          `    - ${copy.fallback}: ${code(JSON.stringify(alternative.fallbackRouteKey))}`,
          `    - ${copy.reasons}: ${alternative.reasonCodes.map(code).join(" → ")}`,
        );
      });
    }
    lines.push("");
  });

  lines.push(`### ${copy.officialApiSources}`, "");
  document.audit.apiCatalogResolutions.forEach((entry) => {
    lines.push(
      `#### ${code(JSON.stringify(entry.routeKey))}`,
      "",
      `- ${entry.providerDisplayName} · ${entry.productFamily} · ${code(entry.planningTier)}`,
      `- ${entry.pricingSource}`,
      `- ${entry.modelsSource}`,
      `- ${copy.officialPrice}:`,
    );
    appendIndentedJson(lines, entry.officialStandardTextPrice);
    lines.push("");
  });

  return `${lines.join("\n").trimEnd()}\n`;
}

export function createBestFitPlanMarkdown(
  context: BestFitPlanExportContext,
  locale: UiLocale = "ko",
  exportedAt = new Date().toISOString(),
): string {
  return createBestFitPlanMarkdownFromDocument(
    createBestFitPlanExportDocument(context, exportedAt),
    locale,
  );
}

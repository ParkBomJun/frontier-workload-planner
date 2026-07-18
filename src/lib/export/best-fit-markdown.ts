import {
  createBestFitPlanExportDocument,
  type BestFitExportRouteKey,
  type BestFitPlanExportContext,
  type BestFitPlanExportDocument,
} from "@/lib/export/best-fit";
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
    title: "Frontier Workload Planner — Best-fit 경로 계획",
    tagline: "> 결정적 Best-fit 경로 계획입니다. 파생 결과와 해결된 증거는 가져오기 권한이 아닙니다.",
    exportInformation: "내보내기 정보",
    exportedAt: "내보낸 시각",
    analyzedAt: "분석 시각",
    analysisMode: "분석 모드",
    analysisModel: "분석 모델",
    calculation: "계산 기준",
    strategy: "전략",
    planningAsOf: "계획 기준 시각",
    pricingAsOf: "가격 기준일",
    budget: "증분 현금 예산",
    allocationMethod: "배분 방식",
    cash: "증분 현금",
    total: "합계",
    apiCash: "API 현금",
    subscriptionFee: "새 구독 약정",
    paidOverage: "유료 초과 사용",
    scenarioOverflow: "표시 범위 포화 시나리오",
    low: "Low",
    expected: "Expected",
    high: "High",
    tasks: "작업별 경로",
    description: "작업 설명",
    priority: "우선순위",
    deadline: "작업 기한",
    failureImpact: "실패 영향",
    status: "상태",
    route: "경로 identity",
    routeKey: "정규 경로 키",
    routeKind: "경로 종류",
    model: "모델",
    confidence: "신뢰 상태",
    quality: "품질",
    targetQuality: "전략 목표 품질",
    apiTaskPrice: "API 작업 가격",
    subscriptionMarginalCash: "구독 한계 현금 귀속액",
    subscriptionMarginalCashNotice: "> 이 값은 결정론적 예약 순서에서 이 작업에 귀속된 한계 금액입니다. 독립적인 작업 가격이 아니며 계획 총계가 권위값입니다.",
    whyEnough: "충분한 이유",
    premiumChoice: "Premium 선택",
    upgradeTriggers: "상향 조건",
    alternative: "대안 경로",
    conditionalAlternatives: "조건부 대안",
    fallback: "Fallback",
    reasons: "조건 코드",
    holdReason: "보류 사유",
    infeasibleReason: "실행 불가 사유",
    activatedSubscriptions: "활성화된 구독 경로",
    subscriptionUsage: "구독 사용량 ledger",
    ownership: "소유 상태",
    quotaUnit: "쿼터 단위",
    availableCapacity: "가용 용량",
    taskIds: "작업 ID",
    premiumBaseline: "Premium API 기준선",
    spendComparison: "지출 비교",
    baseline: "Premium 기준선",
    selected: "선택 계획",
    signedDifference: "부호 있는 차이",
    avoidedSpend: "회피 지출",
    additionalSpend: "추가 지출",
    sourceState: "복원 가능한 원본 source state",
    sourceNotice: "이 절만 source 입력입니다. 공식/해결 증거는 포함하지 않습니다.",
    audit: "감사 전용 해결 결과",
    auditNotice: "아래 값은 audit-only이며 `importAuthority: false`입니다. 가져올 때 원본 source state로 다시 해결해야 합니다.",
    resourceResolutions: "리소스 해결",
    candidateResolutions: "작업 후보 해결",
    confirmedRoutes: "확인된 후보",
    excludedRoutes: "제외된 후보",
    officialApiSources: "공식 API 카탈로그 감사",
    resolvedResource: "해결된 리소스 snapshot",
    officialPrice: "공식 표준 텍스트 가격 snapshot",
    none: "없음",
    statuses: { active: "실행", held: "보류", infeasible: "실행 불가" },
  },
  en: {
    title: "Frontier Workload Planner — Best-fit route plan",
    tagline: "> A deterministic Best-fit route plan. Derived results and resolved evidence are not import authority.",
    exportInformation: "Export information",
    exportedAt: "Exported at",
    analyzedAt: "Analyzed at",
    analysisMode: "Analysis mode",
    analysisModel: "Analysis model",
    calculation: "Calculation basis",
    strategy: "Strategy",
    planningAsOf: "Planning as of",
    pricingAsOf: "Pricing as of",
    budget: "Incremental-cash budget",
    allocationMethod: "Allocation method",
    cash: "Incremental cash",
    total: "Total",
    apiCash: "API cash",
    subscriptionFee: "New subscription commitment",
    paidOverage: "Paid overage",
    scenarioOverflow: "Display-saturated scenarios",
    low: "Low",
    expected: "Expected",
    high: "High",
    tasks: "Task routes",
    description: "Task description",
    priority: "Priority",
    deadline: "Task deadline",
    failureImpact: "Failure impact",
    status: "Status",
    route: "Route identity",
    routeKey: "Canonical route key",
    routeKind: "Route kind",
    model: "Model",
    confidence: "Confidence",
    quality: "Quality",
    targetQuality: "Strategy target quality",
    apiTaskPrice: "API task price",
    subscriptionMarginalCash: "Subscription marginal cash attribution",
    subscriptionMarginalCashNotice: "> This is the marginal amount attributed at the task's deterministic reservation position. It is not a standalone task price; plan totals are authoritative.",
    whyEnough: "Why enough",
    premiumChoice: "Premium choice",
    upgradeTriggers: "Upgrade triggers",
    alternative: "Alternative route",
    conditionalAlternatives: "Conditional alternatives",
    fallback: "Fallback",
    reasons: "Reason codes",
    holdReason: "Hold reason",
    infeasibleReason: "Infeasible reason",
    activatedSubscriptions: "Activated subscription routes",
    subscriptionUsage: "Subscription usage ledgers",
    ownership: "Ownership",
    quotaUnit: "Quota unit",
    availableCapacity: "Available capacity",
    taskIds: "Task IDs",
    premiumBaseline: "Premium API baseline",
    spendComparison: "Spend comparison",
    baseline: "Premium baseline",
    selected: "Selected plan",
    signedDifference: "Signed difference",
    avoidedSpend: "Avoided spend",
    additionalSpend: "Additional spend",
    sourceState: "Restorable raw source state",
    sourceNotice: "Only this section is source input. It contains no official or resolved evidence.",
    audit: "Audit-only resolutions",
    auditNotice: "The values below are audit-only with `importAuthority: false`. Import must re-resolve the raw source state.",
    resourceResolutions: "Resource resolutions",
    candidateResolutions: "Task candidate resolutions",
    confirmedRoutes: "Confirmed candidates",
    excludedRoutes: "Excluded candidates",
    officialApiSources: "Official API catalog audit",
    resolvedResource: "Resolved resource snapshot",
    officialPrice: "Official standard-text price snapshot",
    none: "None",
    statuses: { active: "Active", held: "Held", infeasible: "Infeasible" },
  },
  ja: {
    title: "Frontier Workload Planner — Best-fitルート計画",
    tagline: "> 決定的なBest-fitルート計画です。派生結果と解決済み証拠にインポート権限はありません。",
    exportInformation: "エクスポート情報",
    exportedAt: "エクスポート日時",
    analyzedAt: "分析日時",
    analysisMode: "分析モード",
    analysisModel: "分析モデル",
    calculation: "計算基準",
    strategy: "戦略",
    planningAsOf: "計画基準日時",
    pricingAsOf: "価格基準日",
    budget: "追加現金予算",
    allocationMethod: "配分方式",
    cash: "追加現金",
    total: "合計",
    apiCash: "API現金",
    subscriptionFee: "新規サブスクリプション契約",
    paidOverage: "有料超過利用",
    scenarioOverflow: "表示範囲が飽和したシナリオ",
    low: "Low",
    expected: "Expected",
    high: "High",
    tasks: "タスク別ルート",
    description: "タスク説明",
    priority: "優先度",
    deadline: "タスク期限",
    failureImpact: "失敗影響",
    status: "状態",
    route: "ルートidentity",
    routeKey: "正規ルートキー",
    routeKind: "ルート種別",
    model: "モデル",
    confidence: "信頼状態",
    quality: "品質",
    targetQuality: "戦略目標品質",
    apiTaskPrice: "API作業価格",
    subscriptionMarginalCash: "サブスクリプション限界支出の帰属額",
    subscriptionMarginalCashNotice: "> これは決定論的な予約順序上の位置で、この作業に帰属する限界額です。独立した作業価格ではなく、計画全体の合計が正式な値です。",
    whyEnough: "十分な理由",
    premiumChoice: "Premiumの選択",
    upgradeTriggers: "アップグレード条件",
    alternative: "代替ルート",
    conditionalAlternatives: "条件付き代替",
    fallback: "Fallback",
    reasons: "条件コード",
    holdReason: "保留理由",
    infeasibleReason: "実行不可理由",
    activatedSubscriptions: "有効化されたサブスクリプションルート",
    subscriptionUsage: "サブスクリプション使用量ledger",
    ownership: "所有状態",
    quotaUnit: "クォータ単位",
    availableCapacity: "利用可能容量",
    taskIds: "タスクID",
    premiumBaseline: "Premium API基準線",
    spendComparison: "支出比較",
    baseline: "Premium基準線",
    selected: "選択計画",
    signedDifference: "符号付き差分",
    avoidedSpend: "回避支出",
    additionalSpend: "追加支出",
    sourceState: "復元可能なraw source state",
    sourceNotice: "この節だけがsource入力です。公式または解決済み証拠は含みません。",
    audit: "監査専用の解決結果",
    auditNotice: "以下はaudit-onlyかつ`importAuthority: false`です。インポート時はraw source stateから再解決します。",
    resourceResolutions: "リソース解決",
    candidateResolutions: "タスク候補解決",
    confirmedRoutes: "確認済み候補",
    excludedRoutes: "除外候補",
    officialApiSources: "公式APIカタログ監査",
    resolvedResource: "解決済みリソースsnapshot",
    officialPrice: "公式standard-text価格snapshot",
    none: "なし",
    statuses: { active: "実行", held: "保留", infeasible: "実行不可" },
  },
};

function escapeMarkdown(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>");
}

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
      `### ${index + 1}. ${escapeMarkdown(sourceTask?.name ?? task.taskId)} (${code(task.taskId)})`,
      "",
      `- ${copy.description}: ${escapeMarkdown(sourceTask?.description ?? copy.none)}`,
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
            : escapeMarkdown(uiCopy.enums.whyEnough[task.whyEnough])
        }`,
        `- ${copy.premiumChoice}: ${
          task.whyNotPremium === null
            ? copy.none
            : escapeMarkdown(uiCopy.enums.whyNotPremium[task.whyNotPremium])
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
                escapeMarkdown(uiCopy.enums.upgradeTrigger[trigger]),
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
        `#### ${index + 1}. ${escapeMarkdown(resource.displayName)} (${code(resource.uiId)})`,
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

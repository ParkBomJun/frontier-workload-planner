import {
  PROVIDER_CATALOG,
  PROVIDER_PRICING_BASIS,
  PROVIDER_PRICING_EXCLUSIONS,
} from "@/config/provider-catalog";
import {
  UI_COPY,
  UI_LOCALE_META,
  type UiCopy,
  type UiLocale,
} from "@/lib/i18n/ui-copy";
import { resolveExportAnalysisContract } from "@/lib/export/analysis-contract";
import { isBestFitTaskAnalysis } from "@/lib/planning/workload-requirements";
import { MODEL_TIERS, PROVIDER_IDS, type PlanExportContext } from "@/types/domain";

interface MarkdownLocaleCopy {
  tagline: string;
  analysisInformation: string;
  analysisMode: string;
  analysisModel: string;
  analysisContract: string;
  analyzedAt: string;
  totalBudget: string;
  referenceDeadline: string;
  days: (count: number) => string;
  allocationStrategy: string;
  selectedProductFamily: string;
  activeTasks: string;
  heldTasks: string;
  infeasibleTasks: string;
  taskCount: (count: number) => string;
  costSummary: string;
  expectedRemainingBudget: string;
  providerComparison: string;
  productFamily: string;
  budgetStatus: string;
  active: string;
  held: string;
  infeasible: string;
  taskAllocation: string;
  task: string;
  priority: string;
  status: string;
  gptRecommendation: string;
  strategyTarget: string;
  assignedModel: string;
  description: string;
  missingDescription: string;
  userPriority: string;
  taskDeadline: string;
  failureImpact: string;
  workMode: string;
  minimumQuality: string;
  requiredCapabilities: string;
  upgradeConditions: string;
  failureRisk: string;
  allocationStatus: string;
  classification: string;
  complexity: string;
  reasoning: string;
  sizeBands: string;
  input: string;
  output: string;
  uncertainty: string;
  rationale: string;
  holdReason: string;
  infeasibleReason: string;
  excludedOfferingReasons: string;
  expectedTotals: (iterations: number, inputTokens: string, outputTokens: string) => string;
  riskFactors: string;
  warnings: string;
  pricingAndCalculation: string;
  comparisonBasis: string;
  excludedItems: string;
  heuristicMeaning: string;
  priceVerifiedAt: string;
  pricingSource: string;
  modelsSource: string;
  tierPrice: (input: string, output: string) => string;
  priceThrough: (date: string) => string;
  priceFrom: (date: string, input: string, output: string) => string;
  longContextExcluded: (input: string, output: string) => string;
  tokenLimit: (limit: string) => string;
  fixedBands: string;
  activeCostsOnly: string;
  pricingExclusions: string;
  mockBoundary: string;
  liveBoundary: string;
}

const MARKDOWN_COPY: Record<UiLocale, MarkdownLocaleCopy> = {
  ko: {
    tagline: "> 예산 중심 추천 계획 — 규칙 기반 추천이며 수학적 최적화를 의미하지 않습니다.",
    analysisInformation: "분석 정보",
    analysisMode: "분석 모드",
    analysisModel: "분석 모델",
    analysisContract: "분석 계약",
    analyzedAt: "분석 시각",
    totalBudget: "전체 예산",
    referenceDeadline: "참고 기한",
    days: (count) => `${count}일`,
    allocationStrategy: "배분 전략",
    selectedProductFamily: "선택 제품군",
    activeTasks: "실행 작업",
    heldTasks: "보류 작업",
    infeasibleTasks: "실행 불가 작업",
    taskCount: (count) => `${count}개`,
    costSummary: "비용 요약",
    expectedRemainingBudget: "Expected 잔여 예산",
    providerComparison: "공급자별 비교",
    productFamily: "제품군",
    budgetStatus: "예산 상태",
    active: "실행",
    held: "보류",
    infeasible: "실행 불가",
    taskAllocation: "작업별 배분",
    task: "작업",
    priority: "우선순위",
    status: "상태",
    gptRecommendation: "GPT 권장",
    strategyTarget: "전략 목표",
    assignedModel: "배정 모델",
    description: "설명",
    missingDescription: "저장된 설명 없음",
    userPriority: "사용자 우선순위",
    taskDeadline: "작업 기한",
    failureImpact: "실패 영향",
    workMode: "작업 모드",
    minimumQuality: "최소 품질",
    requiredCapabilities: "필수 기능",
    upgradeConditions: "상향 조건",
    failureRisk: "실패 가능성",
    allocationStatus: "배분 상태",
    classification: "분류",
    complexity: "복잡도",
    reasoning: "추론",
    sizeBands: "크기 구간",
    input: "입력",
    output: "출력",
    uncertainty: "불확실성",
    rationale: "설명 근거",
    holdReason: "보류 사유",
    infeasibleReason: "실행 불가 사유",
    excludedOfferingReasons: "호출 한도로 제외된 모델",
    expectedTotals: (iterations, inputTokens, outputTokens) =>
      `Expected 반복 및 토큰 합계: ${iterations}회 / 입력 ${inputTokens} / 출력 ${outputTokens}`,
    riskFactors: "위험 요인",
    warnings: "경고",
    pricingAndCalculation: "가격과 계산 가정",
    comparisonBasis: "비교 기준",
    excludedItems: "제외 항목",
    heuristicMeaning: "tier 매핑은 예산 계획용 휴리스틱이며 모델 간 객관적 품질 우열을 의미하지 않고, 객관적 품질 순위가 아닙니다.",
    priceVerifiedAt: "가격 확인일",
    pricingSource: "가격 출처",
    modelsSource: "모델 출처",
    tierPrice: (input, output) => `입력 ${input} / 1M, 출력 ${output} / 1M`,
    priceThrough: (date) => `${date}까지 현재 가격`,
    priceFrom: (date, input, output) =>
      `${date}부터 입력 ${input} / 1M, 출력 ${output} / 1M`,
    longContextExcluded: (input, output) =>
      `장문 구간 공식 가격 입력 ${input} / 1M, 출력 ${output} / 1M은 이 비교에서 제외`,
    tokenLimit: (limit) => `prompt ${limit}토큰 이하 가격`,
    fixedBands: "토큰 크기 구간은 반복 1회당 고정 표이며, 표시 토큰은 모든 반복을 합친 값입니다.",
    activeCostsOnly: "비용 합계는 실행 작업만 포함하며 보류 또는 실행 불가 작업에는 모델이나 실행 비용을 배정하지 않습니다.",
    pricingExclusions: "캐시 쓰기·적중, Batch 할인, 도구 호출비, 장문 구간 할증은 비교 비용에 포함하지 않습니다.",
    mockBoundary: "Mock 모드는 저장된 fixture를 사용합니다. Live 분석 엔진은 GPT-5.6만 지원하며 Claude와 Gemini API는 호출하지 않습니다.",
    liveBoundary: "Live 분석은 GPT-5.6만 수행하며 Claude와 Gemini API는 호출하지 않습니다.",
  },
  en: {
    tagline: "> Budget-aware recommended plan — a rule-based recommendation, not mathematical optimization.",
    analysisInformation: "Analysis information",
    analysisMode: "Analysis mode",
    analysisModel: "Analysis model",
    analysisContract: "Analysis contract",
    analyzedAt: "Analyzed at",
    totalBudget: "Total budget",
    referenceDeadline: "Reference deadline",
    days: (count) => `${count} day${count === 1 ? "" : "s"}`,
    allocationStrategy: "Allocation strategy",
    selectedProductFamily: "Selected product family",
    activeTasks: "Active tasks",
    heldTasks: "Tasks on hold",
    infeasibleTasks: "Infeasible tasks",
    taskCount: (count) => `${count}`,
    costSummary: "Cost summary",
    expectedRemainingBudget: "Expected budget remaining",
    providerComparison: "Provider comparison",
    productFamily: "Product family",
    budgetStatus: "Budget status",
    active: "Active",
    held: "On hold",
    infeasible: "Infeasible",
    taskAllocation: "Task allocation",
    task: "Task",
    priority: "Priority",
    status: "Status",
    gptRecommendation: "GPT recommendation",
    strategyTarget: "Strategy target",
    assignedModel: "Assigned model",
    description: "Description",
    missingDescription: "No saved description",
    userPriority: "User priority",
    taskDeadline: "Task deadline",
    failureImpact: "Failure impact",
    workMode: "Work mode",
    minimumQuality: "Minimum quality",
    requiredCapabilities: "Required capabilities",
    upgradeConditions: "Upgrade conditions",
    failureRisk: "Failure risk",
    allocationStatus: "Allocation status",
    classification: "Classification",
    complexity: "complexity",
    reasoning: "reasoning",
    sizeBands: "Size bands",
    input: "input",
    output: "output",
    uncertainty: "Uncertainty",
    rationale: "Rationale",
    holdReason: "Reason for hold",
    infeasibleReason: "Reason infeasible",
    excludedOfferingReasons: "Models excluded by invocation limits",
    expectedTotals: (iterations, inputTokens, outputTokens) =>
      `Expected iterations and token totals: ${iterations} iteration${iterations === 1 ? "" : "s"} / input ${inputTokens} / output ${outputTokens}`,
    riskFactors: "Risk factors",
    warnings: "Warnings",
    pricingAndCalculation: "Pricing and calculation assumptions",
    comparisonBasis: "Comparison basis",
    excludedItems: "Excluded items",
    heuristicMeaning: "Tier mappings are budget-planning heuristics and do not indicate objective quality equivalence or superiority between models.",
    priceVerifiedAt: "Price verified",
    pricingSource: "Pricing source",
    modelsSource: "Models source",
    tierPrice: (input, output) => `input ${input} / 1M, output ${output} / 1M`,
    priceThrough: (date) => `current price through ${date}`,
    priceFrom: (date, input, output) =>
      `from ${date}: input ${input} / 1M, output ${output} / 1M`,
    longContextExcluded: (input, output) =>
      `official long-context price of input ${input} / 1M and output ${output} / 1M is excluded from this comparison`,
    tokenLimit: (limit) => `price for prompts up to ${limit} tokens`,
    fixedBands: "Token size bands are fixed per iteration; displayed token counts are totals across all iterations.",
    activeCostsOnly: "Cost totals include active tasks only; held and infeasible tasks receive no model or execution cost.",
    pricingExclusions: "Cache writes and hits, Batch discounts, tool-call fees, and long-context surcharges are excluded from comparison costs.",
    mockBoundary: "Mock mode uses a stored fixture. GPT-5.6 is the only Live analysis engine; Claude and Gemini APIs are not called.",
    liveBoundary: "Only GPT-5.6 performs Live analysis; Claude and Gemini APIs are not called.",
  },
  ja: {
    tagline: "> 予算重視の推奨計画 — ルールベースの推奨であり、数学的最適化ではありません。",
    analysisInformation: "分析情報",
    analysisMode: "分析モード",
    analysisModel: "分析モデル",
    analysisContract: "分析契約",
    analyzedAt: "分析日時",
    totalBudget: "総予算",
    referenceDeadline: "参考期限",
    days: (count) => `${count}日`,
    allocationStrategy: "配分戦略",
    selectedProductFamily: "選択した製品群",
    activeTasks: "実行タスク",
    heldTasks: "保留タスク",
    infeasibleTasks: "実行不可タスク",
    taskCount: (count) => `${count}件`,
    costSummary: "コスト概要",
    expectedRemainingBudget: "Expected残予算",
    providerComparison: "プロバイダー別比較",
    productFamily: "製品群",
    budgetStatus: "予算状況",
    active: "実行",
    held: "保留",
    infeasible: "実行不可",
    taskAllocation: "タスク別配分",
    task: "タスク",
    priority: "優先度",
    status: "状態",
    gptRecommendation: "GPT推奨",
    strategyTarget: "戦略目標",
    assignedModel: "割り当てモデル",
    description: "説明",
    missingDescription: "保存済みの説明なし",
    userPriority: "ユーザー優先度",
    taskDeadline: "タスク期限",
    failureImpact: "失敗時の影響",
    workMode: "作業モード",
    minimumQuality: "最低品質",
    requiredCapabilities: "必須機能",
    upgradeConditions: "上位化条件",
    failureRisk: "失敗確率",
    allocationStatus: "配分状態",
    classification: "分類",
    complexity: "複雑度",
    reasoning: "推論",
    sizeBands: "サイズ帯",
    input: "入力",
    output: "出力",
    uncertainty: "不確実性",
    rationale: "判断理由",
    holdReason: "保留理由",
    infeasibleReason: "実行不可の理由",
    excludedOfferingReasons: "呼び出し上限により除外したモデル",
    expectedTotals: (iterations, inputTokens, outputTokens) =>
      `Expected反復・トークン合計: ${iterations}回 / 入力 ${inputTokens} / 出力 ${outputTokens}`,
    riskFactors: "リスク要因",
    warnings: "警告",
    pricingAndCalculation: "料金と計算の前提",
    comparisonBasis: "比較基準",
    excludedItems: "除外項目",
    heuristicMeaning: "tierの対応付けは予算計画用ヒューリスティックであり、モデル間の客観的な品質の同等性や優劣を示しません。",
    priceVerifiedAt: "料金確認日",
    pricingSource: "料金ソース",
    modelsSource: "モデルソース",
    tierPrice: (input, output) => `入力 ${input} / 1M、出力 ${output} / 1M`,
    priceThrough: (date) => `現在の表示料金は${date}まで`,
    priceFrom: (date, input, output) =>
      `${date}から入力 ${input} / 1M、出力 ${output} / 1M`,
    longContextExcluded: (input, output) =>
      `長文向けの公式料金（入力 ${input} / 1M、出力 ${output} / 1M）はこの比較から除外`,
    tokenLimit: (limit) => `prompt ${limit}トークン以下の料金`,
    fixedBands: "トークンのサイズ帯は反復1回ごとの固定表で、表示トークン数は全反復の合計です。",
    activeCostsOnly: "コスト合計には実行タスクのみを含め、保留・実行不可タスクにはモデルや実行コストを割り当てません。",
    pricingExclusions: "キャッシュの書き込み・ヒット、Batch割引、ツール呼び出し料金、長文追加料金は比較コストに含めません。",
    mockBoundary: "Mockモードは保存済みfixtureを使用します。Live分析エンジンはGPT-5.6のみで、ClaudeとGemini APIは呼び出しません。",
    liveBoundary: "Live分析はGPT-5.6のみが行い、ClaudeとGemini APIは呼び出しません。",
  },
};

function escapeMarkdownCell(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}

function formatUsd(value: number): string {
  const decimal = value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return `$${decimal || "0"}`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function labelWithEnum(label: string, value: string): string {
  return `${label} (\`${value}\`)`;
}

function localizedWarnings(
  context: PlanExportContext,
  ui: UiCopy,
  isBestFit: boolean,
): string[] {
  const { plan } = context;
  const warnings: string[] = [];

  if (!plan.expectedWithinBudget) {
    warnings.push(ui.analysisResults.expectedBudgetUnresolved);
  }
  if (plan.heldTaskCount > 0) {
    warnings.push(ui.analysisResults.heldWarning(plan.heldTaskCount));
  }
  if (plan.infeasibleTaskCount > 0) {
    warnings.push(
      isBestFit
        ? ui.analysisResults.infeasibleWarning(plan.infeasibleTaskCount)
        : ui.analysisResults.legacyInfeasibleWarning(plan.infeasibleTaskCount),
    );
  }
  if (plan.limitReassignedTaskCount > 0) {
    warnings.push(ui.analysisResults.limitReassignedWarning(plan.limitReassignedTaskCount));
  }
  if (plan.downgradedTaskCount > 0) {
    warnings.push(ui.analysisResults.downgradedWarning(plan.downgradedTaskCount));
  }
  if (plan.highExceedsBudget) {
    warnings.push(ui.analysisResults.highBudgetWarning);
  }
  if (plan.settings.deadlineDays === 1) {
    warnings.push(ui.analysisResults.oneDayDeadlineWarning);
  }

  return warnings;
}

export function createPlanMarkdown(
  context: PlanExportContext,
  locale: UiLocale = "ko",
): string {
  const { identity: analysisContract, isBestFit } = resolveExportAnalysisContract(context);
  const { sourceTasks, plan, analysisMode, analysisModel, generatedAt } = context;
  const ui = UI_COPY[locale];
  const copy = MARKDOWN_COPY[locale];
  const numberLocale = UI_LOCALE_META[locale].numberLocale;
  const sourceTaskById = new Map(sourceTasks.map((task) => [task.id, task]));
  const lines: string[] = [
    "# Frontier Workload Planner",
    "",
    copy.tagline,
    "",
    `## ${copy.analysisInformation}`,
    "",
    `- ${copy.analysisMode}: ${labelWithEnum(ui.enums.analysisMode[analysisMode], analysisMode)}`,
    `- ${copy.analysisModel}: \`${analysisModel}\``,
    ...(isBestFit
      ? [
          `- ${copy.analysisContract}: \`${analysisContract.contractVersion}\` / \`${analysisContract.compatibility}\``,
          `- ${ui.analysisResults.eligibilityVerificationPending}`,
        ]
      : []),
    `- ${copy.analyzedAt}: ${formatTimestamp(generatedAt)}`,
    `- ${copy.totalBudget}: ${formatUsd(plan.settings.budgetUsd)}`,
    `- ${copy.referenceDeadline}: ${copy.days(plan.settings.deadlineDays)}`,
    `- ${copy.allocationStrategy}: ${labelWithEnum(ui.enums.strategy[plan.settings.strategy], plan.settings.strategy)}`,
    `- ${copy.selectedProductFamily}: \`${plan.providerId}\` (${ui.enums.provider[plan.providerId]})`,
    `- ${copy.activeTasks}: ${copy.taskCount(plan.activeTaskCount)}`,
    `- ${copy.heldTasks}: ${copy.taskCount(plan.heldTaskCount)}`,
    `- ${copy.infeasibleTasks}: ${copy.taskCount(plan.infeasibleTaskCount)}`,
    "",
    `## ${copy.costSummary}`,
    "",
    `| Low | Expected | High | ${copy.expectedRemainingBudget} |`,
    "| ---: | ---: | ---: | ---: |",
    `| ${formatUsd(plan.totals.lowUsd)} | ${formatUsd(plan.totals.expectedUsd)} | ${formatUsd(plan.totals.highUsd)} | ${formatUsd(plan.remainingBudgetUsd)} |`,
    "",
    `## ${copy.providerComparison}`,
    "",
    `> ${ui.providerComparison.analysisExplanation[analysisMode]}`,
    "",
    `- ${ui.providerComparison.heuristicNotice}`,
    `- ${ui.providerComparison.noQualityRanking}`,
    `- ${ui.providerComparison.standardPricingNotice}`,
    ...(isBestFit ? [`- ${ui.providerComparison.eligibilityScopeNotice}`] : []),
    "",
    `| ${copy.productFamily} | Low | Expected | High | ${copy.budgetStatus} | ${copy.active} | ${copy.held} | ${copy.infeasible} |`,
    "| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: |",
  ];

  context.providerComparisons.forEach((comparison) => {
    const budgetStatus = comparison.infeasibleTaskCount > 0
      ? isBestFit
        ? ui.providerComparison.checkedConstraintsInfeasible
        : ui.providerComparison.infeasibleOfferings
      : comparison.expectedWithinBudget
      ? comparison.allTasksActiveWithinBudget
        ? isBestFit
          ? ui.providerComparison.checkedConstraintsFit
          : ui.providerComparison.allWorkFits
        : isBestFit
          ? ui.providerComparison.checkedConstraintsWithHolds
          : ui.providerComparison.fitsWithHolds
      : ui.providerComparison.outsideBudget;
    lines.push(
      `| ${ui.enums.provider[comparison.providerId]} | ${formatUsd(comparison.totals.lowUsd)} | ${formatUsd(comparison.totals.expectedUsd)} | ${formatUsd(comparison.totals.highUsd)} | ${budgetStatus} | ${comparison.activeTaskCount} | ${comparison.heldTaskCount} | ${comparison.infeasibleTaskCount} |`,
    );
  });

  lines.push(
    "",
    `## ${copy.taskAllocation}`,
    "",
    `| # | ${copy.task} | ${copy.priority} | ${copy.status} | ${copy.gptRecommendation} | ${copy.strategyTarget} | ${copy.assignedModel} | Low | Expected | High |`,
    "| ---: | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |",
  );

  plan.tasks.forEach((task, index) => {
    const allocation =
      task.status === "active"
        ? {
            status: ui.enums.allocationStatus.active,
            model: `\`${task.modelId}\``,
            low: formatUsd(task.cost.low.costUsd),
            expected: formatUsd(task.cost.expected.costUsd),
            high: formatUsd(task.cost.high.costUsd),
          }
        : {
            status: ui.enums.allocationStatus[task.status],
            model: "—",
            low: "—",
            expected: "—",
            high: "—",
          };
    lines.push(
      `| ${index + 1} | ${escapeMarkdownCell(task.taskName)} | ${labelWithEnum(ui.enums.priority[task.priority], task.priority)} | ${allocation.status} | ${labelWithEnum(ui.enums.modelTier[task.analysis.recommendedModelTier], task.analysis.recommendedModelTier)} | ${labelWithEnum(ui.enums.modelTier[task.strategyTargetTier], task.strategyTargetTier)} | ${allocation.model} | ${allocation.low} | ${allocation.expected} | ${allocation.high} |`,
    );
  });

  for (const [index, task] of plan.tasks.entries()) {
    const sourceTask = sourceTaskById.get(task.taskId);
    const failures = task.offeringFailures.flatMap((offering) =>
      offering.scenarios.flatMap((scenario) =>
        scenario.failures.map((failure) => ({
          modelId: offering.modelId,
          scenario: scenario.scenario,
          ...failure,
        })),
      ),
    );
    const failureLabels = [
      ...new Set(failures.map((failure) => ui.enums.invocationFailure[failure.code])),
    ];
    lines.push(
      "",
      `### ${index + 1}. ${escapeMarkdownCell(task.taskName)}`,
      "",
      `- ${copy.description}: ${sourceTask ? escapeMarkdownCell(sourceTask.description) : copy.missingDescription}`,
      `- ${copy.userPriority}: ${labelWithEnum(ui.enums.priority[task.priority], task.priority)}`,
      `- ${copy.allocationStatus}: ${labelWithEnum(ui.enums.allocationStatus[task.status], task.status)}`,
      `- ${copy.classification}: ${labelWithEnum(ui.enums.taskType[task.analysis.taskType], task.analysis.taskType)} / ${copy.complexity} ${labelWithEnum(ui.enums.complexity[task.analysis.complexity], task.analysis.complexity)} / ${copy.reasoning} ${labelWithEnum(ui.enums.reasoningDepth[task.analysis.reasoningDepth], task.analysis.reasoningDepth)}`,
      `- ${copy.sizeBands}: ${copy.input} ${labelWithEnum(ui.enums.sizeBand[task.analysis.estimatedInputSize], task.analysis.estimatedInputSize)} / ${copy.output} ${labelWithEnum(ui.enums.sizeBand[task.analysis.estimatedOutputSize], task.analysis.estimatedOutputSize)}`,
      `- ${copy.uncertainty}: ${labelWithEnum(ui.enums.uncertainty[task.analysis.uncertainty], task.analysis.uncertainty)}`,
      `- ${copy.rationale}: ${escapeMarkdownCell(task.analysis.rationale)}`,
    );

    if (isBestFitTaskAnalysis(task.analysis)) {
      lines.push(
        `- ${copy.taskDeadline}: ${sourceTask?.deadlineDate ?? ui.common.none}`,
        `- ${copy.failureImpact}: ${sourceTask ? labelWithEnum(ui.enums.failureImpact[sourceTask.failureImpact], sourceTask.failureImpact) : ui.common.none}`,
        `- ${copy.workMode}: \`${task.analysis.workMode}\``,
        `- ${copy.minimumQuality}: \`${task.analysis.requiredQualityTier}\``,
        `- ${copy.requiredCapabilities}: ${task.analysis.requiredCapabilities.length ? task.analysis.requiredCapabilities.map((capability) => `\`${capability}\``).join(", ") : ui.common.none}`,
        `- ${copy.upgradeConditions}: ${task.analysis.upgradeConditions.length ? task.analysis.upgradeConditions.map((condition) => `\`${condition}\``).join(", ") : ui.common.none}`,
        `- ${copy.failureRisk}: \`${task.analysis.failureRisk}\``,
      );
    }

    if (task.status === "infeasible") {
      lines.push(
        `- ${copy.infeasibleReason}: \`${task.infeasibleReason}\` — ${isBestFitTaskAnalysis(task.analysis) ? ui.analysisResults.infeasibleReason(failureLabels.join(", ")) : ui.analysisResults.legacyInfeasibleReason(failureLabels.join(", "))}`,
      );
      failures.forEach((failure) => {
        lines.push(
          `  - \`${failure.modelId}\` · ${failure.scenario} · ${ui.enums.invocationFailure[failure.code]} (${failure.actualTokens.toLocaleString(numberLocale)} > ${failure.limitTokens.toLocaleString(numberLocale)})`,
        );
      });
    } else if (task.status === "held") {
      lines.push(
        `- ${copy.holdReason}: ${ui.analysisResults.heldReason(formatUsd(task.minimumExpectedCostUsd))}`,
      );
    } else {
      lines.push(
        `- ${copy.expectedTotals(
          task.cost.expected.iterations,
          task.cost.expected.inputTokens.toLocaleString(numberLocale),
          task.cost.expected.outputTokens.toLocaleString(numberLocale),
        )}`,
      );
    }

    if (task.status !== "infeasible" && failures.length > 0) {
      lines.push(
        `- ${copy.excludedOfferingReasons}: ${ui.analysisResults.excludedOfferingsReason(failureLabels.join(", "))}`,
      );
      failures.forEach((failure) => {
        lines.push(
          `  - \`${failure.modelId}\` · ${failure.scenario} · ${ui.enums.invocationFailure[failure.code]} (${failure.actualTokens.toLocaleString(numberLocale)} > ${failure.limitTokens.toLocaleString(numberLocale)})`,
        );
      });
    }

    if (task.analysis.riskFactors.length) {
      lines.push(`- ${copy.riskFactors}:`);
      task.analysis.riskFactors.forEach((risk) => {
        lines.push(`  - ${escapeMarkdownCell(risk)}`);
      });
    }
  }

  const warnings = localizedWarnings(context, ui, isBestFit);
  lines.push("", `## ${copy.warnings}`, "");
  if (warnings.length) {
    warnings.forEach((warning) => lines.push(`- ${escapeMarkdownCell(warning)}`));
  } else {
    lines.push(`- ${ui.common.none}`);
  }

  lines.push(
    "",
    `## ${copy.pricingAndCalculation}`,
    "",
    `- ${copy.comparisonBasis}: \`${PROVIDER_PRICING_BASIS}\``,
    `- ${ui.providerPricing.introduction(PROVIDER_PRICING_BASIS)}`,
    `- ${copy.excludedItems}: ${PROVIDER_PRICING_EXCLUSIONS.map(
      (exclusion) => `${ui.providerPricing.exclusions[exclusion]} (\`${exclusion}\`)`,
    ).join(", ")}`,
    `- ${copy.heuristicMeaning}`,
    `- ${ui.providerComparison.noQualityRanking}`,
  );
  PROVIDER_IDS.forEach((providerId) => {
    const provider = PROVIDER_CATALOG[providerId];
    lines.push(
      "",
      `### ${ui.enums.provider[providerId]}`,
      "",
      `- ${copy.priceVerifiedAt}: ${provider.verifiedAt}`,
      `- ${copy.pricingSource}: ${provider.pricingSource}`,
      `- ${copy.modelsSource}: ${provider.modelsSource}`,
    );
    MODEL_TIERS.forEach((tier) => {
      const price = provider.models[tier];
      const restrictions = [
        price.preview ? ui.providerPricing.preview : null,
        price.effectiveThrough ? copy.priceThrough(price.effectiveThrough) : null,
        price.standardPriceInputLimitTokens
          ? copy.tokenLimit(price.standardPriceInputLimitTokens.toLocaleString(numberLocale))
          : null,
        price.limits.maxInputTokens
          ? ui.providerPricing.maxInputLimit(
              price.limits.maxInputTokens.toLocaleString(numberLocale),
            )
          : null,
        price.limits.maxOutputTokens
          ? ui.providerPricing.maxOutputLimit(
              price.limits.maxOutputTokens.toLocaleString(numberLocale),
            )
          : null,
        price.limits.maxCombinedTokens
          ? ui.providerPricing.maxCombinedLimit(
              price.limits.maxCombinedTokens.toLocaleString(numberLocale),
            )
          : null,
      ].filter((restriction): restriction is string => restriction !== null);
      lines.push(
        `- ${labelWithEnum(ui.enums.modelTier[tier], tier)}: \`${price.catalogId}\` (${price.displayName}), ${copy.tierPrice(formatUsd(price.inputUsdPerMillion), formatUsd(price.outputUsdPerMillion))}${restrictions.length ? ` — ${restrictions.join(" · ")}` : ""}`,
        `  - ${copy.modelsSource}: ${price.limits.sourceUrl} (${price.limits.verifiedAt})`,
      );
      if (price.priceAfterEffectiveThrough) {
        lines.push(
          `  - ${copy.priceFrom(
            price.priceAfterEffectiveThrough.effectiveFrom,
            formatUsd(price.priceAfterEffectiveThrough.inputUsdPerMillion),
            formatUsd(price.priceAfterEffectiveThrough.outputUsdPerMillion),
          )}`,
        );
      }
      if (price.excludedLongContextPrice) {
        lines.push(
          `  - ${copy.longContextExcluded(
            formatUsd(price.excludedLongContextPrice.inputUsdPerMillion),
            formatUsd(price.excludedLongContextPrice.outputUsdPerMillion),
          )}`,
        );
      }
    });
  });
  lines.push(
    `- ${copy.fixedBands}`,
    `- ${copy.activeCostsOnly}`,
    `- ${copy.pricingExclusions}`,
    `- ${analysisMode === "mock" ? copy.mockBoundary : copy.liveBoundary}`,
    "",
  );

  return lines.join("\n");
}

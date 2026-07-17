import {
  MODEL_PRICING,
  MODEL_PRICING_LAST_UPDATED,
  MODEL_PRICING_SOURCE,
} from "@/config/model-pricing";
import type { ModelTier, PlanExportContext } from "@/types/domain";

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

export function createPlanMarkdown(context: PlanExportContext): string {
  const { sourceTasks, plan, analysisMode, analysisModel, generatedAt } = context;
  const sourceTaskById = new Map(sourceTasks.map((task) => [task.id, task]));
  const lines: string[] = [
    "# Frontier Workload Planner",
    "",
    "> Budget-aware recommended plan — 규칙 기반 추천이며 수학적 최적화를 의미하지 않습니다.",
    "",
    "## 분석 정보",
    "",
    `- 분석 모드: \`${analysisMode}\``,
    `- 분석 모델: \`${analysisModel}\``,
    `- 분석 시각: ${formatTimestamp(generatedAt)}`,
    `- 전체 예산: ${formatUsd(plan.settings.budgetUsd)}`,
    `- 참고 기한: ${plan.settings.deadlineDays}일`,
    `- 배분 전략: \`${plan.settings.strategy}\``,
    `- 실행 작업: ${plan.activeTaskCount}개`,
    `- 보류 작업: ${plan.heldTaskCount}개`,
    "",
    "## 비용 요약",
    "",
    "| Low | Expected | High | Expected 잔여 예산 |",
    "| ---: | ---: | ---: | ---: |",
    `| ${formatUsd(plan.totals.lowUsd)} | ${formatUsd(plan.totals.expectedUsd)} | ${formatUsd(plan.totals.highUsd)} | ${formatUsd(plan.remainingBudgetUsd)} |`,
    "",
    "## 작업별 배분",
    "",
    "| # | 작업 | 우선순위 | 상태 | GPT 권장 | 전략 목표 | 배정 모델 | Low | Expected | High |",
    "| ---: | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |",
  ];

  plan.tasks.forEach((task, index) => {
    const allocation =
      task.status === "held"
        ? { status: "On hold", model: "—", low: "—", expected: "—", high: "—" }
        : {
            status: "Active",
            model: `\`${task.modelId}\``,
            low: formatUsd(task.cost.low.costUsd),
            expected: formatUsd(task.cost.expected.costUsd),
            high: formatUsd(task.cost.high.costUsd),
          };
    lines.push(
      `| ${index + 1} | ${escapeMarkdownCell(task.taskName)} | ${task.priority} | ${allocation.status} | ${task.analysis.recommendedModelTier} | ${task.strategyTargetTier} | ${allocation.model} | ${allocation.low} | ${allocation.expected} | ${allocation.high} |`,
    );
  });

  for (const [index, task] of plan.tasks.entries()) {
    const sourceTask = sourceTaskById.get(task.taskId);
    lines.push(
      "",
      `### ${index + 1}. ${escapeMarkdownCell(task.taskName)}`,
      "",
      `- 설명: ${sourceTask ? escapeMarkdownCell(sourceTask.description) : "저장된 설명 없음"}`,
      `- 사용자 우선순위: \`${task.priority}\``,
      `- 배분 상태: \`${task.status}\``,
      `- 분류: \`${task.analysis.taskType}\` / 복잡도 \`${task.analysis.complexity}\` / 추론 \`${task.analysis.reasoningDepth}\``,
      `- 크기 구간: 입력 \`${task.analysis.estimatedInputSize}\` / 출력 \`${task.analysis.estimatedOutputSize}\``,
      `- 불확실성: \`${task.analysis.uncertainty}\``,
      `- 설명 근거: ${escapeMarkdownCell(task.analysis.rationale)}`,
    );

    if (task.status === "held") {
      lines.push(
        `- 보류 사유: 전체 작업의 Economy 최소비용이 예산을 넘어 우선순위가 낮은 작업부터 보류했습니다. 이 작업의 Economy Expected 최소 필요액은 ${formatUsd(task.minimumExpectedCostUsd)}입니다.`,
      );
    } else {
      lines.push(
        `- Expected 반복 및 토큰 합계: ${task.cost.expected.iterations}회 / 입력 ${task.cost.expected.inputTokens.toLocaleString("en-US")} / 출력 ${task.cost.expected.outputTokens.toLocaleString("en-US")}`,
      );
    }

    if (task.analysis.riskFactors.length) {
      lines.push("- 위험 요인:");
      task.analysis.riskFactors.forEach((risk) => {
        lines.push(`  - ${escapeMarkdownCell(risk)}`);
      });
    }
  }

  lines.push("", "## 경고", "");
  if (plan.warnings.length) {
    plan.warnings.forEach((warning) => lines.push(`- ${escapeMarkdownCell(warning)}`));
  } else {
    lines.push("- 없음");
  }

  lines.push(
    "",
    "## 가격과 계산 가정",
    "",
    `- 가격 확인일: ${MODEL_PRICING_LAST_UPDATED}`,
    `- 가격 출처: ${MODEL_PRICING_SOURCE}`,
  );
  (Object.keys(MODEL_PRICING) as ModelTier[]).forEach((tier) => {
    const price = MODEL_PRICING[tier];
    lines.push(
      `- ${tier}: \`${price.modelId}\`, 입력 ${formatUsd(price.inputUsdPerMillion)} / 1M, 출력 ${formatUsd(price.outputUsdPerMillion)} / 1M`,
    );
  });
  lines.push(
    "- 토큰 크기 구간은 반복 1회당 고정 표이며, 표시 토큰은 모든 반복을 합친 값입니다.",
    "- 비용 합계는 실행 작업만 포함하며 보류 작업에는 모델이나 실행 비용을 배정하지 않습니다.",
    "- 캐시 할인, 도구 호출 비용, 정교한 시간 예측은 포함하지 않습니다.",
    "",
  );

  return lines.join("\n");
}

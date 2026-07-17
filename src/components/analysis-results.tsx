import {
  MODEL_PRICING,
  MODEL_PRICING_LAST_UPDATED,
  MODEL_PRICING_SOURCE,
} from "@/config/model-pricing";
import type {
  AnalysisMode,
  BudgetAllocationPlan,
  ModelTier,
  PlanningStrategy,
} from "@/types/domain";

import { CostChart } from "./cost-chart";

interface AnalysisResultsProps {
  plan: BudgetAllocationPlan;
  analysisMode: AnalysisMode;
  analysisModel: string;
  generatedAt: string;
}

const TIER_LABELS: Record<ModelTier, string> = {
  economy: "Economy",
  balanced: "Balanced",
  frontier: "Frontier",
};

const STRATEGY_LABELS: Record<PlanningStrategy, string> = {
  "cost-saver": "비용 절감",
  balanced: "균형",
  "quality-first": "품질 우선",
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const tokenFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatCurrency(value: number): string {
  return moneyFormatter.format(value);
}

function formatTokens(value: number): string {
  return tokenFormatter.format(value);
}

export function AnalysisResults({
  plan,
  analysisMode,
  analysisModel,
  generatedAt,
}: AnalysisResultsProps) {
  const utilization = Math.min(999, (plan.totals.expectedUsd / plan.settings.budgetUsd) * 100);

  return (
    <section
      aria-labelledby="analysis-results-title"
      className="overflow-hidden rounded-[1.75rem] border border-[#173f31]/15 bg-[#143e30] text-white shadow-[0_24px_70px_rgba(23,63,49,0.2)]"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-7">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#9ed0b8]">
            Budget-aware recommended plan
          </p>
          <h2 id="analysis-results-title" className="mt-1 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
            비용과 모델 배분 결과
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-white/10 px-3 py-1.5 font-bold uppercase text-[#d7e9df]">
            {analysisMode}
          </span>
          <span className="break-all font-mono text-white/60">{analysisModel}</span>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="예산"
            value={formatCurrency(plan.settings.budgetUsd)}
            detail={`${STRATEGY_LABELS[plan.settings.strategy]} · ${plan.settings.deadlineDays}일 기한`}
          />
          <SummaryCard label="Low" value={formatCurrency(plan.totals.lowUsd)} detail="낮은 토큰·반복 가정" />
          <SummaryCard
            label="Expected"
            value={formatCurrency(plan.totals.expectedUsd)}
            detail={`예산 사용 ${utilization.toFixed(1)}%`}
            emphasized
          />
          <SummaryCard
            label="High"
            value={formatCurrency(plan.totals.highUsd)}
            detail={plan.highExceedsBudget ? "예산 초과 위험" : "예산 범위"}
            warning={plan.highExceedsBudget}
          />
        </div>

        {plan.warnings.length ? (
          <div
            className={`rounded-2xl border p-4 ${
              plan.expectedWithinBudget
                ? "border-[#e9b082]/25 bg-[#e9b082]/10"
                : "border-[#ef8664]/30 bg-[#ef8664]/12"
            }`}
          >
            <h3 className="text-sm font-bold text-[#ffe4d1]">계획 확인 사항</h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-white/75">
              {plan.warnings.map((warning) => (
                <li key={warning} className="flex gap-2">
                  <span aria-hidden="true" className="text-[#efb28b]">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#9ed0b8]/20 bg-[#9ed0b8]/10 p-4 text-sm text-[#d9ebe1]">
            Expected와 High 시나리오가 모두 입력 예산 안에 있습니다.
          </div>
        )}

        <CostChart tasks={plan.tasks} formatCurrency={formatCurrency} />

        <div>
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-lg font-semibold">작업별 배분</h3>
            <p className="text-xs text-white/55">
              Expected 잔여 예산 {formatCurrency(plan.remainingBudgetUsd)}
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {plan.tasks.map((task, index) => (
              <article key={task.taskId} className="min-w-0 rounded-2xl border border-white/10 bg-[#1b4a39] p-4 sm:p-5">
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-[#9ed0b8]">
                      TASK {String(index + 1).padStart(2, "0")}
                    </p>
                    <h4 className="mt-1 break-words text-lg font-semibold leading-6">{task.taskName}</h4>
                  </div>
                  {task.wasDowngradedForBudget ? (
                    <span className="shrink-0 rounded-full bg-[#efb28b]/15 px-2.5 py-1 text-xs font-bold text-[#ffd8bd]">
                      예산 조정
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 rounded-xl bg-white/[0.07] p-3.5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/50">Assigned model</p>
                      <p className="mt-1 text-xl font-semibold">{task.modelId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/50">Assigned tier</p>
                      <p className="font-mono text-sm font-bold text-[#b9ddc9]">
                        {TIER_LABELS[task.assignedTier]}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/55">
                    GPT 권장 {TIER_LABELS[task.analysis.recommendedModelTier]} · 전략 목표 {TIER_LABELS[task.strategyTargetTier]}
                  </p>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10">
                  {([
                    ["Low", task.cost.low.costUsd],
                    ["Expected", task.cost.expected.costUsd],
                    ["High", task.cost.high.costUsd],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="min-w-0 bg-[#20513f] p-3">
                      <dt className="truncate text-xs text-white/45">{label}</dt>
                      <dd className="mt-1 break-all font-mono text-sm font-bold text-[#eef7f2]">
                        {formatCurrency(value)}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/65">
                  <p>
                    Expected 입력 합계 <strong className="text-white/85">{formatTokens(task.cost.expected.inputTokens)}</strong>
                  </p>
                  <p>
                    Expected 출력 합계 <strong className="text-white/85">{formatTokens(task.cost.expected.outputTokens)}</strong>
                  </p>
                  <p>
                    반복 <strong className="text-white/85">{task.cost.expected.iterations}회</strong>
                  </p>
                  <p>
                    불확실성 <strong className="capitalize text-white/85">{task.analysis.uncertainty}</strong>
                  </p>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {[
                    ["작업 유형", task.analysis.taskType],
                    ["복잡도", task.analysis.complexity],
                    ["추론", task.analysis.reasoningDepth],
                    [
                      "크기 구간",
                      `${task.analysis.estimatedInputSize} → ${task.analysis.estimatedOutputSize}`,
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-white/[0.055] px-2.5 py-2">
                      <dt className="text-white/45">{label}</dt>
                      <dd className="mt-1 break-words font-mono font-bold text-white/80">{value}</dd>
                    </div>
                  ))}
                </dl>

                {task.analysis.riskFactors.length ? (
                  <div className="mt-4 rounded-xl border border-[#efb28b]/15 bg-[#efb28b]/[0.07] p-3">
                    <p className="text-xs font-bold text-[#ffd8bd]">위험 요인</p>
                    <ul className="mt-1.5 space-y-1 text-xs leading-5 text-white/60">
                      {task.analysis.riskFactors.map((risk, riskIndex) => (
                        <li key={`${task.taskId}-risk-${riskIndex}`} className="flex gap-2">
                          <span aria-hidden="true">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="mt-4 border-t border-white/10 pt-3 text-sm leading-6 text-white/65">
                  {task.analysis.rationale}
                </p>
              </article>
            ))}
          </div>
        </div>

        <PricingAssumptions />

        <p className="border-t border-white/10 pt-4 text-xs leading-5 text-white/50">
          {new Date(generatedAt).toLocaleString("ko-KR")} · 규칙 기반 추천이며 수학적 최적화를 의미하지 않습니다.
        </p>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  emphasized = false,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  emphasized?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        warning
          ? "border-[#ef8664]/30 bg-[#ef8664]/12"
          : emphasized
            ? "border-[#9ed0b8]/25 bg-[#9ed0b8]/12"
            : "border-white/10 bg-white/[0.055]"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/50">{label}</p>
      <p className="mt-1.5 break-all text-2xl font-semibold tracking-[-0.025em]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-white/55">{detail}</p>
    </div>
  );
}

function PricingAssumptions() {
  return (
    <details className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <summary className="cursor-pointer text-sm font-bold text-[#d9ebe1] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/10">
        가격과 계산 가정 보기
      </summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="text-white/45">
            <tr>
              <th className="pb-2 font-semibold">등급</th>
              <th className="pb-2 font-semibold">모델</th>
              <th className="pb-2 text-right font-semibold">입력 / 1M</th>
              <th className="pb-2 text-right font-semibold">출력 / 1M</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-white/75">
            {(Object.keys(MODEL_PRICING) as ModelTier[]).map((tier) => {
              const price = MODEL_PRICING[tier];
              return (
                <tr key={tier}>
                  <td className="py-2 capitalize">{tier}</td>
                  <td className="py-2 font-mono">{price.modelId}</td>
                  <td className="py-2 text-right">${price.inputUsdPerMillion}</td>
                  <td className="py-2 text-right">${price.outputUsdPerMillion}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 space-y-1.5 text-xs leading-5 text-white/55">
        <li>크기 구간은 프로그램의 고정 표이며 GPT가 토큰 숫자를 만들지 않습니다.</li>
        <li>크기 구간은 반복 1회당이며 화면의 토큰은 모든 반복을 합친 시나리오 합계입니다.</li>
        <li>Low / Expected / High는 예상 반복 횟수 −1(최소 1) / 동일 / +1을 적용합니다.</li>
        <li>캐시 할인과 도구 호출 비용은 보장할 수 없어 포함하지 않습니다.</li>
        <li>입력 구간은 요청당 256K 이하라 272K 초과 장문 입력 추가요금을 적용하지 않습니다.</li>
        <li>Expected가 예산을 넘으면 권장 등급·추론·복잡도·불확실성이 낮은 작업부터 한 등급씩 낮춥니다.</li>
        <li>불확실성은 하향 순서에만 반영하며 숫자 범위를 임의로 넓히지 않습니다.</li>
        <li>검토 기한은 참고용이며 비용이나 모델 등급에 영향을 주지 않습니다.</li>
      </ul>
      <a
        href={MODEL_PRICING_SOURCE}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-xs font-bold text-[#b9ddc9] underline decoration-[#b9ddc9]/40 underline-offset-4 hover:text-white"
      >
        공식 가격표 · {MODEL_PRICING_LAST_UPDATED} 확인
      </a>
    </details>
  );
}

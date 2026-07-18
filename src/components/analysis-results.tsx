"use client";

import { isBestFitTaskAnalysis } from "@/lib/planning/workload-requirements";
import type {
  AnalysisContractIdentity,
  AnalysisMode,
  BudgetAllocationPlan,
  PlanExportContext,
  ProviderComparisonSummary,
  ProviderId,
  TaskInput,
} from "@/types/domain";

import { useLanguage } from "./language-provider";
import { CostChart } from "./cost-chart";
import { ExportActions } from "./export-actions";
import { ProviderComparison } from "./provider-comparison";
import { ProviderPricingAssumptions } from "./provider-pricing-assumptions";

interface AnalysisResultsProps {
  sourceTasks: TaskInput[];
  plan: BudgetAllocationPlan;
  providerComparisons: ProviderComparisonSummary[];
  selectedProvider: ProviderId;
  onProviderChange: (providerId: ProviderId) => void;
  analysisMode: AnalysisMode;
  analysisModel: string;
  analysisContract: AnalysisContractIdentity;
  generatedAt: string;
  referenceOnly?: boolean;
}

export function AnalysisResults({
  sourceTasks,
  plan,
  providerComparisons,
  selectedProvider,
  onProviderChange,
  analysisMode,
  analysisModel,
  analysisContract,
  generatedAt,
  referenceOnly = false,
}: AnalysisResultsProps) {
  const { copy, localeMeta } = useLanguage();
  const isBestFitAnalysis = analysisContract.compatibility === "best-fit";
  const moneyFormatter = new Intl.NumberFormat(localeMeta.numberLocale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const tokenFormatter = new Intl.NumberFormat(localeMeta.numberLocale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const exactTokenFormatter = new Intl.NumberFormat(localeMeta.numberLocale);
  const percentFormatter = new Intl.NumberFormat(localeMeta.numberLocale, {
    maximumFractionDigits: 1,
  });
  const formatCurrency = (value: number) => moneyFormatter.format(value);
  const formatTokens = (value: number) => tokenFormatter.format(value);
  const utilization = Math.min(999, (plan.totals.expectedUsd / plan.settings.budgetUsd) * 100);
  const localizedWarnings = [
    !plan.expectedWithinBudget ? copy.analysisResults.expectedBudgetUnresolved : null,
    plan.heldTaskCount > 0 ? copy.analysisResults.heldWarning(plan.heldTaskCount) : null,
    plan.infeasibleTaskCount > 0
      ? isBestFitAnalysis
        ? copy.analysisResults.infeasibleWarning(plan.infeasibleTaskCount)
        : copy.analysisResults.legacyInfeasibleWarning(plan.infeasibleTaskCount)
      : null,
    plan.limitReassignedTaskCount > 0
      ? copy.analysisResults.limitReassignedWarning(plan.limitReassignedTaskCount)
      : null,
    plan.downgradedTaskCount > 0
      ? copy.analysisResults.downgradedWarning(plan.downgradedTaskCount)
      : null,
    plan.highExceedsBudget ? copy.analysisResults.highBudgetWarning : null,
    plan.settings.deadlineDays === 1 ? copy.analysisResults.oneDayDeadlineWarning : null,
  ].filter((warning): warning is string => warning !== null);
  const exportContext: PlanExportContext = {
    sourceTasks,
    plan,
    providerComparisons,
    analysisMode,
    analysisModel,
    analysisContract,
    generatedAt,
  };

  return (
    <section
      aria-labelledby="analysis-results-title"
      data-reference-only={referenceOnly ? "true" : "false"}
      className="overflow-hidden rounded-[1.75rem] border border-[#173f31]/15 bg-[#143e30] text-white shadow-[0_24px_70px_rgba(23,63,49,0.2)]"
    >
      <div className="flex flex-col gap-5 border-b border-white/10 px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-7">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#9ed0b8]">
            {referenceOnly
              ? copy.analysisResults.referenceEyebrow
              : copy.analysisResults.eyebrow}
          </p>
          <h2 id="analysis-results-title" className="mt-1 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
            {referenceOnly
              ? copy.analysisResults.referenceTitle
              : copy.analysisResults.title}
          </h2>
        </div>
        <div className="sm:min-w-[250px]">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end">
            <span className="rounded-full bg-white/10 px-3 py-1.5 font-bold text-[#d7e9df]">
              {copy.analysisResults.aiAnalyzed} · {copy.enums.analysisMode[analysisMode]}
            </span>
            <span className="break-all font-mono text-white/70">{analysisModel}</span>
            <span className="rounded-full bg-[#9ed0b8]/15 px-3 py-1.5 font-bold text-[#d9ebe1]">
              {copy.analysisResults.programCalculated} · {copy.enums.provider[selectedProvider]}
            </span>
          </div>
          {!referenceOnly ? (
            <div className="mt-3">
              <ExportActions context={exportContext} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        {referenceOnly ? (
          <p
            data-reference-plan-notice
            className="rounded-2xl border border-[#e9b082]/30 bg-[#e9b082]/12 p-4 text-sm font-semibold leading-6 text-[#ffe4d1]"
          >
            {copy.analysisResults.referenceNotice}
          </p>
        ) : isBestFitAnalysis ? (
          <p
            data-eligibility-verification="pending"
            className="rounded-2xl border border-[#e9b082]/25 bg-[#e9b082]/10 p-4 text-sm leading-6 text-[#ffe4d1]"
          >
            {copy.analysisResults.eligibilityVerificationPending}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label={copy.analysisResults.budget}
            value={formatCurrency(plan.settings.budgetUsd)}
            detail={`${copy.enums.strategy[plan.settings.strategy]} · ${plan.settings.deadlineDays} ${copy.budgetSettings.deadlineUnit}`}
          />
          <SummaryCard label="Low" value={formatCurrency(plan.totals.lowUsd)} detail={copy.analysisResults.lowDetail} />
          <SummaryCard
            label="Expected"
            value={formatCurrency(plan.totals.expectedUsd)}
            detail={copy.analysisResults.expectedDetail(
              percentFormatter.format(utilization),
              plan.activeTaskCount,
              plan.heldTaskCount,
              plan.infeasibleTaskCount,
            )}
            emphasized
          />
          <SummaryCard
            label="High"
            value={formatCurrency(plan.totals.highUsd)}
            detail={
              plan.highExceedsBudget
                ? copy.analysisResults.highRisk
                : copy.analysisResults.highWithinBudget
            }
            warning={plan.highExceedsBudget}
          />
        </div>

        <ProviderComparison
          comparisons={providerComparisons}
          selectedProvider={selectedProvider}
          onSelect={onProviderChange}
          formatCurrency={formatCurrency}
          analysisMode={analysisMode}
          isBestFitAnalysis={isBestFitAnalysis}
        />

        {localizedWarnings.length ? (
          <div
            className={`rounded-2xl border p-4 ${
              plan.expectedWithinBudget
                ? "border-[#e9b082]/25 bg-[#e9b082]/10"
                : "border-[#ef8664]/30 bg-[#ef8664]/12"
            }`}
          >
            <h3 className="text-sm font-bold text-[#ffe4d1]">{copy.analysisResults.reviewItems}</h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-white/75">
              {localizedWarnings.map((warning) => (
                <li key={warning} className="flex gap-2">
                  <span aria-hidden="true" className="text-[#efb28b]">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#9ed0b8]/20 bg-[#9ed0b8]/10 p-4 text-sm text-[#d9ebe1]">
            {copy.analysisResults.allScenariosWithinBudget}
          </div>
        )}

        <CostChart
          tasks={plan.tasks}
          providerLabel={copy.enums.provider[plan.providerId]}
          formatCurrency={formatCurrency}
        />

        <div>
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-lg font-semibold">
              {referenceOnly
                ? copy.analysisResults.referenceAllocationTitle
                : copy.analysisResults.allocationTitle}
            </h3>
            <p className="text-xs text-white/70">
              {copy.analysisResults.allocationSummary(
                plan.activeTaskCount,
                plan.heldTaskCount,
                plan.infeasibleTaskCount,
                formatCurrency(plan.remainingBudgetUsd),
              )}
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {plan.tasks.map((task, index) => {
              const titleId = `result-task-title-${task.taskId}`;
              const invocationFailures = task.offeringFailures.flatMap((offering) =>
                offering.scenarios.flatMap((scenario) =>
                  scenario.failures.map((failure) => ({
                    modelId: offering.modelId,
                    scenario: scenario.scenario,
                    ...failure,
                  })),
                ),
              );
              const failureLabels = [
                ...new Set(
                  invocationFailures.map(
                    (failure) => copy.enums.invocationFailure[failure.code],
                  ),
                ),
              ];
              return (
                <article
                  key={task.taskId}
                  aria-labelledby={titleId}
                  data-task-id={task.taskId}
                  data-allocation-status={task.status}
                  className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${
                    task.status === "infeasible"
                      ? "border-[#ef8664]/35 bg-[#4b302b]"
                      : task.status === "held"
                      ? "border-[#e9b082]/30 bg-[#4a4032]"
                      : "border-white/10 bg-[#1b4a39]"
                  }`}
                >
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-[#9ed0b8]">
                        {copy.analysisResults.taskNumber(index + 1)}
                      </p>
                      <h4 id={titleId} className="mt-1 break-words text-lg font-semibold leading-6">
                        {task.taskName}
                      </h4>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-[#d7e9df]">
                        {copy.enums.priority[task.priority]}
                      </span>
                      {task.status === "held" ? (
                        <span className="rounded-full bg-[#efb28b]/20 px-2.5 py-1 text-xs font-bold text-[#ffe0c9]">
                          {copy.analysisResults.onHoldBadge}
                        </span>
                      ) : task.status === "infeasible" ? (
                        <span className="rounded-full bg-[#ef8664]/20 px-2.5 py-1 text-xs font-bold text-[#ffd2c4]">
                          {copy.analysisResults.infeasibleBadge}
                        </span>
                      ) : task.wasDowngradedForBudget ? (
                        <span className="rounded-full bg-[#efb28b]/15 px-2.5 py-1 text-xs font-bold text-[#ffd8bd]">
                          {copy.analysisResults.budgetAdjustedBadge}
                        </span>
                      ) : task.wasReassignedForLimits ? (
                        <span className="rounded-full bg-[#e9b082]/15 px-2.5 py-1 text-xs font-bold text-[#ffd8bd]">
                          {copy.analysisResults.limitAdjustedBadge}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {task.status === "infeasible" ? (
                    <div className="mt-4 rounded-xl border border-[#ef8664]/30 bg-[#ef8664]/10 p-3.5">
                      <p className="text-sm font-bold text-[#ffd2c4]">
                        {copy.analysisResults.infeasibleTitle}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white/75">
                        {isBestFitTaskAnalysis(task.analysis)
                          ? copy.analysisResults.infeasibleReason(failureLabels.join(", "))
                          : copy.analysisResults.legacyInfeasibleReason(failureLabels.join(", "))}
                      </p>
                      <ul className="mt-2 space-y-1 text-[0.68rem] leading-5 text-white/65">
                        {invocationFailures.map((failure, failureIndex) => (
                          <li
                            key={`${failure.modelId}-${failure.scenario}-${failure.code}-${failureIndex}`}
                          >
                            {failure.modelId} · {failure.scenario} ·{" "}
                            {copy.enums.invocationFailure[failure.code]} ({exactTokenFormatter.format(failure.actualTokens)} &gt;{" "}
                            {exactTokenFormatter.format(failure.limitTokens)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : task.status === "held" ? (
                    <div
                      id={`held-reason-${task.taskId}`}
                      className="mt-4 rounded-xl border border-[#efb28b]/25 bg-[#efb28b]/10 p-3.5"
                    >
                      <p className="text-sm font-bold text-[#ffe0c9]">{copy.analysisResults.heldTitle}</p>
                      <p className="mt-1 text-xs leading-5 text-white/75">
                        {copy.analysisResults.heldReason(
                          formatCurrency(task.minimumExpectedCostUsd),
                        )}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 rounded-xl bg-white/[0.07] p-3.5">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
                              {referenceOnly
                                ? copy.analysisResults.referenceAssignedModel
                                : copy.analysisResults.assignedModel}
                            </p>
                            <p className="mt-1 break-all text-xl font-semibold">{task.modelId}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-white/70">
                              {referenceOnly
                                ? copy.analysisResults.referenceAssignedTier
                                : copy.analysisResults.assignedTier}
                            </p>
                            <p className="font-mono text-sm font-bold text-[#b9ddc9]">
                              {copy.enums.modelTier[task.assignedTier]}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-white/70">
                          {referenceOnly
                            ? copy.analysisResults.referenceTrail(
                                copy.enums.modelTier[task.analysis.recommendedModelTier],
                                copy.enums.modelTier[task.strategyTargetTier],
                              )
                            : copy.analysisResults.recommendationTrail(
                                copy.enums.modelTier[task.analysis.recommendedModelTier],
                                copy.enums.modelTier[task.strategyTargetTier],
                              )}
                        </p>
                      </div>

                      <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10">
                        {([
                          ["Low", task.cost.low.costUsd],
                          ["Expected", task.cost.expected.costUsd],
                          ["High", task.cost.high.costUsd],
                        ] as const).map(([label, value]) => (
                          <div key={label} className="min-w-0 bg-[#20513f] p-3">
                            <dt className="truncate text-xs text-white/65">{label}</dt>
                            <dd className="mt-1 break-all font-mono text-sm font-bold text-[#eef7f2]">
                              {formatCurrency(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/65">
                        <p>
                          {copy.analysisResults.expectedInput}{" "}
                          <strong className="text-white/85">
                            {formatTokens(task.cost.expected.inputTokens)}
                          </strong>
                        </p>
                        <p>
                          {copy.analysisResults.expectedOutput}{" "}
                          <strong className="text-white/85">
                            {formatTokens(task.cost.expected.outputTokens)}
                          </strong>
                        </p>
                        <p>
                          <strong className="text-white/85">
                            {copy.analysisResults.iterations(task.cost.expected.iterations)}
                          </strong>
                        </p>
                        <p>
                          {copy.analysisResults.uncertainty}{" "}
                          <strong className="text-white/85">
                            {copy.enums.uncertainty[task.analysis.uncertainty]}
                          </strong>
                        </p>
                      </div>
                    </>
                  )}

                  {task.status !== "infeasible" && invocationFailures.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-[#e9b082]/20 bg-[#e9b082]/[0.07] p-3.5">
                      <p className="text-xs font-bold text-[#ffe4d1]">
                        {copy.analysisResults.excludedOfferingsTitle}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white/70">
                        {copy.analysisResults.excludedOfferingsReason(failureLabels.join(", "))}
                      </p>
                      <ul className="mt-2 space-y-1 text-[0.68rem] leading-5 text-white/60">
                        {invocationFailures.map((failure, failureIndex) => (
                          <li
                            key={`excluded-${failure.modelId}-${failure.scenario}-${failure.code}-${failureIndex}`}
                          >
                            {failure.modelId} · {failure.scenario} ·{" "}
                            {copy.enums.invocationFailure[failure.code]} ({exactTokenFormatter.format(failure.actualTokens)} &gt;{" "}
                            {exactTokenFormatter.format(failure.limitTokens)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    {[
                      [copy.analysisResults.taskType, copy.enums.taskType[task.analysis.taskType]],
                      [copy.analysisResults.complexity, copy.enums.complexity[task.analysis.complexity]],
                      [copy.analysisResults.reasoning, copy.enums.reasoningDepth[task.analysis.reasoningDepth]],
                      [
                        copy.analysisResults.sizeBand,
                        `${copy.enums.sizeBand[task.analysis.estimatedInputSize]} → ${copy.enums.sizeBand[task.analysis.estimatedOutputSize]}`,
                      ],
                      ...(isBestFitTaskAnalysis(task.analysis)
                        ? [
                            [copy.analysisResults.workMode, task.analysis.workMode],
                            [
                              copy.analysisResults.minimumQuality,
                              task.analysis.requiredQualityTier,
                            ],
                            [copy.analysisResults.failureRisk, task.analysis.failureRisk],
                            [
                              copy.analysisResults.requiredCapabilities,
                              task.analysis.requiredCapabilities.length
                                ? task.analysis.requiredCapabilities.join(", ")
                                : copy.common.none,
                            ],
                          ]
                        : []),
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-white/[0.055] px-2.5 py-2">
                        <dt className="text-white/65">{label}</dt>
                        <dd className="mt-1 break-words font-mono font-bold text-white/80">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {task.analysis.riskFactors.length ? (
                    <div className="mt-4 rounded-xl border border-[#efb28b]/15 bg-[#efb28b]/[0.07] p-3">
                      <p className="text-xs font-bold text-[#ffd8bd]">{copy.analysisResults.risks}</p>
                      <ul className="mt-1.5 space-y-1 text-xs leading-5 text-white/70">
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
              );
            })}
          </div>
        </div>

        <ProviderPricingAssumptions />

        <p className="border-t border-white/10 pt-4 text-xs leading-5 text-white/65">
          {(referenceOnly
            ? copy.analysisResults.referenceGeneratedRuleBased
            : copy.analysisResults.generatedRuleBased)(
              `${new Date(generatedAt).toLocaleString(localeMeta.dateLocale)} · ${copy.enums.provider[plan.providerId]}`,
            )}
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
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/65">{label}</p>
      <p className="mt-1.5 break-all text-2xl font-semibold tracking-[-0.025em]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-white/70">{detail}</p>
    </div>
  );
}

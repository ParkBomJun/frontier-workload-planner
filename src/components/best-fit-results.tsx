"use client";

import { useLanguage } from "@/components/language-provider";
import { PROVIDER_CATALOG } from "@/config/provider-catalog";
import { fromMicroUsd } from "@/lib/calculation/micro-usd";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import type {
  BestFitResourceDiagnostic,
  BestFitUiPlan,
} from "@/lib/planning/best-fit-ui-plan";
import type { RouteIdentity } from "@/types/offerings";
import type { TaskInput } from "@/types/domain";

interface BestFitResultsProps {
  result: BestFitUiPlan;
  tasks: readonly TaskInput[];
  generatedAt: string;
}

const reasonLabels = {
  ko: {
    "below-minimum-quality": "최소 품질 등급 미달",
    "surface-not-supported": "필요한 사용 환경 미지원",
    "required-capability-missing": "필수 기능 미지원",
    "invocation-limit-exceeded": "호출 토큰 한도 초과",
    "model-reference-missing": "모델 참조 없음",
    "resource-unavailable": "현재 사용할 수 없는 자원",
    "price-schedule-not-applicable": "적용 가능한 가격 일정 없음",
    "standard-price-input-limit-exceeded": "표준 가격의 입력 구간 초과",
    "api-route-not-confirmed": "API 이용 경로 미확인",
  },
  en: {
    "below-minimum-quality": "Below the minimum quality tier",
    "surface-not-supported": "Required work surface is unsupported",
    "required-capability-missing": "Required capability is unsupported",
    "invocation-limit-exceeded": "Invocation token limit exceeded",
    "model-reference-missing": "Model reference is missing",
    "resource-unavailable": "Resource is currently unavailable",
    "price-schedule-not-applicable": "No applicable price schedule",
    "standard-price-input-limit-exceeded": "Outside the standard-price input band",
    "api-route-not-confirmed": "API route is not confirmed",
  },
  ja: {
    "below-minimum-quality": "最低品質ティア未満",
    "surface-not-supported": "必要な利用環境に未対応",
    "required-capability-missing": "必須機能に未対応",
    "invocation-limit-exceeded": "呼び出しトークン上限超過",
    "model-reference-missing": "モデル参照なし",
    "resource-unavailable": "現在利用できない資源",
    "price-schedule-not-applicable": "適用可能な価格スケジュールなし",
    "standard-price-input-limit-exceeded": "標準価格の入力範囲外",
    "api-route-not-confirmed": "API経路が未確認",
  },
} as const;

function sameRoute(left: RouteIdentity, right: RouteIdentity): boolean {
  return (
    left.providerId === right.providerId &&
    left.offeringId === right.offeringId &&
    left.resourceId === right.resourceId
  );
}

function routeLabel(
  route: RouteIdentity,
  resources: readonly BestFitResourceDiagnostic[],
): string {
  const resource = resources.find(
    (item) => item.routeIdentity !== null && sameRoute(item.routeIdentity, route),
  );
  if (resource) return `${resource.displayName} · ${route.providerId}`;
  if (route.providerId in PROVIDER_CATALOG) {
    const provider = PROVIDER_CATALOG[
      route.providerId as keyof typeof PROVIDER_CATALOG
    ];
    return `${provider.displayName} API · ${route.offeringId}`;
  }
  return `${route.providerId} · ${route.offeringId}`;
}

function scenarioCurrency(
  valueMicroUsd: number,
  numberLocale: string,
): string {
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(fromMicroUsd(valueMicroUsd));
}

function quotaValue(valueMicrounits: number, numberLocale: string): string {
  return new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 6,
  }).format(valueMicrounits / 1_000_000);
}

export function BestFitResults({
  result,
  tasks,
  generatedAt,
}: BestFitResultsProps) {
  const { locale, copy: coreCopy, localeMeta } = useLanguage();
  const copy = BEST_FIT_UI_COPY[locale];
  const { plan } = result;
  const formatMoney = (value: number) =>
    scenarioCurrency(value, localeMeta.numberLocale);
  const formatQuota = (value: number) =>
    quotaValue(value, localeMeta.numberLocale);
  const localizedReason = (reason: string) => {
    if (reason in copy.enums.conditionalReason) {
      return copy.enums.conditionalReason[
        reason as keyof typeof copy.enums.conditionalReason
      ];
    }
    const known = reasonLabels[locale] as Record<string, string>;
    return known[reason] ?? reason;
  };
  const overflow = Object.values(plan.cash.scenarioOverflow).some(Boolean);

  return (
    <section className="rounded-[1.75rem] border border-[#173f31]/12 bg-white/95 p-5 shadow-[0_20px_60px_rgba(28,47,37,0.09)] sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b85331]">
        {copy.results.eyebrow}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#17352a]">
            {copy.results.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#607067]">
            {copy.results.authorityNotice}
          </p>
        </div>
        <div className="rounded-full bg-[#edf4ee] px-3.5 py-2 text-xs font-bold text-[#365649]">
          {copy.results.activeHeldInfeasible(
            plan.activeTaskCount,
            plan.heldTaskCount,
            plan.infeasibleTaskCount,
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [copy.results.totalIncrementalCash, plan.cash.expectedMicroUsd],
          [copy.results.apiSpend, plan.cash.apiMicroUsd.expected],
          [copy.results.newCommitment, plan.cash.subscriptionFeeMicroUsd],
          [copy.results.paidOverage, plan.cash.paidOverageMicroUsd.expected],
        ].map(([label, value]) => (
          <div key={String(label)} className="min-w-0 rounded-2xl border border-[#173f31]/10 bg-[#f6f8f4] p-4">
            <p className="text-xs font-bold text-[#68766e]">{label}</p>
            <p className="mt-1 break-words font-mono text-xl font-bold text-[#173f31]">
              {formatMoney(value as number)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className={`rounded-xl border px-4 py-3 text-sm ${plan.expectedWithinBudget ? "border-[#2f6c55]/20 bg-[#edf5ef] text-[#274d3d]" : "border-[#cf6845]/25 bg-[#fff5ef] text-[#7c331f]"}`}>
          <span className="font-bold">{copy.results.expectedBudgetStatus}: </span>
          {plan.expectedWithinBudget ? copy.results.withinBudget : copy.results.outsideBudget}
        </div>
        <div className={`rounded-xl border px-4 py-3 text-sm ${plan.highExceedsBudget ? "border-[#c88743]/25 bg-[#fff8ec] text-[#71491f]" : "border-[#2f6c55]/20 bg-[#edf5ef] text-[#274d3d]"}`}>
          {plan.highExceedsBudget ? copy.results.highRisk : copy.results.noHighRisk}
        </div>
      </div>

      {plan.spendComparison ? (
        <div className="mt-3 rounded-xl border border-[#173f31]/10 bg-white px-4 py-3 text-sm leading-6 text-[#536159]">
          {plan.spendComparison.avoidedSpendMicroUsd > 0
            ? `${copy.results.avoidedSpend}: ${formatMoney(plan.spendComparison.avoidedSpendMicroUsd)}`
            : `${copy.results.additionalSpend}: ${formatMoney(plan.spendComparison.additionalSpendMicroUsd)}`}
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-[#173f31]/10 bg-white px-4 py-3 text-sm text-[#68766e]">
          {copy.results.noPremiumBaseline}
        </p>
      )}

      {overflow ? (
        <p role="alert" className="mt-3 rounded-xl border border-[#cf6845]/20 bg-[#fff5ef] px-4 py-3 text-sm text-[#7c331f]">
          {copy.results.scenarioOverflow}
        </p>
      ) : null}

      <div className="mt-7 space-y-4">
        {plan.tasks.map((taskResult, index) => {
          const task = tasks.find(({ id }) => id === taskResult.taskId);
          const candidateSet = result.candidateSets.find(
            ({ task: candidateTask }) => candidateTask.id === taskResult.taskId,
          );
          return (
            <article key={taskResult.taskId} className="min-w-0 rounded-2xl border border-[#173f31]/12 bg-[#fbfcf9] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a877f]">
                    {copy.results.taskNumber(index + 1)}
                  </p>
                  <h3 className="mt-1 break-words text-lg font-semibold text-[#233d31]">
                    {task?.name ?? taskResult.taskId}
                  </h3>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${taskResult.status === "active" ? "bg-[#e5f1e8] text-[#2b5b44]" : taskResult.status === "held" ? "bg-[#fff0d6] text-[#7a4b18]" : "bg-[#fde9df] text-[#8a3b25]"}`}>
                  {coreCopy.enums.allocationStatus[taskResult.status]}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3.5 sm:col-span-2">
                  <dt className="text-xs font-bold text-[#68766e]">{copy.results.accessRoute}</dt>
                  <dd className="mt-1 break-words text-sm font-bold text-[#294638]">
                    {taskResult.status === "active"
                      ? routeLabel(taskResult.routeIdentity, result.resourceDiagnostics)
                      : copy.results.noConfirmedRoute}
                  </dd>
                  {taskResult.status === "active" ? (
                    <dd className="mt-1 text-xs text-[#68766e]">
                      {copy.enums.routeKind[taskResult.routeKind]} · {copy.enums.planningTier[taskResult.qualityTier]}
                    </dd>
                  ) : null}
                </div>
                {taskResult.status === "active" ? (
                  <>
                    <div className="rounded-xl bg-white p-3.5">
                      <dt className="text-xs font-bold text-[#68766e]">{copy.results.model}</dt>
                      <dd className="mt-1 text-sm text-[#34443b]">{taskResult.modelId ?? coreCopy.common.none}</dd>
                    </div>
                    <div className="rounded-xl bg-white p-3.5">
                      <dt className="text-xs font-bold text-[#68766e]">{copy.results.taskVariableCash}</dt>
                      <dd className="mt-1 font-mono text-sm font-bold text-[#34443b]">
                        {formatMoney(taskResult.variableCashMicroUsd.low)} / {formatMoney(taskResult.variableCashMicroUsd.expected)} / {formatMoney(taskResult.variableCashMicroUsd.high)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-3.5">
                      <dt className="text-xs font-bold text-[#68766e]">{copy.results.whyEnough}</dt>
                      <dd className="mt-1 text-sm leading-6 text-[#46564d]">{copy.enums.whyEnough[taskResult.whyEnough]}</dd>
                    </div>
                    <div className="rounded-xl bg-white p-3.5">
                      <dt className="text-xs font-bold text-[#68766e]">{copy.results.whyNotPremium}</dt>
                      <dd className="mt-1 text-sm leading-6 text-[#46564d]">{copy.enums.whyNotPremium[taskResult.whyNotPremium]}</dd>
                    </div>
                    <div className="rounded-xl bg-white p-3.5">
                      <dt className="text-xs font-bold text-[#68766e]">{copy.results.upgradeTriggers}</dt>
                      <dd className="mt-1 text-sm leading-6 text-[#46564d]">
                        {taskResult.appliedUpgradeTriggers.length > 0
                          ? taskResult.appliedUpgradeTriggers.map((trigger) => copy.enums.upgradeTrigger[trigger]).join(" · ")
                          : coreCopy.common.none}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-3.5">
                      <dt className="text-xs font-bold text-[#68766e]">{copy.results.alternative}</dt>
                      <dd className="mt-1 break-words text-sm leading-6 text-[#46564d]">
                        {taskResult.alternativeRouteIdentity
                          ? routeLabel(taskResult.alternativeRouteIdentity, result.resourceDiagnostics)
                          : coreCopy.common.none}
                      </dd>
                    </div>
                  </>
                ) : taskResult.status === "held" ? (
                  <div className="rounded-xl bg-white p-3.5 sm:col-span-2">
                    <dt className="text-xs font-bold text-[#68766e]">{copy.results.holdReason}</dt>
                    <dd className="mt-1 text-sm leading-6 text-[#71491f]">{copy.results.holdReasonValue}</dd>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white p-3.5 sm:col-span-2">
                    <dt className="text-xs font-bold text-[#68766e]">{copy.results.infeasibleReason}</dt>
                    <dd className="mt-1 text-sm leading-6 text-[#8a3b25]">{copy.results.infeasibleReasonValue}</dd>
                  </div>
                )}
              </dl>

              {taskResult.conditionalAlternatives.length > 0 ? (
                <div className="mt-4 rounded-xl border border-[#c88743]/20 bg-[#fff8ec] px-4 py-3">
                  <p className="text-sm font-bold text-[#71491f]">
                    {copy.results.conditionalAlternatives}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {taskResult.conditionalAlternatives.map((alternative) => (
                      <li
                        key={`${JSON.stringify(alternative.routeIdentity)}:${JSON.stringify(alternative.fallbackRouteIdentity)}`}
                        className="break-words text-xs leading-5 text-[#6c5437]"
                      >
                        <span className="font-bold">
                          {routeLabel(
                            alternative.routeIdentity,
                            result.resourceDiagnostics,
                          )}
                        </span>
                        <span className="block">
                          {alternative.reasonCodes.map(localizedReason).join(" · ")}
                        </span>
                        <span className="block">
                          {copy.results.alternative}: {routeLabel(
                            alternative.fallbackRouteIdentity,
                            result.resourceDiagnostics,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {candidateSet && candidateSet.excludedRoutes.length > 0 ? (
                <details className="mt-4 rounded-xl border border-[#173f31]/10 bg-white px-4 py-3">
                  <summary className="cursor-pointer text-sm font-bold text-[#46564d]">
                    {copy.results.excludedRoutes} ({candidateSet.excludedRoutes.length})
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {candidateSet.excludedRoutes.map((excluded) => (
                      <li key={JSON.stringify(excluded.routeIdentity)} className="break-words rounded-lg bg-[#f5f7f3] px-3 py-2 text-xs leading-5 text-[#5f6d65]">
                        <span className="font-bold">{routeLabel(excluded.routeIdentity, result.resourceDiagnostics)}</span>
                        <span className="mt-0.5 block">
                          {excluded.reasonCodes.map(localizedReason).join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </article>
          );
        })}
      </div>

      <section className="mt-7 rounded-2xl border border-[#173f31]/10 bg-[#f6f8f4] p-4 sm:p-5">
        <h3 className="font-bold text-[#294638]">{copy.results.subscriptionUsage}</h3>
        {plan.subscriptionUsageLedgers.length === 0 ? (
          <p className="mt-2 text-sm text-[#68766e]">{copy.results.noSubscriptionUsage}</p>
        ) : (
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {plan.subscriptionUsageLedgers.map((ledger) => {
              const { low, expected, high } = ledger.scenarios;
              return (
                <li key={JSON.stringify(ledger.routeIdentity)} className="min-w-0 rounded-xl bg-white p-4 text-xs leading-5 text-[#536159]">
                  <p className="break-words font-bold text-[#294638]">{routeLabel(ledger.routeIdentity, result.resourceDiagnostics)}</p>
                  <p className="mt-1">{copy.results.usageUnit(copy.enums.quotaUnit[ledger.quotaUnit])}</p>
                  <p>{copy.results.usedRange(formatQuota(low.totalDemandMicrounits), formatQuota(expected.totalDemandMicrounits), formatQuota(high.totalDemandMicrounits))}</p>
                  <p>{copy.results.remainingRange(formatQuota(low.remainingIncludedMicrounits), formatQuota(expected.remainingIncludedMicrounits), formatQuota(high.remainingIncludedMicrounits))}</p>
                  <p>{copy.results.overageRange(formatQuota(low.overageUsedMicrounits), formatQuota(expected.overageUsedMicrounits), formatQuota(high.overageUsedMicrounits))}</p>
                  <p className="mt-1 font-mono">{copy.results.tasksUsingRoute(ledger.taskIds.join(", "))}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {result.resourceDiagnostics.length > 0 ? (
        <section className="mt-5 rounded-2xl border border-[#c88743]/20 bg-[#fffaf0] p-4 sm:p-5">
          <h3 className="font-bold text-[#71491f]">{copy.results.resourceDiagnostics}</h3>
          <ul className="mt-3 space-y-2">
            {result.resourceDiagnostics.map((diagnostic) => (
              <li key={diagnostic.uiId} className="rounded-xl bg-white/75 px-3.5 py-3 text-xs leading-5 text-[#6c5437]">
                <span className="font-bold">{diagnostic.displayName}</span>
                <span className="ml-2 rounded-full bg-[#fff0d6] px-2 py-1 font-bold">
                  {diagnostic.status === "invalid"
                    ? copy.resources.invalidStatus
                    : diagnostic.status === "conditional"
                      ? copy.resources.conditionalStatus
                      : coreCopy.common.active}
                </span>
                <span className="mt-1 block">
                  {diagnostic.status === "invalid"
                    ? `${copy.resources.fieldError} (${Object.keys(diagnostic.fieldErrors).join(", ")})`
                    : diagnostic.reasonCodes.map(localizedReason).join(" · ") || copy.resources.conditionalNotice}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-5 text-xs text-[#7a877f]">
        {copy.results.generatedAt(
          new Date(generatedAt).toLocaleString(localeMeta.dateLocale),
        )}
      </p>
    </section>
  );
}

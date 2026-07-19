"use client";

import { useLanguage } from "@/components/language-provider";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import type {
  BudgetAllocationPlan,
  ProviderComparisonSummary,
  ProviderId,
} from "@/types/domain";

interface ReferenceApiPlanSummaryProps {
  plan: BudgetAllocationPlan;
  comparisons: readonly ProviderComparisonSummary[];
  selectedProvider: ProviderId;
  onProviderChange: (providerId: ProviderId) => void;
  onOpenDetails: () => void;
}

export function ReferenceApiPlanSummary({
  plan,
  comparisons,
  selectedProvider,
  onProviderChange,
  onOpenDetails,
}: ReferenceApiPlanSummaryProps) {
  const { locale, copy: coreCopy, localeMeta } = useLanguage();
  const copy = BEST_FIT_UI_COPY[locale].results;
  const formatMoney = (value: number) =>
    new Intl.NumberFormat(localeMeta.numberLocale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);

  return (
    <section
      id="reference-api-plan-summary"
      aria-labelledby="reference-api-plan"
      className="mt-6 rounded-[1.75rem] border border-[#c88743]/25 bg-[#fffaf0] p-5 text-[#17352a] shadow-[0_16px_45px_rgba(65,48,26,0.07)] sm:p-6"
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a65a28]">
        {copy.referenceSummaryEyebrow}
      </p>
      <h2
        id="reference-api-plan"
        tabIndex={-1}
        className="mt-1.5 scroll-mt-6 text-xl font-semibold tracking-[-0.02em] outline-none focus-visible:ring-4 focus-visible:ring-[#c88743]/20 sm:text-2xl"
      >
        {copy.referenceSummaryTitle}
      </h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-[#665f50]">
        {copy.referenceSummaryDescription}
      </p>

      <fieldset className="mt-5">
        <legend className="text-xs font-bold text-[#655b4c]">
          {copy.referenceProviderChoice}
        </legend>
        <select
          aria-label={copy.referenceProviderChoice}
          value={selectedProvider}
          onChange={(event) => onProviderChange(event.target.value as ProviderId)}
          className="mt-2 min-h-11 w-full rounded-xl border border-[#2f6c55]/25 bg-white px-3.5 py-2.5 text-sm font-bold text-[#315b49] outline-none focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 sm:hidden"
        >
          {comparisons.map((comparison) => (
            <option key={comparison.providerId} value={comparison.providerId}>
              {coreCopy.enums.provider[comparison.providerId]} · {formatMoney(
                comparison.totals.expectedUsd,
              )}
            </option>
          ))}
        </select>
        <div className="mt-2 hidden gap-2 sm:grid sm:grid-cols-3">
          {comparisons.map((comparison) => {
            const selected = comparison.providerId === selectedProvider;
            return (
              <button
                key={comparison.providerId}
                type="button"
                aria-pressed={selected}
                onClick={() => onProviderChange(comparison.providerId)}
                className={`min-h-11 rounded-xl border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15 ${
                  selected
                    ? "border-[#2f6c55]/35 bg-[#eaf3ed] text-[#274d3d]"
                    : "border-[#173f31]/10 bg-white text-[#536159] hover:border-[#2f6c55]/25"
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold">
                    {coreCopy.enums.provider[comparison.providerId]}
                  </span>
                  {selected ? (
                    <span className="rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-bold">
                      {coreCopy.common.selected}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block font-mono text-sm font-bold">
                  {formatMoney(comparison.totals.expectedUsd)}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 opacity-75">
                  {copy.referenceIncludedTasks(
                    comparison.activeTaskCount,
                    plan.tasks.length,
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-[#173f31]/10 bg-white px-3.5 py-3">
          <p className="text-xs font-bold text-[#6b746e]">
            {copy.referenceExpectedTotal}
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-[#173f31]">
            {formatMoney(plan.totals.expectedUsd)}
          </p>
        </div>
        <div className="rounded-xl border border-[#173f31]/10 bg-white px-3.5 py-3">
          <p className="text-xs font-bold text-[#6b746e]">
            {copy.referenceIncludedTasks(plan.activeTaskCount, plan.tasks.length)}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#3e584b]">
            {coreCopy.enums.provider[plan.providerId]}
          </p>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 lg:grid-cols-2">
        {plan.tasks.map((task) => (
          <li
            key={task.taskId}
            className="min-w-0 rounded-xl border border-[#173f31]/10 bg-white px-3.5 py-3"
          >
            <p className="break-words text-sm font-bold text-[#294638]">
              {task.taskName}
            </p>
            {task.status === "active" ? (
              <dl className="mt-2 grid grid-cols-2 gap-3 text-xs">
                <div className="min-w-0">
                  <dt className="text-[#6b746e]">{copy.referenceTaskModel}</dt>
                  <dd className="mt-0.5 break-all font-semibold text-[#34443b]">
                    {task.modelId}
                  </dd>
                </div>
                <div className="min-w-0 text-right">
                  <dt className="text-[#6b746e]">
                    {copy.referenceTaskExpectedCost}
                  </dt>
                  <dd className="mt-0.5 break-all font-mono font-bold text-[#34443b]">
                    {formatMoney(task.cost.expected.costUsd)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-xs font-semibold leading-5 text-[#8a5731]">
                {task.status === "held"
                  ? copy.referenceHeldTask
                  : copy.referenceInfeasibleTask}
              </p>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onOpenDetails}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#2f6c55]/20 bg-white px-4 py-2.5 text-sm font-bold text-[#315b49] transition hover:bg-[#edf5ef] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15 sm:w-auto"
      >
        {copy.referenceOpenDetails}
      </button>
    </section>
  );
}

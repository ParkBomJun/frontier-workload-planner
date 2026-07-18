"use client";

import { useLanguage } from "@/components/language-provider";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import type { IncrementalCashBudget } from "@/lib/storage/scenarios";
import { PLANNING_STRATEGIES, type PlanningStrategy } from "@/types/domain";

const FIELD_STATUS_BADGE_CLASS_NAME =
  "inline-flex shrink-0 items-center rounded-full border border-[#173f31]/10 bg-[#edf1ed] px-2 py-0.5 text-[10px] font-bold leading-4 tracking-normal text-[#59675f]";

export interface PlanningFormState {
  budgetUsd: string;
  deadlineDays: string;
  strategy: PlanningStrategy;
}

interface BudgetSettingsProps {
  value: PlanningFormState;
  disabled: boolean;
  showValidation: boolean;
  incrementalCashBudget: IncrementalCashBudget | null;
  onChange: (value: PlanningFormState) => void;
  onConfirmIncrementalCashBudget: () => void;
  onRevokeIncrementalCashBudget: () => void;
}

export function BudgetSettings({
  value,
  disabled,
  showValidation,
  incrementalCashBudget,
  onChange,
  onConfirmIncrementalCashBudget,
  onRevokeIncrementalCashBudget,
}: BudgetSettingsProps) {
  const { locale, copy, localeMeta } = useLanguage();
  const budgetCopy = copy.budgetSettings;
  const bestFitCopy = BEST_FIT_UI_COPY[locale].budget;
  const budget = Number(value.budgetUsd);
  const deadline = Number(value.deadlineDays);
  const budgetInvalid =
    showValidation && (!Number.isFinite(budget) || budget < 0.01 || budget > 10_000);
  const deadlineInvalid =
    showValidation || value.deadlineDays !== ""
      ? !Number.isInteger(deadline) || deadline < 1 || deadline > 90
      : false;

  return (
    <section className="rounded-[1.5rem] border border-[#173f31]/12 bg-white/90 p-5 shadow-[0_18px_50px_rgba(28,47,37,0.08)] sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#748078]">{budgetCopy.eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">{budgetCopy.title}</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
        <label htmlFor="budget-usd" className="block">
          <span className="mb-2 flex flex-wrap items-center gap-1.5 text-sm font-bold text-[#34443b]">
            <span>{bestFitCopy.label}</span>
            <span className={FIELD_STATUS_BADGE_CLASS_NAME}>
              {copy.common.required}
            </span>
          </span>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-[#607067]">
              $
            </span>
            <input
              id="budget-usd"
              type="number"
              inputMode="decimal"
              min="0.01"
              max="10000"
              step="0.01"
              value={value.budgetUsd}
              required
              onChange={(event) => onChange({ ...value, budgetUsd: event.target.value })}
              disabled={disabled}
              aria-invalid={budgetInvalid}
              aria-describedby={budgetInvalid ? "budget-usd-error" : "budget-usd-help"}
              className="w-full rounded-xl border border-[#173f31]/15 bg-[#fbfcf9] py-3 pl-8 pr-4 text-[15px] outline-none transition focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:opacity-60 aria-[invalid=true]:border-[#c65f3d]"
            />
          </div>
          <span id="budget-usd-help" className="mt-1.5 block text-balance text-xs leading-5 text-[#68766e]">
            {bestFitCopy.help}
          </span>
          {budgetInvalid ? (
            <span id="budget-usd-error" className="mt-1 block text-sm text-[#a6452a]">
              {budgetCopy.budgetError}
            </span>
          ) : null}
        </label>

        <label htmlFor="deadline-days" className="block">
          <span className="mb-2 flex flex-wrap items-center gap-1.5 text-sm font-bold text-[#34443b]">
            <span>{budgetCopy.deadlineLabel}</span>
            <span className={FIELD_STATUS_BADGE_CLASS_NAME}>
              {copy.common.required}
            </span>
          </span>
          <div className="relative">
            <input
              id="deadline-days"
              type="number"
              inputMode="numeric"
              min="1"
              max="90"
              step="1"
              value={value.deadlineDays}
              required
              onChange={(event) => onChange({ ...value, deadlineDays: event.target.value })}
              disabled={disabled}
              aria-invalid={deadlineInvalid}
              aria-describedby={deadlineInvalid ? "deadline-days-error" : "deadline-days-help"}
              className="w-full rounded-xl border border-[#173f31]/15 bg-[#fbfcf9] px-4 py-3 pr-12 text-[15px] outline-none transition focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:opacity-60 aria-[invalid=true]:border-[#c65f3d]"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#607067]">
              {budgetCopy.deadlineUnit}
            </span>
          </div>
          <span id="deadline-days-help" className="mt-1.5 block text-balance text-xs leading-5 text-[#68766e]">
            {budgetCopy.deadlineHelp}
          </span>
          {deadlineInvalid ? (
            <span id="deadline-days-error" className="mt-1 block text-sm text-[#a6452a]">
              {budgetCopy.deadlineError}
            </span>
          ) : null}
        </label>
      </div>

      <div
        className={`mt-4 rounded-xl border px-4 py-3 ${
          incrementalCashBudget?.status === "confirmed"
            ? "border-[#2f6c55]/20 bg-[#edf5ef] text-[#274d3d]"
            : "border-[#c88743]/25 bg-[#fff8ec] text-[#71491f]"
        }`}
      >
        <p className="text-sm font-bold">
          {incrementalCashBudget?.status === "confirmed"
            ? bestFitCopy.confirmedTitle
            : bestFitCopy.unconfirmedTitle}
        </p>
        <p className="mt-1 text-xs leading-5">
          {incrementalCashBudget?.status === "confirmed"
            ? bestFitCopy.confirmedDescription(
                new Date(incrementalCashBudget.confirmedAt).toLocaleString(
                  localeMeta.dateLocale,
                ),
              )
            : bestFitCopy.unconfirmedDescription}
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={
            incrementalCashBudget?.status === "confirmed"
              ? onRevokeIncrementalCashBudget
              : onConfirmIncrementalCashBudget
          }
          className="mt-3 min-h-11 rounded-xl border border-current/20 bg-white/55 px-3.5 py-2 text-xs font-bold transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {incrementalCashBudget?.status === "confirmed"
            ? bestFitCopy.revoke
            : bestFitCopy.confirm}
        </button>
      </div>

      <label htmlFor="planning-strategy" className="mt-4 block">
        <span className="mb-2 flex flex-wrap items-center gap-1.5 text-sm font-bold text-[#34443b]">
          <span>{budgetCopy.strategyLegend}</span>
          <span className={FIELD_STATUS_BADGE_CLASS_NAME}>
            {copy.common.optional} · {copy.common.defaultValue}
          </span>
        </span>
        <select
          id="planning-strategy"
          value={value.strategy}
          onChange={(event) =>
            onChange({
              ...value,
              strategy: event.target.value as PlanningStrategy,
            })
          }
          disabled={disabled}
          className="min-h-11 w-full rounded-xl border border-[#173f31]/15 bg-[#fbfcf9] px-3.5 py-2.5 text-sm font-bold text-[#294638] outline-none transition focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:opacity-60"
        >
          {PLANNING_STRATEGIES.map((strategy) => (
            <option key={strategy} value={strategy}>
              {budgetCopy.strategies[strategy].label}
            </option>
          ))}
        </select>
        <span className="mt-1.5 block text-xs leading-5 text-[#66736b]">
          {budgetCopy.strategies[value.strategy].description}
        </span>
      </label>
    </section>
  );
}

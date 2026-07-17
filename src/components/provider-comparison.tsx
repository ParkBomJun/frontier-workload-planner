"use client";

import { PROVIDER_CATALOG } from "@/config/provider-catalog";
import type { UiCopy } from "@/lib/i18n/ui-copy";
import {
  PROVIDER_IDS,
  type AnalysisMode,
  type ProviderComparisonSummary,
  type ProviderId,
} from "@/types/domain";

import { useLanguage } from "./language-provider";

export interface ProviderComparisonProps {
  comparisons: ProviderComparisonSummary[];
  selectedProvider: ProviderId;
  onSelect: (providerId: ProviderId) => void;
  formatCurrency: (value: number) => string;
  analysisMode: AnalysisMode;
  disabled?: boolean;
}

function budgetFitLabel(comparison: ProviderComparisonSummary, copy: UiCopy): string {
  if (!comparison.expectedWithinBudget) return copy.providerComparison.outsideBudget;
  if (comparison.heldTaskCount > 0) return copy.providerComparison.fitsWithHolds;
  return copy.providerComparison.allWorkFits;
}

function formatPlainDate(value: string, dateLocale: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(dateLocale, { timeZone: "UTC" });
}

function catalogNotes(
  providerId: ProviderId,
  copy: UiCopy,
  dateLocale: string,
  numberLocale: string,
): string[] {
  const models = Object.values(PROVIDER_CATALOG[providerId].models);
  const notes: string[] = [];
  const previewCount = models.filter((model) => model.preview).length;
  const limitedPrice = models.find((model) => model.effectiveThrough);
  const inputLimited = models.find((model) => model.standardPriceInputLimitTokens);

  if (previewCount > 0) {
    notes.push(copy.providerComparison.previewModels(previewCount));
  }
  if (limitedPrice?.effectiveThrough) {
    notes.push(
      copy.providerComparison.priceEffectiveThrough(
        limitedPrice.displayName,
        formatPlainDate(limitedPrice.effectiveThrough, dateLocale),
      ),
    );
  }
  if (inputLimited?.standardPriceInputLimitTokens) {
    notes.push(
      copy.providerComparison.standardPriceInputLimit(
        inputLimited.displayName,
        `${(inputLimited.standardPriceInputLimitTokens / 1_000).toLocaleString(numberLocale)}K`,
      ),
    );
  }

  return notes;
}

export function ProviderComparison({
  comparisons,
  selectedProvider,
  onSelect,
  formatCurrency,
  analysisMode,
  disabled = false,
}: ProviderComparisonProps) {
  const { copy, localeMeta } = useLanguage();
  const comparisonByProvider = new Map(
    comparisons.map((comparison) => [comparison.providerId, comparison]),
  );

  return (
    <section
      aria-labelledby="provider-comparison-title"
      className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.055] p-4 sm:p-5"
    >
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#9ed0b8]">
          {copy.providerComparison.eyebrow}
        </p>
        <h3 id="provider-comparison-title" className="mt-1 text-lg font-semibold text-white">
          {copy.providerComparison.title}
        </h3>
        <p className="mt-2 text-xs leading-5 text-white/70">
          {copy.providerComparison.analysisExplanation[analysisMode]}
        </p>
      </div>

      <div
        id="provider-comparison-basis"
        className="mt-4 rounded-xl border border-[#e9b082]/25 bg-[#e9b082]/10 p-3.5 text-xs leading-5 text-[#ffe4d1]"
      >
        <p className="font-bold">{copy.providerComparison.scopeTitle}</p>
        <ul className="mt-1.5 space-y-1 text-white/75">
          <li>• {copy.providerComparison.heuristicNotice}</li>
          <li>• {copy.providerComparison.noQualityRanking}</li>
          <li>• {copy.providerComparison.standardPricingNotice}</li>
          <li>• {copy.providerComparison.activeOnlyNotice}</li>
        </ul>
      </div>

      <fieldset className="mt-4 min-w-0">
        <legend className="sr-only">{copy.providerComparison.selectorLegend}</legend>
        <div className="grid min-w-0 gap-3 lg:grid-cols-3">
          {PROVIDER_IDS.map((providerId) => {
            const comparison = comparisonByProvider.get(providerId);
            if (!comparison) return null;

            const provider = PROVIDER_CATALOG[providerId];
            const selected = selectedProvider === providerId;
            const notes = catalogNotes(
              providerId,
              copy,
              localeMeta.dateLocale,
              localeMeta.numberLocale,
            );
            const fitLabel = budgetFitLabel(comparison, copy);

            return (
              <label key={providerId} className="block min-w-0 cursor-pointer">
                <input
                  type="radio"
                  name="provider-family"
                  value={providerId}
                  checked={selected}
                  onChange={() => onSelect(providerId)}
                  disabled={disabled}
                  aria-describedby="provider-comparison-basis"
                  aria-label={`${copy.common.select} ${copy.enums.provider[providerId]}`}
                  className="peer sr-only"
                />
                <span
                  data-provider-id={providerId}
                  data-selected-provider={selected ? "true" : "false"}
                  className="flex min-h-11 min-w-0 flex-col rounded-2xl border border-white/10 bg-black/10 p-4 transition hover:border-white/25 hover:bg-white/[0.07] peer-checked:border-[#9ed0b8]/55 peer-checked:bg-[#9ed0b8]/10 peer-focus-visible:ring-4 peer-focus-visible:ring-[#9ed0b8]/25 peer-disabled:cursor-not-allowed peer-disabled:opacity-55"
                >
                  <span className="flex min-w-0 items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white">{provider.displayName}</span>
                      <span className="mt-0.5 block text-xs text-white/65">
                        {provider.productFamily}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${
                        comparison.expectedWithinBudget
                          ? comparison.heldTaskCount > 0
                            ? "bg-[#e9b082]/18 text-[#ffd7b7]"
                            : "bg-[#9ed0b8]/18 text-[#d9ebe1]"
                          : "bg-[#ef8664]/20 text-[#ffd2c4]"
                      }`}
                    >
                      {fitLabel}
                    </span>
                  </span>

                  <span className="mt-3 block break-words text-[0.7rem] leading-5 text-white/55">
                    {Object.values(provider.models)
                      .map((model) => model.displayName)
                      .join(" · ")}
                  </span>

                  <span className="mt-4 grid min-w-0 grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10">
                    {(
                      [
                        ["Low", comparison.totals.lowUsd],
                        ["Expected", comparison.totals.expectedUsd],
                        ["High", comparison.totals.highUsd],
                      ] as const
                    ).map(([label, value]) => (
                      <span key={label} className="min-w-0 bg-[#1b4a39] px-2 py-2.5">
                        <span className="block truncate text-[0.65rem] text-white/60">{label}</span>
                        <span className="mt-1 block break-all font-mono text-[0.72rem] font-bold text-white">
                          {formatCurrency(value)}
                        </span>
                        {label === "High" && comparison.highExceedsBudget ? (
                          <span className="mt-1 block text-[0.62rem] font-bold text-[#ffd2c4]">
                            {copy.providerComparison.highExceeds}
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </span>

                  <span className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
                    <span>
                      {copy.providerComparison.activeHeld(
                        comparison.activeTaskCount,
                        comparison.heldTaskCount,
                      )}
                    </span>
                    <span className="font-bold text-[#b9ddc9]">
                      {selected
                        ? copy.providerComparison.selectedPlan
                        : copy.providerComparison.selectPlan}
                    </span>
                  </span>

                  {notes.length > 0 ? (
                    <span className="mt-3 block space-y-1 border-t border-white/10 pt-3">
                      {notes.map((note) => (
                        <span
                          key={note}
                          className="block rounded-lg bg-[#e9b082]/10 px-2.5 py-1.5 text-[0.68rem] leading-4 text-[#ffd7b7]"
                        >
                          {note}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}

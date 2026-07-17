"use client";

import {
  PROVIDER_CATALOG,
  PROVIDER_PRICING_BASIS,
  PROVIDER_PRICING_EXCLUSIONS,
  type ProviderModelPrice,
} from "@/config/provider-catalog";
import type { UiCopy } from "@/lib/i18n/ui-copy";
import { MODEL_TIERS, PROVIDER_IDS } from "@/types/domain";

import { useLanguage } from "./language-provider";

function formatPlainDate(value: string, dateLocale: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(dateLocale, { timeZone: "UTC" });
}

function modelNotes(
  model: ProviderModelPrice,
  copy: UiCopy,
  dateLocale: string,
  numberLocale: string,
): string[] {
  const notes: string[] = [];

  if (model.preview) notes.push(copy.providerPricing.preview);
  if (model.effectiveThrough) {
    notes.push(copy.providerPricing.priceThrough(formatPlainDate(model.effectiveThrough, dateLocale)));
  }
  if (model.priceAfterEffectiveThrough) {
    notes.push(
      copy.providerPricing.priceFrom(
        formatPlainDate(model.priceAfterEffectiveThrough.effectiveFrom, dateLocale),
        model.priceAfterEffectiveThrough.inputUsdPerMillion,
        model.priceAfterEffectiveThrough.outputUsdPerMillion,
      ),
    );
  }
  if (model.standardPriceInputLimitTokens) {
    notes.push(
      copy.providerPricing.inputLimit(
        `${(model.standardPriceInputLimitTokens / 1_000).toLocaleString(numberLocale)}K`,
      ),
    );
  }
  if (model.excludedLongContextPrice) {
    notes.push(
      copy.providerPricing.longContextExcluded(
        model.excludedLongContextPrice.inputUsdPerMillion,
        model.excludedLongContextPrice.outputUsdPerMillion,
      ),
    );
  }

  return notes;
}

export function ProviderPricingAssumptions() {
  const { copy, localeMeta } = useLanguage();
  const priceFormatter = new Intl.NumberFormat(localeMeta.numberLocale, {
    maximumFractionDigits: 2,
  });

  return (
    <details className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-4">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-[#d9ebe1] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/10">
        {copy.providerPricing.summary}
      </summary>

      <p className="mt-3 text-xs leading-5 text-white/70">
        {copy.providerPricing.introduction(PROVIDER_PRICING_BASIS.replaceAll("-", " "))}
      </p>

      <div
        role="region"
        aria-label={copy.providerPricing.tableCaption}
        tabIndex={0}
        className="mt-4 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/10"
      >
        <table className="w-full min-w-[780px] text-left text-xs">
          <caption className="sr-only">{copy.providerPricing.tableCaption}</caption>
          <thead className="bg-white/[0.06] text-white/65">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {copy.providerPricing.providerColumn}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {copy.providerPricing.tierColumn}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {copy.providerPricing.modelColumn}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                {copy.providerPricing.inputColumn}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                {copy.providerPricing.outputColumn}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {copy.providerPricing.conditionsColumn}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-white/75">
            {PROVIDER_IDS.flatMap((providerId) => {
              const provider = PROVIDER_CATALOG[providerId];
              return MODEL_TIERS.map((tier) => {
                const model = provider.models[tier];
                const notes = modelNotes(
                  model,
                  copy,
                  localeMeta.dateLocale,
                  localeMeta.numberLocale,
                );

                return (
                  <tr key={`${providerId}-${tier}`}>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="font-bold text-white/85">{provider.displayName}</span>
                      <span className="ml-1 text-white/50">· {provider.productFamily}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{copy.enums.modelTier[tier]}</td>
                    <th scope="row" className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-white/90">
                      {model.displayName}
                    </th>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono">
                      ${priceFormatter.format(model.inputUsdPerMillion)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono">
                      ${priceFormatter.format(model.outputUsdPerMillion)}
                    </td>
                    <td className="min-w-64 px-3 py-3 leading-5">
                      {notes.length > 0 ? notes.join(" · ") : copy.providerPricing.standardPrice}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[0.68rem] leading-5 text-white/55 sm:hidden">
        {copy.providerPricing.scrollHint}
      </p>

      <div className="mt-4 rounded-xl border border-[#e9b082]/20 bg-[#e9b082]/[0.07] p-3.5">
        <p className="text-xs font-bold text-[#ffe4d1]">{copy.providerPricing.excludedTitle}</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5 text-[0.68rem] text-white/70">
          {PROVIDER_PRICING_EXCLUSIONS.map((exclusion) => (
            <li key={exclusion} className="rounded-full bg-white/[0.07] px-2.5 py-1">
              {copy.providerPricing.exclusions[exclusion]}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs leading-5 text-white/65">
          {copy.providerPricing.excludedLongContextExplanation}
        </p>
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-bold text-[#d9ebe1]">{copy.providerPricing.sourcesTitle}</h4>
        <ul className="mt-2 space-y-3 text-xs leading-5 text-white/65">
          {PROVIDER_IDS.map((providerId) => {
            const provider = PROVIDER_CATALOG[providerId];
            return (
              <li key={providerId} className="min-w-0">
                <span className="font-bold text-white/80">
                  {provider.displayName} ·{" "}
                  {copy.common.verifiedAt(
                    formatPlainDate(provider.verifiedAt, localeMeta.dateLocale),
                  )}
                </span>
                <span className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1">
                  <a
                    href={provider.pricingSource}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all font-bold text-[#b9ddc9] underline decoration-[#b9ddc9]/40 underline-offset-4 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white/10"
                  >
                    {copy.common.officialPricingSource}
                  </a>
                  <a
                    href={provider.modelsSource}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all font-bold text-[#b9ddc9] underline decoration-[#b9ddc9]/40 underline-offset-4 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white/10"
                  >
                    {copy.common.officialModelsSource}
                  </a>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

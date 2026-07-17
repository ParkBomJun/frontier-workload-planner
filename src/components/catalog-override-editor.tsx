"use client";

import { useMemo, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import { PROVIDER_CATALOG } from "@/config/provider-catalog";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import {
  catalogOverrideTargetFor,
  restoreApiCatalogDefaults,
  upsertApiCatalogOverride,
} from "@/lib/offerings/catalog-overrides";
import { resolveApiStandardTextPrice } from "@/lib/offerings/api-price-resolver";
import {
  MODEL_TIERS,
  PROVIDER_IDS,
  type ModelTier,
  type ProviderId,
} from "@/types/domain";
import type { PlanningQualityTier } from "@/types/offerings";
import type { ApiCatalogOverride } from "@/types/pricing";

const inputClass =
  "min-h-11 w-full rounded-xl border border-[#173f31]/15 bg-[#fbfcf9] px-3.5 py-2.5 text-sm outline-none transition focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:opacity-55";

interface CatalogOverrideEditorProps {
  overrides: readonly ApiCatalogOverride[];
  pricingAsOf: string;
  disabled: boolean;
  onChange: (overrides: readonly ApiCatalogOverride[], changedAt: string) => void;
}

type Feedback = "applied" | "restored" | "invalid" | null;

function matchesTarget(
  override: ApiCatalogOverride,
  providerId: ProviderId,
  tier: ModelTier,
): boolean {
  const target = catalogOverrideTargetFor(providerId, tier);
  return (
    override.target.registryId === target.registryId &&
    override.target.registryVersion === target.registryVersion &&
    override.target.entryId === target.entryId
  );
}

export function CatalogOverrideEditor({
  overrides,
  pricingAsOf,
  disabled,
  onChange,
}: CatalogOverrideEditorProps) {
  const { locale } = useLanguage();
  const copy = BEST_FIT_UI_COPY[locale];
  const [providerId, setProviderId] = useState<ProviderId>("openai");
  const [tier, setTier] = useState<ModelTier>("economy");
  const [planningTier, setPlanningTier] = useState<PlanningQualityTier | "">("");
  const [inputPrice, setInputPrice] = useState("");
  const [outputPrice, setOutputPrice] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(pricingAsOf);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const official = useMemo(
    () =>
      resolveApiStandardTextPrice({
        providerId,
        tier,
        pricingAsOf,
        perInvocationInputTokens: { low: 0, expected: 0, high: 0 },
      }),
    [pricingAsOf, providerId, tier],
  );
  const officialValue = official.status === "resolved" ? official.officialDefault : null;
  const selectedOverride = overrides.find((override) =>
    matchesTarget(override, providerId, tier),
  );

  function resetEditor(nextProvider = providerId, nextTier = tier) {
    const existing = overrides.find((override) =>
      matchesTarget(override, nextProvider, nextTier),
    );
    setPlanningTier(existing?.planningTier ?? "");
    setInputPrice(
      existing?.standardTextPrice?.inputUsdPerMillion.toString() ?? "",
    );
    setOutputPrice(
      existing?.standardTextPrice?.outputUsdPerMillion.toString() ?? "",
    );
    setEffectiveFrom(existing?.effectiveFrom ?? pricingAsOf);
    setFeedback(null);
  }

  function applyOverride() {
    const hasInput = inputPrice.trim() !== "";
    const hasOutput = outputPrice.trim() !== "";
    if (hasInput !== hasOutput) {
      setFeedback("invalid");
      return;
    }
    const standardTextPrice =
      hasInput && hasOutput
        ? {
            inputUsdPerMillion: Number(inputPrice),
            outputUsdPerMillion: Number(outputPrice),
          }
        : undefined;
    const recordedAt = new Date().toISOString();
    const result = upsertApiCatalogOverride(overrides, {
      kind: "api-catalog-override",
      provenance: "user-supplied",
      target: catalogOverrideTargetFor(providerId, tier),
      effectiveFrom,
      recordedAt,
      ...(planningTier === "" ? {} : { planningTier }),
      ...(standardTextPrice === undefined ? {} : { standardTextPrice }),
    });
    if (!result.ok) {
      setFeedback("invalid");
      return;
    }
    onChange(result.overrides, recordedAt);
    setFeedback("applied");
  }

  function restoreDefault() {
    const changedAt = new Date().toISOString();
    const result = restoreApiCatalogDefaults(
      overrides,
      catalogOverrideTargetFor(providerId, tier),
    );
    if (!result.ok) {
      setFeedback("invalid");
      return;
    }
    onChange(result.overrides, changedAt);
    setPlanningTier("");
    setInputPrice("");
    setOutputPrice("");
    setEffectiveFrom(pricingAsOf);
    setFeedback("restored");
  }

  return (
    <section className="mt-6 rounded-[1.75rem] border border-[#173f31]/12 bg-white/90 p-5 shadow-[0_18px_50px_rgba(28,47,37,0.08)] sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b85331]">
        {copy.overrides.eyebrow}
      </p>
      <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#17352a]">
            {copy.overrides.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#607067]">
            {copy.overrides.description}
          </p>
        </div>
        <div className="space-y-2 text-xs leading-5">
          <p className="rounded-xl border border-[#c88743]/20 bg-[#fff8ec] px-4 py-3 text-[#71491f]">
            {copy.overrides.sessionOnly}
          </p>
          <p className="rounded-xl border border-[#173f31]/10 bg-[#f5f7f3] px-4 py-3 text-[#536159]">
            {copy.overrides.accessBoundary}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label>
          <span className="mb-1.5 block text-xs font-bold text-[#46564d]">{copy.overrides.providerLabel}</span>
          <select
            value={providerId}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value as ProviderId;
              setProviderId(next);
              resetEditor(next, tier);
            }}
            className={inputClass}
          >
            {PROVIDER_IDS.map((id) => (
              <option key={id} value={id}>{PROVIDER_CATALOG[id].displayName}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-bold text-[#46564d]">{copy.overrides.catalogTierLabel}</span>
          <select
            value={tier}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value as ModelTier;
              setTier(next);
              resetEditor(providerId, next);
            }}
            className={inputClass}
          >
            {MODEL_TIERS.map((value) => (
              <option key={value} value={value}>
                {PROVIDER_CATALOG[providerId].models[value].displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-bold text-[#46564d]">{copy.overrides.planningTierLabel}</span>
          <select
            value={planningTier}
            disabled={disabled}
            onChange={(event) =>
              setPlanningTier(event.target.value as PlanningQualityTier | "")
            }
            className={inputClass}
          >
            <option value="">{copy.overrides.keepDefaultTier}</option>
            {(["economy", "balanced", "premium"] as const).map((value) => (
              <option key={value} value={value}>{copy.enums.planningTier[value]}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-bold text-[#46564d]">{copy.overrides.inputPriceLabel}</span>
          <input
            type="number"
            min="0"
            step="0.000001"
            inputMode="decimal"
            value={inputPrice}
            placeholder={officialValue?.standardTextPrice.inputUsdPerMillion.toString()}
            disabled={disabled}
            onChange={(event) => setInputPrice(event.target.value)}
            className={inputClass}
          />
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-bold text-[#46564d]">{copy.overrides.outputPriceLabel}</span>
          <input
            type="number"
            min="0"
            step="0.000001"
            inputMode="decimal"
            value={outputPrice}
            placeholder={officialValue?.standardTextPrice.outputUsdPerMillion.toString()}
            disabled={disabled}
            onChange={(event) => setOutputPrice(event.target.value)}
            className={inputClass}
          />
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-bold text-[#46564d]">{copy.overrides.effectiveFromLabel}</span>
          <input
            type="date"
            value={effectiveFrom}
            disabled={disabled}
            onChange={(event) => setEffectiveFrom(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <p className="mt-4 rounded-xl border border-[#173f31]/10 bg-[#f5f7f3] px-4 py-3 text-xs leading-5 text-[#536159]">
        {copy.overrides.officialDefault}: {PROVIDER_CATALOG[providerId].models[tier].displayName} · {copy.enums.planningTier[officialValue?.planningTier ?? "economy"]} · ${officialValue?.standardTextPrice.inputUsdPerMillion ?? "—"} / ${officialValue?.standardTextPrice.outputUsdPerMillion ?? "—"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={applyOverride}
          className="min-h-11 rounded-xl bg-[#173f31] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#205541] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20 disabled:opacity-50"
        >
          {copy.overrides.apply}
        </button>
        <button
          type="button"
          disabled={disabled || selectedOverride === undefined}
          onClick={restoreDefault}
          className="min-h-11 rounded-xl border border-[#173f31]/15 px-4 py-2.5 text-sm font-bold text-[#365649] transition hover:bg-[#edf4ee] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15 disabled:opacity-45"
        >
          {copy.overrides.restore}
        </button>
      </div>
      {feedback ? (
        <p
          role="status"
          className={`mt-3 text-sm ${feedback === "invalid" ? "text-[#9a4228]" : "text-[#2f6c55]"}`}
        >
          {copy.overrides[feedback]}
        </p>
      ) : null}

      <div className="mt-5 border-t border-[#173f31]/10 pt-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#68766e]">
          {copy.overrides.active}
        </p>
        {overrides.length === 0 ? (
          <p className="mt-2 text-sm text-[#68766e]">{copy.overrides.none}</p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {overrides.map((override) => {
              const entry = PROVIDER_IDS.flatMap((id) =>
                MODEL_TIERS.map((modelTier) => ({ id, modelTier })),
              ).find(({ id, modelTier }) => matchesTarget(override, id, modelTier));
              return (
                <li key={JSON.stringify(override.target)} className="rounded-xl bg-[#edf4ee] px-3.5 py-3 text-xs leading-5 text-[#365649]">
                  <span className="font-bold">
                    {entry
                      ? `${PROVIDER_CATALOG[entry.id].displayName} · ${PROVIDER_CATALOG[entry.id].models[entry.modelTier].displayName}`
                      : override.target.entryId}
                  </span>
                  <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 font-bold">
                    {copy.overrides.userSupplied}
                  </span>
                  <span className="mt-1 block">
                    {override.planningTier
                      ? copy.enums.planningTier[override.planningTier]
                      : copy.overrides.keepDefaultTier}
                    {override.standardTextPrice
                      ? ` · $${override.standardTextPrice.inputUsdPerMillion} / $${override.standardTextPrice.outputUsdPerMillion}`
                      : ""}
                    {` · ${override.effectiveFrom}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

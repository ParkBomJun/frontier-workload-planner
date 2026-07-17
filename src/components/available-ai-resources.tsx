"use client";

import {
  getSubscriptionPreset,
  SUBSCRIPTION_PRESETS,
  type SubscriptionPresetId,
} from "@/config/subscription-presets";
import { useLanguage } from "@/components/language-provider";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import { adaptAvailableAiResourceDraft } from "@/lib/planning/resource-drafts";
import type {
  AvailableAiResourceDraft,
  AvailableAiResourceEvidenceObservedAt,
  AvailableAiResourceQuotaDraft,
  AvailableAiResourceResetDraft,
} from "@/types/resource-drafts";
import {
  SUBSCRIPTION_AVAILABILITY_STATUSES,
  SUBSCRIPTION_CONSUMPTION_BASES,
  SUBSCRIPTION_OWNERSHIPS,
} from "@/types/subscriptions";
import { WORK_SURFACES } from "@/types/offerings";

const MAX_RESOURCES = 4;
const inputClass =
  "min-h-11 w-full rounded-xl border border-[#173f31]/15 bg-[#fbfcf9] px-3.5 py-2.5 text-sm outline-none transition focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:opacity-55";

type RangedQuotaDraft = Exclude<
  AvailableAiResourceQuotaDraft,
  { kind: "opaque" }
>;

interface AvailableAiResourcesProps {
  drafts: readonly AvailableAiResourceDraft[];
  evidenceObservedAtById: Readonly<
    Record<string, AvailableAiResourceEvidenceObservedAt>
  >;
  disabled: boolean;
  onAdd: (presetId: SubscriptionPresetId) => void;
  onChange: (uiId: string, draft: AvailableAiResourceDraft) => void;
  onRemove: (uiId: string) => void;
}

function quotaForKind(
  kind: AvailableAiResourceQuotaDraft["kind"],
): AvailableAiResourceQuotaDraft {
  if (kind === "opaque") return { kind, description: "" };
  if (kind === "calibrated") {
    return {
      kind,
      remainingPercent: "",
      consumption: { basis: "task", low: "", expected: "", high: "", sampleSize: "" },
    };
  }
  return {
    kind,
    unit: "credit",
    included: "",
    remaining: "",
    consumption: { basis: "task", low: "", expected: "", high: "", sampleSize: "" },
  };
}

function resetForKind(
  kind: AvailableAiResourceResetDraft["kind"],
): AvailableAiResourceResetDraft {
  if (kind === "fixed") return { kind, cadenceDays: "", nextResetAt: "" };
  if (kind === "rolling") return { kind, windowHours: "" };
  return { kind };
}

function updateRangedConsumption(
  quota: RangedQuotaDraft | null,
  patch: Partial<RangedQuotaDraft["consumption"]>,
): RangedQuotaDraft {
  const consumption = {
    ...(quota?.consumption ?? {
      basis: "task" as const,
      low: "",
      expected: "",
      high: "",
      sampleSize: "",
    }),
    ...patch,
  };
  return quota?.kind === "metered"
    ? { ...quota, consumption }
    : {
        kind: "calibrated",
        remainingPercent: quota?.remainingPercent ?? "",
        consumption,
      };
}

export function AvailableAiResources({
  drafts,
  evidenceObservedAtById,
  disabled,
  onAdd,
  onChange,
  onRemove,
}: AvailableAiResourcesProps) {
  const { locale } = useLanguage();
  const copy = BEST_FIT_UI_COPY[locale];
  const usedPresets = new Set(drafts.map(({ preset }) => preset.id));

  return (
    <section className="mt-8 rounded-[1.75rem] border border-[#173f31]/12 bg-white/90 p-5 shadow-[0_18px_50px_rgba(28,47,37,0.08)] sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b85331]">
        {copy.resources.eyebrow}
      </p>
      <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)] lg:items-start">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#17352a]">
            {copy.resources.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#607067]">
            {copy.resources.description}
          </p>
        </div>
        <p className="rounded-xl border border-[#c88743]/20 bg-[#fff8ec] px-4 py-3 text-xs leading-5 text-[#71491f]">
          {copy.resources.sessionOnly}
        </p>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-bold text-[#34443b]">{copy.resources.addLegend}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SUBSCRIPTION_PRESETS.map((preset) => {
            const content = copy.resources.presets[preset.id];
            const unavailable = usedPresets.has(preset.id) || drafts.length >= MAX_RESOURCES;
            return (
              <button
                key={preset.id}
                id={`add-resource-${preset.id}`}
                type="button"
                disabled={disabled || unavailable}
                onClick={() => onAdd(preset.id)}
                className="min-h-11 rounded-xl border border-[#173f31]/12 bg-[#f5f7f3] px-3.5 py-3 text-left transition hover:border-[#2f6c55]/35 hover:bg-[#edf4ee] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label={copy.resources.addPreset(content.name)}
              >
                <span className="block text-sm font-bold text-[#294638]">{content.name}</span>
                <span className="mt-1 block text-xs leading-5 text-[#66736b]">
                  {content.description}
                </span>
              </button>
            );
          })}
        </div>
        {drafts.length >= MAX_RESOURCES ? (
          <p className="mt-2 text-xs text-[#7a5b36]">{copy.resources.maximumReached}</p>
        ) : null}
      </fieldset>

      {drafts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#173f31]/18 bg-[#f8f9f6] p-6 text-center">
          <p className="font-bold text-[#34443b]">{copy.resources.emptyTitle}</p>
          <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-[#68766e]">
            {copy.resources.emptyDescription}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {drafts.map((draft, index) => {
            const preset = getSubscriptionPreset(draft.preset.id);
            const adapted = adaptAvailableAiResourceDraft(draft, {
              evidenceObservedAt:
                evidenceObservedAtById[draft.uiId] ?? {
                  availability: "",
                  commitment: "",
                  quota: "",
                  reset: "",
                  offering: "",
                },
            });
            const forceOpaque =
              draft.ownership === "candidate-new" || preset?.quotaInput.kind === "opaque";
            const forceMetered = preset?.quotaInput.kind === "user-supplied-metered";
            const forceRolling = preset?.quotaInput.kind === "user-supplied-rolling";
            const quotaKinds: AvailableAiResourceQuotaDraft["kind"][] = forceOpaque
              ? ["opaque"]
              : forceMetered
                ? ["metered"]
                : ["opaque", "metered", "calibrated"];
            const resetKinds: AvailableAiResourceResetDraft["kind"][] = forceRolling
              ? ["rolling"]
              : ["unknown", "none", "fixed", "rolling"];
            const fieldErrorIds = Object.keys(
              adapted.success ? {} : adapted.fieldErrors,
            ).join(", ");
            const opaqueQuota = draft.quota.kind === "opaque" ? draft.quota : null;
            const meteredQuota = draft.quota.kind === "metered" ? draft.quota : null;
            const calibratedQuota =
              draft.quota.kind === "calibrated" ? draft.quota : null;
            const rangedQuota = meteredQuota ?? calibratedQuota;
            const fixedReset = draft.reset.kind === "fixed" ? draft.reset : null;
            const rollingReset = draft.reset.kind === "rolling" ? draft.reset : null;

            return (
              <fieldset
                key={draft.uiId}
                className="min-w-0 rounded-2xl border border-[#173f31]/12 bg-[#f8faf7] p-4 sm:p-5"
              >
                <legend className="sr-only">{copy.resources.resourceLegend(index + 1)}</legend>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#294638]">
                      {copy.resources.resourceLegend(index + 1)} ·{" "}
                      {preset
                        ? copy.resources.presets[preset.id].name
                        : draft.preset.id}
                    </p>
                    <span
                      className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        adapted.success
                          ? "bg-[#fff0d6] text-[#7a4b18]"
                          : "bg-[#fde9df] text-[#8a3b25]"
                      }`}
                    >
                      {adapted.success
                        ? copy.resources.conditionalStatus
                        : copy.resources.invalidStatus}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemove(draft.uiId)}
                    className="min-h-11 rounded-xl border border-[#9b4c34]/20 px-3 py-2 text-xs font-bold text-[#8a3b25] transition hover:bg-[#fff1ea] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#9b4c34]/12 disabled:opacity-45"
                  >
                    {copy.resources.remove}
                  </button>
                </div>

                <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-[#46564d]">
                      {copy.resources.nameLabel}
                    </span>
                    <input
                      id={`resource-name-${draft.uiId}`}
                      value={draft.displayName}
                      disabled={disabled}
                      onChange={(event) =>
                        onChange(draft.uiId, { ...draft, displayName: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#46564d]">
                      {copy.resources.ownershipLabel}
                    </span>
                    <select
                      value={draft.ownership}
                      disabled={disabled}
                      onChange={(event) => {
                        const ownership = event.target.value as AvailableAiResourceDraft["ownership"];
                        onChange(draft.uiId, {
                          ...draft,
                          ownership,
                          quota:
                            ownership === "candidate-new"
                              ? quotaForKind("opaque")
                              : forceMetered
                                ? quotaForKind("metered")
                                : forceOpaque
                                  ? quotaForKind("opaque")
                                  : draft.quota,
                        });
                      }}
                      className={inputClass}
                    >
                      {SUBSCRIPTION_OWNERSHIPS.map((value) => (
                        <option key={value} value={value}>{copy.enums.ownership[value]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#46564d]">
                      {copy.resources.availabilityLabel}
                    </span>
                    <select
                      value={draft.availability}
                      disabled={disabled}
                      onChange={(event) =>
                        onChange(draft.uiId, {
                          ...draft,
                          availability: event.target.value as AvailableAiResourceDraft["availability"],
                        })
                      }
                      className={inputClass}
                    >
                      {SUBSCRIPTION_AVAILABILITY_STATUSES.map((value) => (
                        <option key={value} value={value}>{copy.enums.availability[value]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#46564d]">
                      {copy.resources.surfaceLabel}
                    </span>
                    <select
                      value={draft.surface}
                      disabled={disabled}
                      onChange={(event) =>
                        onChange(draft.uiId, {
                          ...draft,
                          surface: event.target.value as AvailableAiResourceDraft["surface"],
                        })
                      }
                      className={inputClass}
                    >
                      <option value="">—</option>
                      {WORK_SURFACES.map((value) => (
                        <option key={value} value={value}>{copy.enums.surface[value]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#46564d]">
                      {copy.resources.feeLabel}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.000001"
                      inputMode="decimal"
                      value={draft.feeUsd}
                      disabled={disabled}
                      onChange={(event) =>
                        onChange(draft.uiId, { ...draft, feeUsd: event.target.value })
                      }
                      className={inputClass}
                    />
                    <span className="mt-1 block text-[11px] leading-4 text-[#6b776f]">
                      {draft.ownership === "owned"
                        ? copy.resources.existingFeeHelp
                        : copy.resources.newFeeHelp}
                    </span>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#46564d]">
                      {copy.resources.quotaKindLabel}
                    </span>
                    <select
                      value={draft.quota.kind}
                      disabled={disabled || quotaKinds.length === 1}
                      onChange={(event) =>
                        onChange(draft.uiId, {
                          ...draft,
                          quota: quotaForKind(
                            event.target.value as AvailableAiResourceQuotaDraft["kind"],
                          ),
                        })
                      }
                      className={inputClass}
                    >
                      {quotaKinds.map((value) => (
                        <option key={value} value={value}>{copy.enums.quotaKind[value]}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {opaqueQuota ? (
                  <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-bold text-[#46564d]">
                      {copy.resources.opaqueDescriptionLabel}
                    </span>
                    <textarea
                      rows={2}
                      value={opaqueQuota.description}
                      placeholder={copy.resources.opaqueDescriptionPlaceholder}
                      disabled={disabled}
                      onChange={(event) =>
                        onChange(draft.uiId, {
                          ...draft,
                          quota: { ...opaqueQuota, description: event.target.value },
                        })
                      }
                      className={`${inputClass} resize-y`}
                    />
                  </label>
                ) : (
                  <div className="mt-4 rounded-xl border border-[#173f31]/10 bg-white/70 p-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {meteredQuota ? (
                        <>
                          <label>
                            <span className="mb-1 block text-xs font-bold">{copy.resources.quotaUnitLabel}</span>
                            <select
                              value={meteredQuota.unit}
                              disabled={disabled || forceMetered}
                              onChange={(event) =>
                                onChange(draft.uiId, {
                                  ...draft,
                                  quota: {
                                    ...meteredQuota,
                                    unit: event.target.value as "request" | "credit",
                                  },
                                })
                              }
                              className={inputClass}
                            >
                              {(["request", "credit"] as const).map((value) => (
                                <option key={value} value={value}>{copy.enums.quotaUnit[value]}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span className="mb-1 block text-xs font-bold">{copy.resources.includedLabel}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.000001"
                              value={meteredQuota.included}
                              disabled={disabled}
                              onChange={(event) => onChange(draft.uiId, {
                                ...draft,
                                quota: { ...meteredQuota, included: event.target.value },
                              })}
                              className={inputClass}
                            />
                          </label>
                          <label>
                            <span className="mb-1 block text-xs font-bold">{copy.resources.remainingLabel}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.000001"
                              value={meteredQuota.remaining}
                              disabled={disabled}
                              onChange={(event) => onChange(draft.uiId, {
                                ...draft,
                                quota: { ...meteredQuota, remaining: event.target.value },
                              })}
                              className={inputClass}
                            />
                          </label>
                        </>
                      ) : (
                        <label>
                          <span className="mb-1 block text-xs font-bold">{copy.resources.remainingLabel} (%)</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.000001"
                            value={calibratedQuota?.remainingPercent ?? ""}
                            disabled={disabled}
                            onChange={(event) => onChange(draft.uiId, {
                              ...draft,
                              quota: {
                                kind: "calibrated",
                                remainingPercent: event.target.value,
                                consumption:
                                  calibratedQuota?.consumption ??
                                  updateRangedConsumption(null, {}).consumption,
                              },
                            })}
                            className={inputClass}
                          />
                        </label>
                      )}
                    </div>
                    <p className="mt-4 text-xs font-bold text-[#46564d]">{copy.resources.observedUseLabel}</p>
                    <p className="mt-1 text-[11px] leading-4 text-[#6b776f]">{copy.resources.observedUseHelp}</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <label>
                        <span className="mb-1 block text-xs font-bold">{copy.resources.consumptionBasisLabel}</span>
                        <select
                          value={rangedQuota?.consumption.basis ?? "task"}
                          disabled={disabled}
                          onChange={(event) => onChange(draft.uiId, {
                            ...draft,
                            quota: updateRangedConsumption(rangedQuota, {
                              basis: event.target.value as "task" | "analysis-iteration",
                            }),
                          })}
                          className={inputClass}
                        >
                          {SUBSCRIPTION_CONSUMPTION_BASES.map((basis) => (
                            <option key={basis} value={basis}>
                              {basis === "task"
                                ? copy.resources.taskBasis
                                : copy.resources.iterationBasis}
                            </option>
                          ))}
                        </select>
                      </label>
                      {(["low", "expected", "high"] as const).map((scenario) => (
                        <label key={scenario}>
                          <span className="mb-1 block text-xs font-bold">
                            {scenario === "low"
                              ? copy.resources.lowLabel
                              : scenario === "expected"
                                ? copy.resources.expectedLabel
                                : copy.resources.highLabel}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.000001"
                            value={rangedQuota?.consumption[scenario] ?? ""}
                            disabled={disabled}
                            onChange={(event) => onChange(draft.uiId, {
                              ...draft,
                              quota: updateRangedConsumption(rangedQuota, {
                                [scenario]: event.target.value,
                              }),
                            })}
                            className={inputClass}
                          />
                        </label>
                      ))}
                      <label>
                        <span className="mb-1 block text-xs font-bold">{copy.resources.sampleSizeLabel}</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={rangedQuota?.consumption.sampleSize ?? ""}
                          disabled={disabled}
                          onChange={(event) => onChange(draft.uiId, {
                            ...draft,
                            quota: updateRangedConsumption(rangedQuota, {
                              sampleSize: event.target.value,
                            }),
                          })}
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label>
                    <span className="mb-1 block text-xs font-bold">{copy.resources.resetKindLabel}</span>
                    <select
                      value={draft.reset.kind}
                      disabled={disabled || resetKinds.length === 1}
                      onChange={(event) => onChange(draft.uiId, {
                        ...draft,
                        reset: resetForKind(
                          event.target.value as AvailableAiResourceResetDraft["kind"],
                        ),
                      })}
                      className={inputClass}
                    >
                      {resetKinds.map((value) => (
                        <option key={value} value={value}>{copy.enums.resetKind[value]}</option>
                      ))}
                    </select>
                  </label>
                  {fixedReset ? (
                    <>
                      <label>
                        <span className="mb-1 block text-xs font-bold">{copy.resources.nextResetLabel}</span>
                        <input
                          value={fixedReset.nextResetAt}
                          placeholder="2026-07-31T00:00:00.000Z"
                          disabled={disabled}
                          onChange={(event) => onChange(draft.uiId, {
                            ...draft,
                            reset: { ...fixedReset, nextResetAt: event.target.value },
                          })}
                          className={inputClass}
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-xs font-bold">{copy.resources.cadenceDaysLabel}</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={fixedReset.cadenceDays}
                          disabled={disabled}
                          onChange={(event) => onChange(draft.uiId, {
                            ...draft,
                            reset: { ...fixedReset, cadenceDays: event.target.value },
                          })}
                          className={inputClass}
                        />
                      </label>
                    </>
                  ) : null}
                  {rollingReset ? (
                    <label>
                      <span className="mb-1 block text-xs font-bold">{copy.resources.rollingHoursLabel}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.000001"
                        value={rollingReset.windowHours}
                        disabled={disabled}
                        onChange={(event) => onChange(draft.uiId, {
                          ...draft,
                          reset: { ...rollingReset, windowHours: event.target.value },
                        })}
                        className={inputClass}
                      />
                    </label>
                  ) : null}
                </div>

                {!adapted.success ? (
                  <p role="alert" className="mt-4 rounded-xl bg-[#fff0e9] px-3.5 py-3 text-xs leading-5 text-[#87412c]">
                    {copy.resources.fieldError}
                    {fieldErrorIds ? ` (${fieldErrorIds})` : ""}
                  </p>
                ) : (
                  <p className="mt-4 rounded-xl bg-[#fff7e8] px-3.5 py-3 text-xs leading-5 text-[#71491f]">
                    {copy.resources.conditionalNotice}
                  </p>
                )}
              </fieldset>
            );
          })}
        </div>
      )}
    </section>
  );
}

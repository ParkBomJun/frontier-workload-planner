"use client";

import { useEffect, useRef, useState } from "react";

import {
  getSubscriptionPreset,
  SUBSCRIPTION_PRESETS,
  type SubscriptionPresetId,
} from "@/config/subscription-presets";
import { useLanguage } from "@/components/language-provider";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import { resourceDraftFieldLabel } from "@/lib/i18n/resource-draft-field-label";
import {
  adaptAvailableAiResourceDraft,
  recoverableAvailableAiResourcePresetReason,
  relinkAvailableAiResourceDraftPreset,
} from "@/lib/planning/resource-drafts";
import type {
  AvailableAiResourceDraft,
  AvailableAiResourceDraftField,
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
const QUOTA_GUIDE_DIALOG_ID = "subscription-quota-guide";
const QUOTA_GUIDE_URLS: Partial<Record<SubscriptionPresetId, string>> = {
  "chatgpt-like-variable": "https://chatgpt.com/",
  "github-copilot-like-credits": "https://github.com/settings/billing",
  "glm-like-rolling": "https://zcode.z.ai/en/docs/usage-stats",
};
const inputClass =
  "min-h-11 w-full rounded-xl border border-[#173f31]/15 bg-[#fbfcf9] px-3.5 py-2.5 text-sm outline-none transition focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:opacity-55";

function ResourceFieldLabel({
  label,
  required,
  requiredText,
  optionalText,
}: {
  label: string;
  required: boolean;
  requiredText: string;
  optionalText: string;
}) {
  return (
    <span className="mb-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-bold text-[#46564d]">
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          required
            ? "bg-[#fff0e9] text-[#944429]"
            : "bg-[#edf2ee] text-[#68766e]"
        }`}
      >
        {required ? requiredText : optionalText}
      </span>
    </span>
  );
}

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
  const [selectedPreset, setSelectedPreset] = useState<SubscriptionPresetId | "">("");
  const [quotaGuidePresetId, setQuotaGuidePresetId] =
    useState<SubscriptionPresetId | null>(null);
  const quotaGuideDialogRef = useRef<HTMLDialogElement>(null);
  const quotaGuideTriggerRef = useRef<HTMLButtonElement>(null);
  const selectedPresetUnavailable =
    selectedPreset !== "" && usedPresets.has(selectedPreset);
  const fallbackQuotaGuidePresetId =
    (drafts[0] && getSubscriptionPreset(drafts[0].preset.id)?.id) ||
    "custom-subscription";
  const activeQuotaGuidePresetId =
    quotaGuidePresetId ?? fallbackQuotaGuidePresetId;
  const quotaGuideCopy = copy.resources.quotaGuide;
  const activeQuotaGuide = quotaGuideCopy.presets[activeQuotaGuidePresetId];
  const activeQuotaGuideUrl = QUOTA_GUIDE_URLS[activeQuotaGuidePresetId];

  useEffect(() => {
    const dialog = quotaGuideDialogRef.current;
    if (quotaGuidePresetId !== null && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [quotaGuidePresetId]);

  function closeQuotaGuide() {
    const dialog = quotaGuideDialogRef.current;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    setQuotaGuidePresetId(null);
  }

  function addSelectedPreset() {
    if (!selectedPreset || selectedPresetUnavailable || drafts.length >= MAX_RESOURCES) {
      return;
    }
    onAdd(selectedPreset);
    setSelectedPreset("");
  }

  return (
    <section className="rounded-[1.75rem] border border-[#173f31]/12 bg-white/90 p-5 shadow-[0_18px_50px_rgba(28,47,37,0.08)] sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b85331]">
        {copy.resources.eyebrow}
      </p>
      <div className="mt-1.5">
        <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#17352a]">
          {copy.resources.title}
        </h2>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-[#607067]">
          {copy.resources.description}
        </p>
        <p className="mt-1 text-xs leading-5 text-[#7a877f]">
          {copy.resources.sessionOnly}
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[#4d6559]">
          {copy.resources.requirementHelp}
        </p>
      </div>

      <fieldset className="mt-4">
        <legend className="sr-only">{copy.resources.addLegend}</legend>
        <div className="grid gap-2 sm:max-w-2xl sm:grid-cols-[minmax(0,1fr)_auto]">
          <label>
            <span className="sr-only">{copy.resources.presetSelectLabel}</span>
            <select
              id="add-resource-select"
              value={selectedPreset}
              disabled={disabled || drafts.length >= MAX_RESOURCES}
              onChange={(event) =>
                setSelectedPreset(event.target.value as SubscriptionPresetId | "")
              }
              className={inputClass}
            >
              <option value="">{copy.resources.presetSelectPlaceholder}</option>
              {SUBSCRIPTION_PRESETS.map((preset) => (
                <option
                  key={preset.id}
                  value={preset.id}
                  disabled={usedPresets.has(preset.id)}
                >
                  {copy.resources.presets[preset.id].name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={
              disabled ||
              !selectedPreset ||
              selectedPresetUnavailable ||
              drafts.length >= MAX_RESOURCES
            }
            onClick={addSelectedPreset}
            className="min-h-11 rounded-xl bg-[#173f31] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#205541] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {copy.resources.addSelected}
          </button>
        </div>
        {drafts.length >= MAX_RESOURCES ? (
          <p className="mt-2 text-xs text-[#7a5b36]">{copy.resources.maximumReached}</p>
        ) : null}
      </fieldset>

      {drafts.length > 0 ? (
        <div className="mt-4 space-y-3">
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
            const presetRecoveryReason =
              recoverableAvailableAiResourcePresetReason(draft);
            const forceOpaque =
              draft.ownership === "candidate-new" || preset?.quotaInput.kind === "opaque";
            const meteredPreset = preset?.quotaInput.kind === "user-supplied-metered";
            const forceRolling = preset?.quotaInput.kind === "user-supplied-rolling";
            const quotaKinds: AvailableAiResourceQuotaDraft["kind"][] = forceOpaque
              ? ["opaque"]
              : ["opaque", "calibrated", "metered"];
            const resetKinds: AvailableAiResourceResetDraft["kind"][] = forceRolling
              ? ["unknown", "rolling"]
              : ["unknown", "none", "fixed", "rolling"];
            const fieldErrorFields = Object.keys(
              adapted.success ? {} : adapted.fieldErrors,
            ) as AvailableAiResourceDraftField[];
            const fieldErrorIds = fieldErrorFields.join(", ");
            const fieldErrorLabels = [
              ...new Set(
                fieldErrorFields.map((field) =>
                  resourceDraftFieldLabel(field, copy),
                ),
              ),
            ];
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
                id={`resource-card-${draft.uiId}`}
                tabIndex={-1}
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
                        adapted.success || presetRecoveryReason !== null
                          ? "bg-[#fff0d6] text-[#7a4b18]"
                          : "bg-[#fde9df] text-[#8a3b25]"
                      }`}
                    >
                      {adapted.success || presetRecoveryReason !== null
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

                {presetRecoveryReason !== null ? (
                  <div className="mt-4 rounded-xl border border-[#c88743]/25 bg-[#fff7e8] p-4">
                    <p className="text-sm font-bold text-[#71491f]">
                      {copy.resources.relinkTitle}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#765b3a]">
                      {copy.resources.relinkDescription}
                    </p>
                    <label className="mt-3 block max-w-xl">
                      <span className="mb-1.5 block text-xs font-bold text-[#5f4b32]">
                        {copy.resources.relinkLabel}
                      </span>
                      <select
                        id={`resource-relink-${draft.uiId}`}
                        required
                        value=""
                        disabled={disabled}
                        onChange={(event) => {
                          const presetId = event.target.value as SubscriptionPresetId;
                          if (!presetId) return;
                          onChange(
                            draft.uiId,
                            relinkAvailableAiResourceDraftPreset(draft, presetId),
                          );
                        }}
                        className={inputClass}
                      >
                        <option value="">{copy.resources.relinkPlaceholder}</option>
                        {SUBSCRIPTION_PRESETS.map((candidatePreset) => {
                          const usedBySibling = drafts.some(
                            (candidateDraft) =>
                              candidateDraft.uiId !== draft.uiId &&
                              candidateDraft.preset.id === candidatePreset.id,
                          );
                          return (
                            <option
                              key={candidatePreset.id}
                              value={candidatePreset.id}
                              disabled={usedBySibling}
                            >
                              {copy.resources.presets[candidatePreset.id].name}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  </div>
                ) : null}

                <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="block sm:col-span-2">
                    <ResourceFieldLabel
                      label={copy.resources.nameLabel}
                      required
                      requiredText={copy.resources.requiredField}
                      optionalText={copy.resources.optionalField}
                    />
                    <input
                      id={`resource-name-${draft.uiId}`}
                      required
                      value={draft.displayName}
                      disabled={disabled}
                      onChange={(event) =>
                        onChange(draft.uiId, { ...draft, displayName: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <ResourceFieldLabel
                      label={copy.resources.ownershipLabel}
                      required
                      requiredText={copy.resources.requiredField}
                      optionalText={copy.resources.optionalField}
                    />
                    <select
                      id={`resource-ownership-${draft.uiId}`}
                      required
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
                    <ResourceFieldLabel
                      label={copy.resources.availabilityLabel}
                      required
                      requiredText={copy.resources.requiredField}
                      optionalText={copy.resources.optionalField}
                    />
                    <select
                      id={`resource-availability-${draft.uiId}`}
                      required
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
                    <ResourceFieldLabel
                      label={copy.resources.surfaceLabel}
                      required
                      requiredText={copy.resources.requiredField}
                      optionalText={copy.resources.optionalField}
                    />
                    <select
                      id={`resource-surface-${draft.uiId}`}
                      required
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
                    <ResourceFieldLabel
                      label={copy.resources.feeLabel}
                      required
                      requiredText={copy.resources.requiredField}
                      optionalText={copy.resources.optionalField}
                    />
                    <input
                      id={`resource-fee-${draft.uiId}`}
                      required
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
                  <div className="block">
                    <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
                      <label
                        htmlFor={`resource-quota-kind-${draft.uiId}`}
                        className="min-w-0"
                      >
                        <ResourceFieldLabel
                          label={copy.resources.quotaKindLabel}
                          required
                          requiredText={copy.resources.requiredField}
                          optionalText={copy.resources.optionalField}
                        />
                      </label>
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-controls={QUOTA_GUIDE_DIALOG_ID}
                        onClick={(event) => {
                          quotaGuideTriggerRef.current = event.currentTarget;
                          setQuotaGuidePresetId(
                            preset?.id ?? "custom-subscription",
                          );
                        }}
                        className="inline-flex min-h-8 shrink-0 items-center rounded-lg px-2 text-[11px] font-bold text-[#2f6c55] underline decoration-[#2f6c55]/35 underline-offset-4 transition hover:bg-[#eaf2ed] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15"
                      >
                        {quotaGuideCopy.open}
                      </button>
                    </div>
                    <select
                      id={`resource-quota-kind-${draft.uiId}`}
                      required
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
                  </div>
                  <label className="block">
                    <ResourceFieldLabel
                      label={copy.resources.resetKindLabel}
                      required
                      requiredText={copy.resources.requiredField}
                      optionalText={copy.resources.optionalField}
                    />
                    <select
                      id={`resource-reset-kind-${draft.uiId}`}
                      required
                      value={draft.reset.kind}
                      disabled={disabled || resetKinds.length === 1}
                      onChange={(event) =>
                        onChange(draft.uiId, {
                          ...draft,
                          reset: resetForKind(
                            event.target.value as AvailableAiResourceResetDraft["kind"],
                          ),
                        })
                      }
                      className={inputClass}
                    >
                      {resetKinds.map((value) => (
                        <option key={value} value={value}>
                          {copy.enums.resetKind[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {fixedReset ? (
                    <>
                      <label>
                        <ResourceFieldLabel
                          label={copy.resources.nextResetLabel}
                          required
                          requiredText={copy.resources.requiredField}
                          optionalText={copy.resources.optionalField}
                        />
                        <input
                          id={`resource-reset-next-${draft.uiId}`}
                          required
                          value={fixedReset.nextResetAt}
                          placeholder="2026-07-31T00:00:00.000Z"
                          disabled={disabled}
                          onChange={(event) =>
                            onChange(draft.uiId, {
                              ...draft,
                              reset: {
                                ...fixedReset,
                                nextResetAt: event.target.value,
                              },
                            })
                          }
                          className={inputClass}
                        />
                      </label>
                      <label>
                        <ResourceFieldLabel
                          label={copy.resources.cadenceDaysLabel}
                          required
                          requiredText={copy.resources.requiredField}
                          optionalText={copy.resources.optionalField}
                        />
                        <input
                          id={`resource-reset-cadence-${draft.uiId}`}
                          required
                          type="number"
                          min="1"
                          step="1"
                          value={fixedReset.cadenceDays}
                          disabled={disabled}
                          onChange={(event) =>
                            onChange(draft.uiId, {
                              ...draft,
                              reset: {
                                ...fixedReset,
                                cadenceDays: event.target.value,
                              },
                            })
                          }
                          className={inputClass}
                        />
                      </label>
                    </>
                  ) : null}
                  {rollingReset ? (
                    <label>
                      <ResourceFieldLabel
                        label={copy.resources.rollingHoursLabel}
                        required
                        requiredText={copy.resources.requiredField}
                        optionalText={copy.resources.optionalField}
                      />
                      <input
                        id={`resource-reset-window-${draft.uiId}`}
                        required
                        type="number"
                        min="0"
                        step="0.000001"
                        value={rollingReset.windowHours}
                        disabled={disabled}
                        onChange={(event) =>
                          onChange(draft.uiId, {
                            ...draft,
                            reset: {
                              ...rollingReset,
                              windowHours: event.target.value,
                            },
                          })
                        }
                        className={inputClass}
                      />
                      <span className="mt-1 block text-[11px] leading-4 text-[#6b776f]">
                        {copy.resources.rollingHoursHelp}
                      </span>
                    </label>
                  ) : null}
                </div>

                {opaqueQuota ? (
                  <label className="mt-3 block">
                    <ResourceFieldLabel
                      label={copy.resources.opaqueDescriptionLabel}
                      required={false}
                      requiredText={copy.resources.requiredField}
                      optionalText={copy.resources.optionalField}
                    />
                    <input
                      id={`resource-quota-description-${draft.uiId}`}
                      value={opaqueQuota.description}
                      disabled={disabled}
                      onChange={(event) =>
                        onChange(draft.uiId, {
                          ...draft,
                          quota: {
                            ...opaqueQuota,
                            description: event.target.value,
                          },
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                ) : null}

                {rangedQuota ? (
                  <div className="mt-3 rounded-xl border border-[#173f31]/10 bg-white/70 p-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {meteredQuota ? (
                        <>
                          <label>
                            <ResourceFieldLabel
                              label={copy.resources.quotaUnitLabel}
                              required
                              requiredText={copy.resources.requiredField}
                              optionalText={copy.resources.optionalField}
                            />
                            <select
                              id={`resource-quota-unit-${draft.uiId}`}
                              required
                              value={meteredQuota.unit}
                              disabled={disabled || meteredPreset}
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
                            <ResourceFieldLabel
                              label={copy.resources.includedLabel}
                              required
                              requiredText={copy.resources.requiredField}
                              optionalText={copy.resources.optionalField}
                            />
                            <input
                              id={`resource-quota-included-${draft.uiId}`}
                              required
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
                            <ResourceFieldLabel
                              label={copy.resources.remainingLabel}
                              required
                              requiredText={copy.resources.requiredField}
                              optionalText={copy.resources.optionalField}
                            />
                            <input
                              id={`resource-quota-remaining-${draft.uiId}`}
                              required
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
                          <ResourceFieldLabel
                            label={`${copy.resources.remainingLabel} (%)`}
                            required
                            requiredText={copy.resources.requiredField}
                            optionalText={copy.resources.optionalField}
                          />
                          <input
                            id={`resource-quota-remaining-${draft.uiId}`}
                            required
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
                        <ResourceFieldLabel
                          label={copy.resources.consumptionBasisLabel}
                          required
                          requiredText={copy.resources.requiredField}
                          optionalText={copy.resources.optionalField}
                        />
                        <select
                          id={`resource-consumption-basis-${draft.uiId}`}
                          required
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
                          <ResourceFieldLabel
                            label={scenario === "low"
                              ? copy.resources.lowLabel
                              : scenario === "expected"
                                ? copy.resources.expectedLabel
                                : copy.resources.highLabel}
                            required
                            requiredText={copy.resources.requiredField}
                            optionalText={copy.resources.optionalField}
                          />
                          <input
                            id={`resource-consumption-${scenario}-${draft.uiId}`}
                            required
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
                        <ResourceFieldLabel
                          label={copy.resources.sampleSizeLabel}
                          required
                          requiredText={copy.resources.requiredField}
                          optionalText={copy.resources.optionalField}
                        />
                        <input
                          id={`resource-consumption-sample-size-${draft.uiId}`}
                          required
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
                ) : null}

                {!adapted.success ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl bg-[#fff0e9] px-3.5 py-3 text-xs leading-5 text-[#87412c]"
                  >
                    <p className="font-bold">
                      {fieldErrorLabels.length > 0
                        ? copy.resources.fieldsToCheck
                        : copy.resources.fieldError}
                    </p>
                    {fieldErrorLabels.length > 0 ? (
                      <ul className="mt-1.5 list-disc space-y-1 pl-5">
                        {fieldErrorLabels.map((label) => (
                          <li key={label}>{label}</li>
                        ))}
                      </ul>
                    ) : null}
                    {fieldErrorIds ? (
                      <details className="mt-1.5">
                        <summary className="min-h-11 cursor-pointer py-2 font-bold">
                          {copy.resources.technicalDetails}
                        </summary>
                        <code className="block break-words rounded-lg bg-white/55 px-2.5 py-2">
                          {fieldErrorIds}
                        </code>
                      </details>
                    ) : null}
                  </div>
                ) : null}
              </fieldset>
            );
          })}
        </div>
      ) : null}

      {drafts.length > 0 ? (
        <dialog
          ref={quotaGuideDialogRef}
          id={QUOTA_GUIDE_DIALOG_ID}
          aria-labelledby={`${QUOTA_GUIDE_DIALOG_ID}-title`}
          onCancel={(event) => {
            event.preventDefault();
            closeQuotaGuide();
          }}
          onClose={() => {
            setQuotaGuidePresetId(null);
            quotaGuideTriggerRef.current?.focus({ preventScroll: true });
            quotaGuideTriggerRef.current = null;
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeQuotaGuide();
          }}
          className="m-auto max-h-[min(84dvh,44rem)] w-[min(92vw,38rem)] overflow-y-auto rounded-[1.5rem] border border-[#173f31]/15 bg-white p-0 text-[#17352a] shadow-[0_28px_90px_rgba(17,42,31,0.3)] backdrop:bg-[#132e24]/40 backdrop:backdrop-blur-[2px]"
        >
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3
                  id={`${QUOTA_GUIDE_DIALOG_ID}-title`}
                  className="text-xl font-semibold tracking-[-0.02em]"
                >
                  {quotaGuideCopy.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#607067]">
                  {quotaGuideCopy.intro}
                </p>
              </div>
              <button
                type="button"
                onClick={closeQuotaGuide}
                aria-label={quotaGuideCopy.close}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#173f31]/12 text-xl leading-none text-[#52645a] transition hover:bg-[#edf3ef] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <section className="mt-5 rounded-2xl border border-[#173f31]/12 bg-[#f6f9f6] p-4">
              <h4 className="text-base font-bold text-[#294638]">
                {activeQuotaGuide.title}
              </h4>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-[#53645b]">
                {activeQuotaGuide.steps.map((step, index) => (
                  <li
                    key={step}
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-[#dfeae3] text-[11px] font-bold text-[#315b49]"
                    >
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              {activeQuotaGuideUrl ? (
                <a
                  href={activeQuotaGuideUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[#2f6c55]/20 bg-white px-3.5 py-2 text-sm font-bold text-[#2f6c55] transition hover:bg-[#edf5ef] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15"
                >
                  {quotaGuideCopy.officialLink}
                  <span className="ml-1.5" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ) : null}
            </section>

            <div className="mt-4 rounded-2xl bg-[#fff7e9] p-4 text-[#6f4b24]">
              <p className="text-sm font-bold">{quotaGuideCopy.recordTitle}</p>
              <p className="mt-1 text-xs leading-5">
                {quotaGuideCopy.recordDescription}
              </p>
              <p className="mt-2 text-xs font-semibold leading-5">
                {quotaGuideCopy.unknown}
              </p>
            </div>

            <button
              type="button"
              onClick={closeQuotaGuide}
              className="mt-5 min-h-11 w-full rounded-xl bg-[#173f31] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#205541] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20"
            >
              {quotaGuideCopy.close}
            </button>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}

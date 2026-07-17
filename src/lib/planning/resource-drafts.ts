import { z } from "zod";

import {
  getSubscriptionPreset,
  SUBSCRIPTION_PRESET_VERSION,
  type SubscriptionPreset,
} from "@/config/subscription-presets";
import {
  createCustomAccessProviderId,
  parseAccessProviderId,
} from "@/lib/offerings/route-identity";
import {
  MAX_SUBSCRIPTION_QUOTA_UNITS,
  toSourceSubscriptionMicrounits,
} from "@/lib/subscriptions/fixed-decimal";
import { parseStoredSubscriptionResourceInput } from "@/lib/subscriptions/resource-schema";
import type {
  ModelOpaqueSubscriptionOffering,
  StoredPresetEvidenceInput,
  UserObservedEvidence,
} from "@/types/offerings";
import type {
  AvailableAiResourceDraft,
  AvailableAiResourceDraftAdapterContext,
  AvailableAiResourceDraftAdapterResult,
  AvailableAiResourceEvidenceObservedAt,
  AvailableAiResourceDraftErrorCode,
  AvailableAiResourceDraftField,
  AvailableAiResourceDraftFieldErrors,
  AvailableAiResourceObservedConsumptionDraft,
  AvailableAiResourceQuotaDraft,
  AvailableAiResourceResetDraft,
  CreateDefaultAvailableAiResourceDraftOptions,
} from "@/types/resource-drafts";
import {
  SUBSCRIPTION_AVAILABILITY_STATUSES,
  SUBSCRIPTION_CONSUMPTION_BASES,
  SUBSCRIPTION_OWNERSHIPS,
  SUBSCRIPTION_RESOURCE_CONTRACT_VERSION,
  type StoredCandidateSubscriptionQuotaInput,
  type StoredOwnedSubscriptionQuotaInput,
  type StoredObservedRangeConsumptionRuleInput,
  type StoredResetPolicyInput,
  type StoredSubscriptionQuotaInput,
  type StoredSubscriptionResourceInput,
} from "@/types/subscriptions";
import { WORK_SURFACES } from "@/types/offerings";

const UI_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,63}$/;
const DECIMAL_PATTERN = /^\d+(?:\.(\d+))?$/;
const POSITIVE_INTEGER_PATTERN = /^\d+$/;
const DISPLAY_NAME_MAX_LENGTH = 200;
const MAX_SAFE_MICRO_SCALED_VALUE = Number.MAX_SAFE_INTEGER / 1_000_000;
const PRESET_INCLUDED_CLAIM_ID = "included-capacity";
const utcDateTimeSchema = z.iso.datetime();

interface DecimalOptions {
  allowZero: boolean;
  max: number;
  requireExactMicrounits: boolean;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function addError(
  errors: AvailableAiResourceDraftFieldErrors,
  field: AvailableAiResourceDraftField,
  code: AvailableAiResourceDraftErrorCode,
): void {
  if (!Object.hasOwn(errors, field)) errors[field] = code;
}

function parseDecimalField(
  rawValue: string,
  field: AvailableAiResourceDraftField,
  errors: AvailableAiResourceDraftFieldErrors,
  options: DecimalOptions,
): number | null {
  const value = rawValue.trim();
  if (value.length === 0) {
    addError(errors, field, "required");
    return null;
  }
  const match = value.match(DECIMAL_PATTERN);
  if (match === null) {
    addError(errors, field, "invalid-value");
    return null;
  }
  if ((match[1]?.length ?? 0) > 6) {
    addError(errors, field, "too-many-decimal-places");
    return null;
  }

  const parsed = Number(value);
  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    (!options.allowZero && parsed === 0) ||
    parsed > options.max ||
    (options.requireExactMicrounits &&
      toSourceSubscriptionMicrounits(parsed) === null)
  ) {
    addError(errors, field, "out-of-range");
    return null;
  }
  return parsed;
}

function parsePositiveIntegerField(
  rawValue: string,
  field: AvailableAiResourceDraftField,
  errors: AvailableAiResourceDraftFieldErrors,
): number | null {
  const value = rawValue.trim();
  if (value.length === 0) {
    addError(errors, field, "required");
    return null;
  }
  if (!POSITIVE_INTEGER_PATTERN.test(value)) {
    addError(errors, field, "invalid-value");
    return null;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    addError(errors, field, "out-of-range");
    return null;
  }
  return parsed;
}

function observedEvidence(observedAt: string, note: string): UserObservedEvidence {
  return {
    kind: "user-observed",
    observedAt,
    note,
  };
}

export function createAvailableAiResourceEvidenceObservedAt(
  observedAt: string,
): AvailableAiResourceEvidenceObservedAt {
  return {
    availability: observedAt,
    commitment: observedAt,
    quota: observedAt,
    reset: observedAt,
    offering: observedAt,
  };
}

function sameDraftValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function updateAvailableAiResourceEvidenceObservedAt(
  previousDraft: AvailableAiResourceDraft,
  nextDraft: AvailableAiResourceDraft,
  current: AvailableAiResourceEvidenceObservedAt,
  changedAt: string,
): {
  evidenceChanged: boolean;
  observedAt: AvailableAiResourceEvidenceObservedAt;
} {
  const availabilityChanged =
    previousDraft.availability !== nextDraft.availability;
  const commitmentChanged =
    previousDraft.ownership !== nextDraft.ownership ||
    previousDraft.feeUsd !== nextDraft.feeUsd;
  const quotaChanged =
    previousDraft.ownership !== nextDraft.ownership ||
    !sameDraftValue(previousDraft.quota, nextDraft.quota);
  const resetChanged = !sameDraftValue(previousDraft.reset, nextDraft.reset);
  const offeringChanged = previousDraft.surface !== nextDraft.surface;

  return {
    evidenceChanged:
      availabilityChanged ||
      commitmentChanged ||
      quotaChanged ||
      resetChanged ||
      offeringChanged,
    observedAt: {
      availability: availabilityChanged ? changedAt : current.availability,
      commitment: commitmentChanged ? changedAt : current.commitment,
      quota: quotaChanged ? changedAt : current.quota,
      reset: resetChanged ? changedAt : current.reset,
      offering: offeringChanged ? changedAt : current.offering,
    },
  };
}

function presetEvidence(preset: SubscriptionPreset): StoredPresetEvidenceInput {
  return {
    kind: "preset-ref",
    presetId: preset.id,
    presetVersion: preset.version,
    claimId: PRESET_INCLUDED_CLAIM_ID,
  };
}

function emptyObservedConsumption(): AvailableAiResourceObservedConsumptionDraft {
  return {
    basis: "task",
    low: "",
    expected: "",
    high: "",
    sampleSize: "",
  };
}

function defaultQuota(preset: SubscriptionPreset): AvailableAiResourceQuotaDraft {
  if (preset.quotaInput.kind === "user-supplied-metered") {
    return {
      kind: "metered",
      unit: preset.quotaInput.unit,
      included: "",
      remaining: "",
      consumption: emptyObservedConsumption(),
    };
  }
  return { kind: "opaque", description: "" };
}

function defaultReset(preset: SubscriptionPreset): AvailableAiResourceResetDraft {
  return preset.quotaInput.kind === "user-supplied-rolling"
    ? { kind: "rolling", windowHours: "" }
    : { kind: "unknown" };
}

export function createDefaultAvailableAiResourceDraft({
  uiId,
  presetId,
}: CreateDefaultAvailableAiResourceDraftOptions): AvailableAiResourceDraft {
  if (!UI_ID_PATTERN.test(uiId)) {
    throw new Error(
      "Available AI resource UI ID must be 8-64 lowercase ASCII letters, digits, or hyphens.",
    );
  }
  const preset = getSubscriptionPreset(presetId);
  if (preset === undefined) {
    throw new Error("Available AI resource preset is not allowlisted.");
  }
  return {
    uiId,
    preset: { id: preset.id, version: preset.version },
    displayName: preset.displayName,
    ownership: "owned",
    availability: "uncertain",
    surface: preset.suggestedSurfaces[0] ?? "",
    feeUsd: "",
    quota: defaultQuota(preset),
    reset: defaultReset(preset),
  };
}

function validatePresetShape(
  draft: AvailableAiResourceDraft,
  preset: SubscriptionPreset,
  errors: AvailableAiResourceDraftFieldErrors,
): void {
  if (
    draft.ownership === "owned" &&
    preset.quotaInput.kind === "opaque" &&
    draft.quota.kind !== "opaque"
  ) {
    addError(errors, "quota.kind", "preset-quota-mismatch");
  }
  if (
    draft.ownership === "owned" &&
    preset.quotaInput.kind === "user-supplied-metered" &&
    draft.quota.kind !== "metered"
  ) {
    addError(errors, "quota.kind", "preset-quota-mismatch");
  }
  if (
    draft.ownership === "owned" &&
    preset.quotaInput.kind === "user-supplied-metered" &&
    draft.quota.kind === "metered" &&
    draft.quota.unit !== preset.quotaInput.unit
  ) {
    addError(errors, "quota.unit", "preset-unit-mismatch");
  }
  if (
    preset.quotaInput.kind === "user-supplied-rolling" &&
    draft.reset.kind !== "rolling"
  ) {
    addError(errors, "reset.kind", "preset-reset-mismatch");
  }
}

function observedConsumptionRule<Unit extends "request" | "credit" | "percent-point">(
  consumption: AvailableAiResourceObservedConsumptionDraft,
  unit: Unit,
  observedAt: string,
  errors: AvailableAiResourceDraftFieldErrors,
): (StoredObservedRangeConsumptionRuleInput & { unit: Unit }) | null {
  if (!SUBSCRIPTION_CONSUMPTION_BASES.includes(consumption.basis)) {
    addError(errors, "quota.consumption.basis", "invalid-value");
  }
  const low = parseDecimalField(
    consumption.low,
    "quota.consumption.low",
    errors,
    {
      allowZero: false,
      max: MAX_SUBSCRIPTION_QUOTA_UNITS,
      requireExactMicrounits: true,
    },
  );
  const expected = parseDecimalField(
    consumption.expected,
    "quota.consumption.expected",
    errors,
    {
      allowZero: false,
      max: MAX_SUBSCRIPTION_QUOTA_UNITS,
      requireExactMicrounits: true,
    },
  );
  const high = parseDecimalField(
    consumption.high,
    "quota.consumption.high",
    errors,
    {
      allowZero: false,
      max: MAX_SUBSCRIPTION_QUOTA_UNITS,
      requireExactMicrounits: true,
    },
  );
  const sampleSize = parsePositiveIntegerField(
    consumption.sampleSize,
    "quota.consumption.sampleSize",
    errors,
  );
  if (
    low !== null &&
    expected !== null &&
    high !== null &&
    (low > expected || expected > high)
  ) {
    addError(errors, "quota.consumption.expected", "range-order-invalid");
  }
  if (
    low === null ||
    expected === null ||
    high === null ||
    sampleSize === null ||
    !SUBSCRIPTION_CONSUMPTION_BASES.includes(consumption.basis)
  ) {
    return null;
  }
  return {
    kind: "observed-range-per-basis",
    unit,
    basis: consumption.basis,
    low,
    expected,
    high,
    sampleSize,
    evidence: observedEvidence(
      observedAt,
      "User entered observed subscription consumption.",
    ),
  };
}

function adaptQuota(
  draft: AvailableAiResourceDraft,
  preset: SubscriptionPreset,
  observedAt: string,
  errors: AvailableAiResourceDraftFieldErrors,
): StoredSubscriptionQuotaInput | null {
  if (draft.ownership === "candidate-new" && draft.quota.kind !== "opaque") {
    addError(errors, "quota.kind", "ownership-quota-mismatch");
  }

  if (draft.quota.kind === "opaque") {
    const description = draft.quota.description.trim();
    if (description.length === 0) {
      addError(errors, "quota.description", "required");
      return null;
    }
    if (description.length > 500) {
      addError(errors, "quota.description", "out-of-range");
      return null;
    }
    return { kind: "opaque", description };
  }

  if (draft.ownership !== "owned") return null;

  if (draft.quota.kind === "metered") {
    if (draft.quota.unit !== "request" && draft.quota.unit !== "credit") {
      addError(errors, "quota.unit", "invalid-value");
      return null;
    }
    const included = parseDecimalField(
      draft.quota.included,
      "quota.included",
      errors,
      {
        allowZero: false,
        max: MAX_SUBSCRIPTION_QUOTA_UNITS,
        requireExactMicrounits: true,
      },
    );
    const remaining = parseDecimalField(
      draft.quota.remaining,
      "quota.remaining",
      errors,
      {
        allowZero: true,
        max: MAX_SUBSCRIPTION_QUOTA_UNITS,
        requireExactMicrounits: true,
      },
    );
    const consumptionRule = observedConsumptionRule(
      draft.quota.consumption,
      draft.quota.unit,
      observedAt,
      errors,
    );
    if (included !== null && remaining !== null && remaining > included) {
      addError(errors, "quota.remaining", "out-of-range");
    }
    if (
      included === null ||
      remaining === null ||
      remaining > included ||
      consumptionRule === null
    ) {
      return null;
    }
    return {
      kind: "metered",
      unit: draft.quota.unit,
      included: { value: included, evidence: presetEvidence(preset) },
      remaining: {
        value: remaining,
        evidence: observedEvidence(
          observedAt,
          "User entered remaining subscription capacity.",
        ),
      },
      consumptionRule,
    };
  }

  const remainingPercent = parseDecimalField(
    draft.quota.remainingPercent,
    "quota.remainingPercent",
    errors,
    {
      allowZero: true,
      max: 100,
      requireExactMicrounits: true,
    },
  );
  const consumptionRule = observedConsumptionRule(
    draft.quota.consumption,
    "percent-point",
    observedAt,
    errors,
  );
  if (remainingPercent === null || consumptionRule === null) return null;
  if (consumptionRule.kind !== "observed-range-per-basis") {
    addError(errors, "quota.consumption.basis", "invalid-value");
    return null;
  }
  return {
    kind: "calibrated",
    unit: "percent-point",
    remainingPercent: {
      value: remainingPercent,
      evidence: observedEvidence(
        observedAt,
        "User entered calibrated remaining subscription capacity.",
      ),
    },
    consumptionRule: {
      ...consumptionRule,
      unit: "percent-point",
    },
  };
}

function adaptReset(
  reset: AvailableAiResourceResetDraft,
  observedAt: string,
  errors: AvailableAiResourceDraftFieldErrors,
): StoredResetPolicyInput | null {
  if (reset.kind === "none" || reset.kind === "unknown") return { kind: reset.kind };
  if (reset.kind === "fixed") {
    const cadenceDays = parsePositiveIntegerField(
      reset.cadenceDays,
      "reset.cadenceDays",
      errors,
    );
    if (reset.nextResetAt.trim().length === 0) {
      addError(errors, "reset.nextResetAt", "required");
    } else if (!utcDateTimeSchema.safeParse(reset.nextResetAt).success) {
      addError(errors, "reset.nextResetAt", "invalid-value");
    }
    if (
      cadenceDays === null ||
      !utcDateTimeSchema.safeParse(reset.nextResetAt).success
    ) {
      return null;
    }
    return {
      kind: "fixed",
      cadenceDays,
      nextResetAt: reset.nextResetAt,
      evidence: observedEvidence(observedAt, "User entered subscription reset details."),
    };
  }
  const windowHours = parseDecimalField(
    reset.windowHours,
    "reset.windowHours",
    errors,
    {
      allowZero: false,
      max: Number.MAX_SAFE_INTEGER,
      requireExactMicrounits: false,
    },
  );
  return windowHours === null
    ? null
    : {
        kind: "rolling",
        windowHours,
        evidence: observedEvidence(
          observedAt,
          "User entered subscription rolling-window details.",
        ),
      };
}

function resourceIdentities(
  preset: SubscriptionPreset,
  uiId: string,
): {
  providerId: ReturnType<typeof parseAccessProviderId>;
  offeringId: string;
  resourceId: string;
} {
  const providerId =
    preset.providerInput === "planner-generated-custom"
      ? createCustomAccessProviderId(uiId)
      : parseAccessProviderId(preset.providerId as string);
  const namespace = preset.providerId ?? "custom";
  return {
    providerId,
    offeringId: `subscription.${namespace}.${uiId}`,
    resourceId: `resource.${namespace}.${uiId}`,
  };
}

export function adaptAvailableAiResourceDraft(
  draft: AvailableAiResourceDraft,
  context: AvailableAiResourceDraftAdapterContext,
): AvailableAiResourceDraftAdapterResult {
  const errors: AvailableAiResourceDraftFieldErrors = {};
  const evidenceObservedAt = context.evidenceObservedAt;
  if (!UI_ID_PATTERN.test(draft.uiId)) {
    addError(errors, "uiId", "invalid-stable-id");
  }
  const preset = getSubscriptionPreset(draft.preset.id);
  if (preset === undefined) {
    addError(errors, "preset.id", "unknown-preset");
  } else if (
    draft.preset.version !== SUBSCRIPTION_PRESET_VERSION ||
    draft.preset.version !== preset.version
  ) {
    addError(errors, "preset.version", "preset-version-mismatch");
  }
  const displayName = draft.displayName.trim();
  if (displayName.length === 0) {
    addError(errors, "displayName", "required");
  } else if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    addError(errors, "displayName", "out-of-range");
  }
  if (!SUBSCRIPTION_OWNERSHIPS.includes(draft.ownership)) {
    addError(errors, "ownership", "invalid-value");
  }
  if (!SUBSCRIPTION_AVAILABILITY_STATUSES.includes(draft.availability)) {
    addError(errors, "availability", "invalid-value");
  }
  if (!WORK_SURFACES.includes(draft.surface as (typeof WORK_SURFACES)[number])) {
    addError(errors, "surface", draft.surface === "" ? "required" : "invalid-value");
  }
  const evidenceTimestamps = Object.values(evidenceObservedAt);
  if (
    evidenceTimestamps.length !== 5 ||
    evidenceTimestamps.some(
      (observedAt) =>
        observedAt.trim().length === 0 ||
        !utcDateTimeSchema.safeParse(observedAt).success,
    )
  ) {
    addError(
      errors,
      "observedAt",
      evidenceTimestamps.some((observedAt) => observedAt.trim().length === 0)
        ? "required"
        : "invalid-value",
    );
  }

  const feeUsd = parseDecimalField(draft.feeUsd, "feeUsd", errors, {
    allowZero: true,
    max:
      draft.ownership === "candidate-new"
        ? MAX_SAFE_MICRO_SCALED_VALUE
        : Number.MAX_SAFE_INTEGER,
    requireExactMicrounits: draft.ownership === "candidate-new",
  });
  if (preset !== undefined) validatePresetShape(draft, preset, errors);
  const quota =
    preset === undefined
      ? null
      : adaptQuota(draft, preset, evidenceObservedAt.quota, errors);
  const reset = adaptReset(draft.reset, evidenceObservedAt.reset, errors);

  if (
    Object.keys(errors).length > 0 ||
    preset === undefined ||
    feeUsd === null ||
    quota === null ||
    reset === null
  ) {
    return { success: false, fieldErrors: deepFreeze({ ...errors }) };
  }

  const identity = resourceIdentities(preset, draft.uiId);
  const common = {
    contractVersion: SUBSCRIPTION_RESOURCE_CONTRACT_VERSION,
    id: identity.resourceId,
    offeringRef: {
      providerId: identity.providerId,
      offeringId: identity.offeringId,
    },
    availability: {
      status: draft.availability,
      evidence: observedEvidence(
        evidenceObservedAt.availability,
        "User confirmed subscription availability.",
      ),
    },
    reset,
    overage: { kind: "unknown" as const },
  };
  let source: StoredSubscriptionResourceInput;
  if (draft.ownership === "owned") {
    source = {
      ...common,
      ownership: "owned",
      commitment: {
        kind: "existing",
        currentFeeUsd: feeUsd,
        currency: "USD",
        billingBasis: "current-plan-period",
        evidence: observedEvidence(
          evidenceObservedAt.commitment,
          "User entered the existing subscription fee.",
        ),
      },
      quota: quota as StoredOwnedSubscriptionQuotaInput,
    };
  } else {
    source = {
      ...common,
      ownership: "candidate-new",
      commitment: {
        kind: "new",
        feeUsd,
        currency: "USD",
        billingBasis: "one-plan-period",
        evidence: observedEvidence(
          evidenceObservedAt.commitment,
          "User entered the candidate subscription fee.",
        ),
      },
      quota: quota as StoredCandidateSubscriptionQuotaInput,
    };
  }

  const parsed = parseStoredSubscriptionResourceInput(source);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: deepFreeze({ draft: "strict-resource-invalid" }),
    };
  }

  const offeringEvidence = observedEvidence(
    evidenceObservedAt.offering,
    "User confirmed the subscription Offering and supported surface.",
  );
  const offering: ModelOpaqueSubscriptionOffering = {
    kind: "model-opaque-subscription",
    id: identity.offeringId,
    providerId: identity.providerId,
    mode: "subscription",
    supportedSurfaces: [draft.surface as (typeof WORK_SURFACES)[number]],
    evidence: offeringEvidence,
    eligibility: {
      kind: "unprofiled",
      reason: "model-undisclosed",
      evidence: observedEvidence(
        evidenceObservedAt.offering,
        "The user did not assert a verified model eligibility profile.",
      ),
    },
  };
  return {
    success: true,
    resourceInput: deepFreeze(parsed.data),
    offering: deepFreeze(offering),
  };
}

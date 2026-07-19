import type { SubscriptionPresetId } from "@/config/subscription-presets";
import type {
  ModelOpaqueSubscriptionOffering,
  WorkSurface,
} from "@/types/offerings";
import type {
  MeteredQuotaUnit,
  StoredSubscriptionResourceInput,
  SubscriptionAvailabilityStatus,
  SubscriptionConsumptionBasis,
  SubscriptionOwnership,
} from "@/types/subscriptions";

export interface AvailableAiResourceDraftPreset {
  id: string;
  version: string;
}

export const AVAILABLE_AI_RESOURCE_PROVISIONING = [
  "unspecified",
  "personal",
  "organization",
] as const;

export type AvailableAiResourceProvisioning =
  (typeof AVAILABLE_AI_RESOURCE_PROVISIONING)[number];

/** UI-only arrangement derived from provisioning and ownership. */
export const SUBSCRIPTION_ACCESS_ARRANGEMENTS = [
  "personal-existing",
  "personal-new",
  "organization-provided",
] as const;

export type SubscriptionAccessArrangement =
  (typeof SUBSCRIPTION_ACCESS_ARRANGEMENTS)[number];

export interface AvailableAiResourceObservedConsumptionDraft {
  basis: SubscriptionConsumptionBasis;
  low: string;
  expected: string;
  high: string;
  sampleSize: string;
}

export type AvailableAiResourceQuotaDraft =
  | {
      kind: "opaque";
      description: string;
    }
  | {
      kind: "metered";
      unit: MeteredQuotaUnit;
      included: string;
      remaining: string;
      consumption: AvailableAiResourceObservedConsumptionDraft;
    }
  | {
      kind: "calibrated";
      remainingPercent: string;
      consumption: AvailableAiResourceObservedConsumptionDraft;
    };

export type AvailableAiResourceResetDraft =
  | { kind: "none" }
  | { kind: "unknown" }
  | {
      kind: "fixed";
      cadenceDays: string;
      nextResetAt: string;
    }
  | {
      kind: "rolling";
      windowHours: string;
    };

export interface AvailableAiResourceDraft {
  uiId: string;
  preset: AvailableAiResourceDraftPreset;
  displayName: string;
  /** Missing only at legacy input boundaries; persistence migration makes it unspecified. */
  provisionedBy?: AvailableAiResourceProvisioning;
  ownership: SubscriptionOwnership;
  availability: SubscriptionAvailabilityStatus;
  surface: WorkSurface | "";
  feeUsd: string;
  quota: AvailableAiResourceQuotaDraft;
  reset: AvailableAiResourceResetDraft;
}

export interface CreateDefaultAvailableAiResourceDraftOptions {
  uiId: string;
  presetId: SubscriptionPresetId;
}

export interface AvailableAiResourceEvidenceObservedAt {
  availability: string;
  commitment: string;
  quota: string;
  reset: string;
  offering: string;
}

export interface AvailableAiResourceDraftAdapterContext {
  evidenceObservedAt: AvailableAiResourceEvidenceObservedAt;
}

export type AvailableAiResourceDraftField =
  | "draft"
  | "uiId"
  | "preset.id"
  | "preset.version"
  | "displayName"
  | "provisionedBy"
  | "ownership"
  | "availability"
  | "surface"
  | "feeUsd"
  | "quota.kind"
  | "quota.unit"
  | "quota.description"
  | "quota.included"
  | "quota.remaining"
  | "quota.remainingPercent"
  | "quota.consumption.basis"
  | "quota.consumption.low"
  | "quota.consumption.expected"
  | "quota.consumption.high"
  | "quota.consumption.sampleSize"
  | "reset.kind"
  | "reset.cadenceDays"
  | "reset.nextResetAt"
  | "reset.windowHours"
  | "observedAt";

export type AvailableAiResourceDraftErrorCode =
  | "required"
  | "invalid-value"
  | "invalid-stable-id"
  | "unknown-preset"
  | "preset-version-mismatch"
  | "preset-quota-mismatch"
  | "preset-unit-mismatch"
  | "preset-reset-mismatch"
  | "ownership-quota-mismatch"
  | "too-many-decimal-places"
  | "out-of-range"
  | "range-order-invalid"
  | "strict-resource-invalid";

export type AvailableAiResourceDraftFieldErrors = Partial<
  Record<AvailableAiResourceDraftField, AvailableAiResourceDraftErrorCode>
>;

export type AvailableAiResourceDraftAdapterResult =
  | {
      success: true;
      resourceInput: StoredSubscriptionResourceInput;
      offering: ModelOpaqueSubscriptionOffering;
    }
  | {
      success: false;
      fieldErrors: AvailableAiResourceDraftFieldErrors;
    };

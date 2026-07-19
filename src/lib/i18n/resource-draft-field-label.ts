import type { BestFitUiCopy } from "@/lib/i18n/best-fit-ui-copy";
import type { AvailableAiResourceDraftField } from "@/types/resource-drafts";

export function resourceDraftFieldTargetId(
  uiId: string,
  field: AvailableAiResourceDraftField,
): string | null {
  if (field === "preset.id" || field === "preset.version") {
    return `resource-relink-${uiId}`;
  }
  if (field === "displayName") return `resource-name-${uiId}`;
  if (field === "provisionedBy" || field === "ownership") {
    return `resource-access-arrangement-${uiId}`;
  }
  if (field === "availability") return `resource-availability-${uiId}`;
  if (field === "surface") return `resource-surface-${uiId}`;
  if (field === "feeUsd") return `resource-fee-${uiId}`;
  if (field === "quota.kind" || field === "quota.unit") {
    return `resource-quota-kind-${uiId}`;
  }
  if (field === "quota.description") {
    return `resource-quota-description-${uiId}`;
  }
  if (field === "quota.included") return `resource-quota-included-${uiId}`;
  if (field === "quota.remaining" || field === "quota.remainingPercent") {
    return `resource-quota-remaining-${uiId}`;
  }
  if (field === "quota.consumption.basis") {
    return `resource-consumption-basis-${uiId}`;
  }
  if (field === "quota.consumption.low") {
    return `resource-consumption-low-${uiId}`;
  }
  if (field === "quota.consumption.expected") {
    return `resource-consumption-expected-${uiId}`;
  }
  if (field === "quota.consumption.high") {
    return `resource-consumption-high-${uiId}`;
  }
  if (field === "quota.consumption.sampleSize") {
    return `resource-consumption-sample-size-${uiId}`;
  }
  if (field === "reset.kind") return `resource-reset-kind-${uiId}`;
  if (field === "reset.cadenceDays") return `resource-reset-cadence-${uiId}`;
  if (field === "reset.nextResetAt") return `resource-reset-next-${uiId}`;
  if (field === "reset.windowHours") return `resource-reset-window-${uiId}`;
  return null;
}

export function resourceDraftFieldLabel(
  field: AvailableAiResourceDraftField,
  copy: BestFitUiCopy,
): string {
  if (field === "displayName") return copy.resources.nameLabel;
  if (field === "provisionedBy" || field === "ownership") {
    return copy.resources.accessArrangementLabel;
  }
  if (field === "availability") return copy.resources.availabilityLabel;
  if (field === "surface") return copy.resources.surfaceLabel;
  if (field === "feeUsd") return copy.resources.feeLabel;
  if (field === "quota.kind") return copy.resources.quotaKindLabel;
  if (field === "quota.unit") return copy.resources.quotaUnitLabel;
  if (field === "quota.description") return copy.resources.opaqueDescriptionLabel;
  if (field === "quota.included") return copy.resources.includedLabel;
  if (field === "quota.remaining" || field === "quota.remainingPercent") {
    return copy.resources.remainingLabel;
  }
  if (field === "quota.consumption.basis") {
    return copy.resources.consumptionBasisLabel;
  }
  if (field === "quota.consumption.low") return copy.resources.lowLabel;
  if (field === "quota.consumption.expected") return copy.resources.expectedLabel;
  if (field === "quota.consumption.high") return copy.resources.highLabel;
  if (field === "quota.consumption.sampleSize") {
    return copy.resources.sampleSizeLabel;
  }
  if (field === "reset.kind") return copy.resources.resetKindLabel;
  if (field === "reset.cadenceDays") return copy.resources.cadenceDaysLabel;
  if (field === "reset.nextResetAt") return copy.resources.nextResetLabel;
  if (field === "reset.windowHours") return copy.resources.rollingHoursLabel;
  if (field === "preset.id" || field === "preset.version") {
    return copy.resources.relinkLabel;
  }
  return copy.resources.technicalDetails;
}

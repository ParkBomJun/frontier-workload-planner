import { z } from "zod";

import {
  API_CATALOG_REGISTRY_ID,
  getProviderRegistry,
  getProviderRegistryEntryById,
} from "@/config/versioned-provider-registry";
import {
  getSubscriptionPreset,
  SUBSCRIPTION_PRESET_VERSION,
} from "@/config/subscription-presets";
import { parseStoredEvidenceInput } from "@/lib/offerings/evidence-resolver";
import {
  normalizeConditionalReasonCodes,
  parseAccessProviderId,
} from "@/lib/offerings/route-identity";
import type {
  ConditionalReasonCode,
  EvidenceRef,
  StoredEvidenceInput,
  UserObservedEvidence,
} from "@/types/offerings";
import type {
  MeteredConsumptionRule,
  OveragePolicy,
  ResetPolicy,
  ResolvedSubscriptionResource,
  SubscriptionAvailability,
  SubscriptionQuota,
  SubscriptionResourceResolution,
} from "@/types/subscriptions";

import { parseStoredSubscriptionResourceInput } from "./resource-schema";

const issuedResources = new WeakSet<object>();
const resourcePlanningAsOf = new WeakMap<object, string>();
const issuedResolutions = new WeakSet<object>();

type InputEvidenceResolution =
  | { status: "resolved"; evidence: UserObservedEvidence }
  | { status: "conditional"; reasonCode: ConditionalReasonCode };

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function resolveInputEvidence(input: StoredEvidenceInput): InputEvidenceResolution {
  const parsed = parseStoredEvidenceInput(input);
  if (!parsed.success) {
    return { status: "conditional", reasonCode: "evidence-authority-invalid" };
  }
  const source = parsed.data;
  if (source.kind === "user-observed") {
    return { status: "resolved", evidence: deepFreeze({ ...source }) };
  }
  if (source.kind === "connector-ref") {
    return { status: "conditional", reasonCode: "connector-unverified" };
  }
  if (source.kind === "preset-ref") {
    const preset = getSubscriptionPreset(source.presetId);
    return preset?.version === source.presetVersion &&
      source.presetVersion === SUBSCRIPTION_PRESET_VERSION
      ? { status: "conditional", reasonCode: "profile-unverified" }
      : { status: "conditional", reasonCode: "preset-version-mismatch" };
  }
  if (source.catalogId !== API_CATALOG_REGISTRY_ID) {
    return { status: "conditional", reasonCode: "catalog-reference-unresolved" };
  }
  const registry = getProviderRegistry(source.catalogId, source.catalogVersion);
  if (!registry) {
    return { status: "conditional", reasonCode: "catalog-version-mismatch" };
  }
  const entry = getProviderRegistryEntryById(
    source.catalogId,
    source.catalogVersion,
    source.entryId,
  );
  return entry
    ? { status: "conditional", reasonCode: "catalog-claim-mismatch" }
    : { status: "conditional", reasonCode: "catalog-reference-unresolved" };
}

function resolvedEvidence(
  input: StoredEvidenceInput,
  reasons: ConditionalReasonCode[],
): EvidenceRef | null {
  const result = resolveInputEvidence(input);
  if (result.status === "resolved") return result.evidence;
  reasons.push(result.reasonCode);
  return null;
}

function snapshotObservedAt(quota: SubscriptionQuota): string | null {
  const evidence =
    quota.kind === "metered"
      ? quota.remaining.evidence
      : quota.kind === "calibrated"
        ? quota.remainingPercent.evidence
        : null;
  if (evidence === null) return null;
  return evidence.kind === "user-observed" ? evidence.observedAt : evidence.capturedAt;
}

function resetMakesSnapshotUncertain(
  reset: ResetPolicy,
  quota: SubscriptionQuota,
  planningAsOf: string,
): boolean {
  const observedAt = snapshotObservedAt(quota);
  if (observedAt === null) return false;
  const planningTimestamp = Date.parse(planningAsOf);
  const observedTimestamp = Date.parse(observedAt);
  if (observedTimestamp > planningTimestamp) return true;
  if (reset.kind === "fixed") {
    const resetTimestamp = Date.parse(reset.nextResetAt);
    return observedTimestamp < resetTimestamp && planningTimestamp >= resetTimestamp;
  }
  if (reset.kind === "rolling") {
    return planningTimestamp - observedTimestamp > reset.windowHours * 3_600_000;
  }
  return false;
}

export function isResolverIssuedSubscriptionResource(
  value: unknown,
): value is ResolvedSubscriptionResource {
  return typeof value === "object" && value !== null && issuedResources.has(value);
}

export function isResolverIssuedSubscriptionResourceForPlanningAsOf(
  value: unknown,
  planningAsOf: string,
): value is ResolvedSubscriptionResource {
  return (
    isResolverIssuedSubscriptionResource(value) &&
    resourcePlanningAsOf.get(value) === planningAsOf
  );
}

export function isResolverIssuedSubscriptionResourceResolution(
  value: unknown,
): value is Exclude<SubscriptionResourceResolution, { status: "invalid" }> {
  return typeof value === "object" && value !== null && issuedResolutions.has(value);
}

function issueResolution<
  T extends Exclude<SubscriptionResourceResolution, { status: "invalid" }>,
>(resolution: T): T {
  const frozen = deepFreeze(resolution);
  issuedResolutions.add(frozen);
  return frozen;
}

export function resolveStoredSubscriptionResource(
  value: unknown,
  planningAsOf: string,
): SubscriptionResourceResolution {
  const parsed = parseStoredSubscriptionResourceInput(value);
  if (!parsed.success || !z.iso.datetime().safeParse(planningAsOf).success) {
    return {
      status: "invalid",
      source: value,
      reasonCode: "invalid-subscription-resource-input",
    };
  }

  const source = parsed.data;
  const offeringRef = {
    providerId: parseAccessProviderId(source.offeringRef.providerId),
    offeringId: source.offeringRef.offeringId,
  };
  const reference = { id: source.id, offeringRef };
  const reasons: ConditionalReasonCode[] = [];

  const commitmentEvidence = resolvedEvidence(source.commitment.evidence, reasons);
  const availabilityEvidence = resolvedEvidence(source.availability.evidence, reasons);
  const resetEvidence =
    source.reset.kind === "fixed" || source.reset.kind === "rolling"
      ? resolvedEvidence(source.reset.evidence, reasons)
      : null;
  const overageEvidence =
    source.overage.kind === "paid"
      ? resolvedEvidence(source.overage.evidence, reasons)
      : null;

  let quota: SubscriptionQuota | null = null;
  if (source.quota.kind === "opaque") {
    quota = { kind: "opaque", description: source.quota.description };
    reasons.push("quota-opaque");
    if (source.ownership === "candidate-new") {
      reasons.push("initial-capacity-unpublished");
    }
  } else if (source.quota.kind === "metered") {
    const includedEvidence = resolvedEvidence(source.quota.included.evidence, reasons);
    const remainingEvidence = resolvedEvidence(source.quota.remaining.evidence, reasons);
    let consumptionRule: MeteredConsumptionRule | null = null;
    if (source.quota.consumptionRule.kind === "observed-range-per-basis") {
      consumptionRule = {
        ...source.quota.consumptionRule,
        unit: source.quota.unit,
        evidence: { ...source.quota.consumptionRule.evidence },
      };
      reasons.push("consumption-user-observed");
    } else {
      const ruleEvidence = resolvedEvidence(
        source.quota.consumptionRule.evidence,
        reasons,
      );
      if (ruleEvidence?.kind === "provider-published") {
        consumptionRule = {
          ...source.quota.consumptionRule,
          evidence: ruleEvidence,
        };
      }
    }
    if (
      includedEvidence !== null &&
      remainingEvidence !== null &&
      (remainingEvidence.kind === "user-observed" ||
        remainingEvidence.kind === "verified-connector-snapshot") &&
      consumptionRule !== null
    ) {
      quota = {
        kind: "metered",
        unit: source.quota.unit,
        included: { value: source.quota.included.value, evidence: includedEvidence },
        remaining: { value: source.quota.remaining.value, evidence: remainingEvidence },
        consumptionRule,
      };
    }
  } else if (source.quota.kind === "calibrated") {
    const remainingEvidence = resolvedEvidence(
      source.quota.remainingPercent.evidence,
      reasons,
    );
    if (
      remainingEvidence?.kind === "user-observed" ||
      remainingEvidence?.kind === "verified-connector-snapshot"
    ) {
      quota = {
        kind: "calibrated",
        unit: "percent-point",
        remainingPercent: {
          value: source.quota.remainingPercent.value,
          evidence: remainingEvidence,
        },
        consumptionRule: {
          ...source.quota.consumptionRule,
          evidence: { ...source.quota.consumptionRule.evidence },
        },
      };
      reasons.push("quota-calibrated", "consumption-user-observed");
    }
  } else {
    const includedEvidence = resolvedEvidence(source.quota.included.evidence, reasons);
    const initialEvidence = resolvedEvidence(
      source.quota.availableOnActivation.evidence,
      reasons,
    );
    const ruleEvidence = resolvedEvidence(
      source.quota.consumptionRule.evidence,
      reasons,
    );
    if (
      includedEvidence?.kind === "provider-published" &&
      initialEvidence?.kind === "provider-published" &&
      ruleEvidence?.kind === "provider-published"
    ) {
      quota = {
        kind: "initial-capacity",
        unit: source.quota.unit,
        included: { value: source.quota.included.value, evidence: includedEvidence },
        availableOnActivation: {
          value: source.quota.availableOnActivation.value,
          evidence: initialEvidence,
        },
        appliesFor: "one-plan-period",
        consumptionRule: {
          ...source.quota.consumptionRule,
          evidence: ruleEvidence,
        },
      };
    } else {
      reasons.push("initial-capacity-unpublished");
    }
  }

  const reset: ResetPolicy | null =
    source.reset.kind === "none" || source.reset.kind === "unknown"
      ? { ...source.reset }
      : resetEvidence === null
        ? null
        : { ...source.reset, evidence: resetEvidence };
  const overage: OveragePolicy | null =
    source.overage.kind === "none" || source.overage.kind === "unknown"
      ? { ...source.overage }
      : overageEvidence?.kind === "provider-published"
        ? {
            ...source.overage,
            appliesTo:
              source.overage.appliesTo.kind === "whole-resource"
                ? { kind: "whole-resource" }
                : {
                    kind: "offering-list",
                    offeringRefs: source.overage.appliesTo.offeringRefs.map((item) => ({
                      providerId: parseAccessProviderId(item.providerId),
                      offeringId: item.offeringId,
                    })),
                  },
            evidence: overageEvidence,
          }
        : null;

  if (
    commitmentEvidence === null ||
    availabilityEvidence === null ||
    quota === null ||
    reset === null ||
    overage === null
  ) {
    return issueResolution({
      status: "conditional",
      source,
      reference,
      resource: null,
      reasonCodes: normalizeConditionalReasonCodes(
        reasons.length === 0 ? ["evidence-authority-invalid"] : reasons,
      ),
    });
  }

  let availability: SubscriptionAvailability = {
    status: source.availability.status,
    evidence: availabilityEvidence,
  };
  if (
    availability.status === "uncertain" ||
    (availability.status === "available" &&
      resetMakesSnapshotUncertain(reset, quota, planningAsOf))
  ) {
    availability = { ...availability, status: "uncertain" };
    reasons.push("availability-uncertain");
  }

  const resource = deepFreeze({
    contractVersion: source.contractVersion,
    id: source.id,
    offeringRef,
    ownership: source.ownership,
    commitment:
      source.commitment.kind === "existing"
        ? { ...source.commitment, evidence: commitmentEvidence }
        : { ...source.commitment, evidence: commitmentEvidence },
    availability,
    quota,
    reset,
    overage,
  }) as ResolvedSubscriptionResource;
  issuedResources.add(resource);
  resourcePlanningAsOf.set(resource, planningAsOf);

  if (reasons.length > 0) {
    return issueResolution({
      status: "conditional",
      source,
      reference,
      resource,
      reasonCodes: normalizeConditionalReasonCodes(reasons),
    });
  }
  return issueResolution({ status: "resolved", source, resource, reasonCodes: [] });
}

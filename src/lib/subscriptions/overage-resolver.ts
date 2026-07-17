import { z } from "zod";

import {
  canonicalizeSubscriptionOverageClaimValue,
  type SubscriptionOverageClaimValue,
} from "@/config/versioned-provider-registry";
import { isIsoDate } from "@/lib/offerings/catalog-overrides";
import {
  isResolverIssuedEvidenceForClaim,
  isResolverIssuedProviderEvidence,
} from "@/lib/offerings/evidence-resolver";
import type { SubscriptionRouteIdentity } from "@/types/offerings";
import {
  SUBSCRIPTION_QUOTA_KINDS,
  SUBSCRIPTION_QUOTA_UNITS,
  type OveragePolicy,
  type OverageResolution,
  type PaidOveragePolicy,
  type SubscriptionQuotaKind,
  type SubscriptionQuotaUnit,
} from "@/types/subscriptions";
import { toSubscriptionQuotaMicrounits } from "./fixed-decimal";

const MICRO_USD_PER_USD = BigInt(1_000_000);
const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);
const STABLE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

interface DecimalParts {
  coefficient: bigint;
  scale: number;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalPolicyCopy(policy: PaidOveragePolicy): PaidOveragePolicy {
  const appliesTo =
    policy.appliesTo.kind === "whole-resource"
      ? { kind: "whole-resource" as const }
      : {
          kind: "offering-list" as const,
          offeringRefs: [...policy.appliesTo.offeringRefs]
            .map((reference) => ({ ...reference }))
            .sort((left, right) => {
              const providerDifference = compareStrings(
                left.providerId,
                right.providerId,
              );
              return providerDifference !== 0
                ? providerDifference
                : compareStrings(left.offeringId, right.offeringId);
            }),
        };
  return deepFreeze({
    kind: "paid",
    unit: policy.unit,
    usdPerUnit: policy.usdPerUnit,
    appliesTo,
    effectiveFrom: policy.effectiveFrom,
    ...(policy.effectiveThrough === undefined
      ? {}
      : { effectiveThrough: policy.effectiveThrough }),
    ...(policy.maxOverageUnits === undefined
      ? {}
      : { maxOverageUnits: policy.maxOverageUnits }),
    evidence: policy.evidence,
  });
}

function overageClaimValue(policy: PaidOveragePolicy): SubscriptionOverageClaimValue {
  return canonicalizeSubscriptionOverageClaimValue({
    kind: "paid",
    unit: policy.unit,
    usdPerUnit: policy.usdPerUnit,
    appliesTo:
      policy.appliesTo.kind === "whole-resource"
        ? { kind: "whole-resource" }
        : {
            kind: "offering-list",
            offeringRefs: policy.appliesTo.offeringRefs.map((reference) => ({
              providerId: reference.providerId,
              offeringId: reference.offeringId,
            })),
          },
    effectiveFrom: policy.effectiveFrom,
    ...(policy.effectiveThrough === undefined
      ? {}
      : { effectiveThrough: policy.effectiveThrough }),
    ...(policy.maxOverageUnits === undefined
      ? {}
      : { maxOverageUnits: policy.maxOverageUnits }),
  });
}

export interface ResolvePaidOverageInput {
  policy: OveragePolicy;
  quotaKind: SubscriptionQuotaKind;
  quotaUnit: SubscriptionQuotaUnit | null;
  routeIdentity: SubscriptionRouteIdentity;
  planningAsOf: string;
  deficitUnits: number;
  overageUnitsAlreadyUsed: number;
}

function decimalParts(value: number): DecimalParts | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const match = value
    .toString()
    .toLowerCase()
    .match(/^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/);
  if (!match) return null;

  const fractional = match[2] ?? "";
  const exponent = Number(match[3] ?? "0");
  if (!Number.isSafeInteger(exponent)) return null;
  let coefficient = BigInt(`${match[1]}${fractional}`);
  let scale = fractional.length - exponent;
  if (scale < 0) {
    coefficient *= BigInt(10) ** BigInt(-scale);
    scale = 0;
  }
  return { coefficient, scale };
}

/**
 * Multiplies a non-negative quota deficit by a positive USD unit rate and
 * rounds exactly once to the nearest micro-USD. It returns null for invalid or
 * unsafe inputs instead of silently overflowing.
 */
export function calculateOverageCostMicroUsd(
  deficitUnits: number,
  usdPerUnit: number,
): number | null {
  if (deficitUnits < 0 || !Number.isFinite(usdPerUnit) || usdPerUnit <= 0) {
    return null;
  }
  const units = decimalParts(deficitUnits);
  const rate = decimalParts(usdPerUnit);
  if (!units || !rate) return null;

  const denominator = BigInt(10) ** BigInt(units.scale + rate.scale);
  const numerator = units.coefficient * rate.coefficient * MICRO_USD_PER_USD;
  const rounded = (numerator + denominator / BigInt(2)) / denominator;
  if (rounded > MAX_SAFE_INTEGER) return null;
  return Number(rounded);
}

function validRouteIdentity(identity: SubscriptionRouteIdentity): boolean {
  return (
    typeof identity === "object" &&
    identity !== null &&
    typeof identity.providerId === "string" &&
    STABLE_ID_PATTERN.test(identity.providerId) &&
    typeof identity.offeringId === "string" &&
    STABLE_ID_PATTERN.test(identity.offeringId) &&
    typeof identity.resourceId === "string" &&
    STABLE_ID_PATTERN.test(identity.resourceId)
  );
}

function validQuotaIdentity(
  quotaKind: SubscriptionQuotaKind,
  quotaUnit: SubscriptionQuotaUnit | null,
): boolean {
  if (!SUBSCRIPTION_QUOTA_KINDS.includes(quotaKind)) return false;
  if (quotaKind === "opaque") return quotaUnit === null;
  if (quotaUnit === null || !SUBSCRIPTION_QUOTA_UNITS.includes(quotaUnit)) {
    return false;
  }
  if (quotaKind === "calibrated") return quotaUnit === "percent-point";
  return quotaUnit !== "percent-point";
}

function validPaidPolicyShape(
  policy: Extract<OveragePolicy, { kind: "paid" }>,
): boolean {
  if (
    !Number.isFinite(policy.usdPerUnit) ||
    policy.usdPerUnit <= 0 ||
    calculateOverageCostMicroUsd(1, policy.usdPerUnit) === null ||
    !isIsoDate(policy.effectiveFrom) ||
    (policy.effectiveThrough !== undefined &&
      (!isIsoDate(policy.effectiveThrough) ||
        policy.effectiveThrough < policy.effectiveFrom)) ||
    (policy.maxOverageUnits !== undefined &&
      (!Number.isFinite(policy.maxOverageUnits) || policy.maxOverageUnits < 0))
  ) {
    return false;
  }
  if (policy.appliesTo.kind === "whole-resource") return true;
  if (
    policy.appliesTo.kind !== "offering-list" ||
    policy.appliesTo.offeringRefs.length === 0
  ) {
    return false;
  }
  const references = new Set<string>();
  for (const reference of policy.appliesTo.offeringRefs) {
    if (
      typeof reference.providerId !== "string" ||
      !STABLE_ID_PATTERN.test(reference.providerId) ||
      typeof reference.offeringId !== "string" ||
      !STABLE_ID_PATTERN.test(reference.offeringId)
    ) {
      return false;
    }
    const key = JSON.stringify([reference.providerId, reference.offeringId]);
    if (references.has(key)) return false;
    references.add(key);
  }
  return true;
}

function policyAppliesToRoute(
  policy: Extract<OveragePolicy, { kind: "paid" }>,
  routeIdentity: SubscriptionRouteIdentity,
): boolean {
  return (
    policy.appliesTo.kind === "whole-resource" ||
    policy.appliesTo.offeringRefs.some(
      (reference) =>
        reference.providerId === routeIdentity.providerId &&
        reference.offeringId === routeIdentity.offeringId,
    )
  );
}

/**
 * Resolves overage applicability without issuing or accepting caller-declared
 * trust. The paid path can succeed only with evidence already issued by the
 * allowlisted resolver for this exact subscription resource and field.
 */
export function resolvePaidOverage(
  input: ResolvePaidOverageInput,
): OverageResolution {
  if (
    !validRouteIdentity(input.routeIdentity) ||
    !validQuotaIdentity(input.quotaKind, input.quotaUnit) ||
    !Number.isFinite(input.deficitUnits) ||
    input.deficitUnits < 0 ||
    toSubscriptionQuotaMicrounits(input.deficitUnits) === null ||
    toSubscriptionQuotaMicrounits(input.overageUnitsAlreadyUsed) === null ||
    !z.iso.datetime().safeParse(input.planningAsOf).success
  ) {
    return {
      status: "unavailable",
      unit: input.quotaUnit,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-policy-invalid",
    };
  }

  if (input.quotaKind === "opaque") {
    return {
      status: "unavailable",
      unit: null,
      deficitUnits: input.deficitUnits,
      reasonCode:
        input.policy.kind === "paid"
          ? "opaque-quota-overage-invalid"
          : input.policy.kind === "none"
            ? "overage-disabled"
            : "overage-unknown",
    };
  }
  const quotaUnit = input.quotaUnit;
  if (quotaUnit === null) {
    return {
      status: "unavailable",
      unit: null,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-policy-invalid",
    };
  }
  if (input.deficitUnits === 0) {
    return { status: "not-needed", unit: quotaUnit, overageUnits: 0, costMicroUsd: 0 };
  }
  if (input.policy.kind === "none") {
    return {
      status: "unavailable",
      unit: quotaUnit,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-disabled",
    };
  }
  if (input.policy.kind === "unknown") {
    return {
      status: "unavailable",
      unit: quotaUnit,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-unknown",
    };
  }

  const policy = input.policy;
  if (!validPaidPolicyShape(policy)) {
    return {
      status: "unavailable",
      unit: quotaUnit,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-policy-invalid",
    };
  }
  if (!policyAppliesToRoute(policy, input.routeIdentity)) {
    return {
      status: "unavailable",
      unit: quotaUnit,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-scope-mismatch",
    };
  }

  const planningDate = input.planningAsOf.slice(0, 10);
  if (planningDate < policy.effectiveFrom) {
    return {
      status: "unavailable",
      unit: quotaUnit,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-not-yet-effective",
    };
  }
  if (
    policy.effectiveThrough !== undefined &&
    planningDate > policy.effectiveThrough
  ) {
    return {
      status: "unavailable",
      unit: quotaUnit,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-expired",
    };
  }
  if (policy.unit !== quotaUnit) {
    return {
      status: "unavailable",
      unit: quotaUnit,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-unit-mismatch",
    };
  }
  const deficitMicrounits = toSubscriptionQuotaMicrounits(input.deficitUnits);
  const usedMicrounits = toSubscriptionQuotaMicrounits(
    input.overageUnitsAlreadyUsed,
  );
  const capMicrounits =
    policy.maxOverageUnits === undefined
      ? null
      : toSubscriptionQuotaMicrounits(policy.maxOverageUnits);
  if (
    deficitMicrounits === null ||
    usedMicrounits === null ||
    (policy.maxOverageUnits !== undefined && capMicrounits === null)
  ) {
    return {
      status: "unavailable",
      unit: quotaUnit,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-policy-invalid",
    };
  }
  if (
    capMicrounits !== null &&
    usedMicrounits + deficitMicrounits > capMicrounits
  ) {
    return {
      status: "unavailable",
      unit: quotaUnit,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-cap-exceeded",
    };
  }
  const costMicroUsd = calculateOverageCostMicroUsd(
    input.deficitUnits,
    policy.usdPerUnit,
  );
  if (costMicroUsd === null) {
    return {
      status: "unavailable",
      unit: quotaUnit,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-policy-invalid",
    };
  }
  const claimValue = overageClaimValue(policy);
  if (
    !isResolverIssuedProviderEvidence(policy.evidence) ||
    !isResolverIssuedEvidenceForClaim(
      policy.evidence,
      {
        catalogId: policy.evidence.registryId,
        catalogVersion: policy.evidence.registryVersion,
        entryId: policy.evidence.entryId,
        claimId: "subscription-overage",
        providerId: input.routeIdentity.providerId,
        subjectId: input.routeIdentity.resourceId,
        fieldPath: "subscription.overage",
      },
      claimValue,
    )
  ) {
    return {
      status: "unavailable",
      unit: quotaUnit,
      deficitUnits: input.deficitUnits,
      reasonCode: "overage-evidence-unverified",
    };
  }
  return {
    status: "covered",
    unit: quotaUnit,
    overageUnits: input.deficitUnits,
    costMicroUsd,
    policy: canonicalPolicyCopy(policy),
  };
}

import { PROVIDER_IDS, type ProviderId } from "@/types/domain";
import {
  CONDITIONAL_REASON_CODES,
  type AccessProviderId,
  type ApiRouteIdentity,
  type CanonicalRouteKey,
  type ConditionalAlternative,
  type ConditionalReasonCode,
  type Offering,
  type RouteIdentity,
  type SubscriptionResourceReference,
  type SubscriptionRouteIdentity,
} from "@/types/offerings";

const STABLE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const CUSTOM_PROVIDER_SUFFIX_PATTERN = /^[a-z0-9][a-z0-9-]{7,63}$/;
const CUSTOM_PROVIDER_PREFIX = "custom.";
const registeredProviderIds = new Set<string>(PROVIDER_IDS);
const conditionalReasonRank = new Map<ConditionalReasonCode, number>(
  CONDITIONAL_REASON_CODES.map((reason, index) => [reason, index]),
);

function assertStableId(value: string, label: string): void {
  if (!STABLE_ID_PATTERN.test(value)) {
    throw new Error(`${label} must be a non-empty lowercase ASCII stable ID.`);
  }
}

export function registeredAccessProviderId(providerId: ProviderId): AccessProviderId {
  return providerId as AccessProviderId;
}

export function createCustomAccessProviderId(stableId: string): AccessProviderId {
  if (!CUSTOM_PROVIDER_SUFFIX_PATTERN.test(stableId)) {
    throw new Error("Custom provider stable ID must be 8-64 lowercase ASCII letters, digits, or hyphens.");
  }
  return `${CUSTOM_PROVIDER_PREFIX}${stableId}` as AccessProviderId;
}

export function parseAccessProviderId(value: string): AccessProviderId {
  if (registeredProviderIds.has(value)) return value as AccessProviderId;
  if (
    value.startsWith(CUSTOM_PROVIDER_PREFIX) &&
    CUSTOM_PROVIDER_SUFFIX_PATTERN.test(value.slice(CUSTOM_PROVIDER_PREFIX.length))
  ) {
    return value as AccessProviderId;
  }
  throw new Error("Access provider ID is not registered or in the Custom namespace.");
}

export function createApiRouteIdentity(offering: Offering): ApiRouteIdentity {
  if (offering.mode !== "api") {
    throw new Error("Only API offerings can produce an API route identity.");
  }
  assertStableId(offering.id, "Offering ID");
  return Object.freeze({
    providerId: offering.providerId,
    offeringId: offering.id,
    resourceId: null,
  });
}

export function createSubscriptionRouteIdentity(
  offering: Offering,
  resource: SubscriptionResourceReference,
): SubscriptionRouteIdentity {
  if (offering.mode !== "subscription") {
    throw new Error("Only subscription offerings can use a subscription resource.");
  }
  assertStableId(offering.id, "Offering ID");
  assertStableId(resource.id, "Resource ID");
  if (
    resource.offeringRef.providerId !== offering.providerId ||
    resource.offeringRef.offeringId !== offering.id
  ) {
    throw new Error("Subscription resource must reference the selected provider and Offering.");
  }
  return Object.freeze({
    providerId: offering.providerId,
    offeringId: offering.id,
    resourceId: resource.id,
  });
}

export function routeIdentityToCanonicalKey(identity: RouteIdentity): CanonicalRouteKey {
  return Object.freeze([
    identity.providerId,
    identity.offeringId,
    identity.resourceId,
  ]) as CanonicalRouteKey;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function compareCanonicalRouteKeys(
  left: CanonicalRouteKey,
  right: CanonicalRouteKey,
): number {
  const providerDifference = compareStrings(left[0], right[0]);
  if (providerDifference !== 0) return providerDifference;

  const offeringDifference = compareStrings(left[1], right[1]);
  if (offeringDifference !== 0) return offeringDifference;

  if (left[2] === right[2]) return 0;
  if (left[2] === null) return -1;
  if (right[2] === null) return 1;
  return compareStrings(left[2], right[2]);
}

export function compareRouteIdentities(left: RouteIdentity, right: RouteIdentity): number {
  return compareCanonicalRouteKeys(
    routeIdentityToCanonicalKey(left),
    routeIdentityToCanonicalKey(right),
  );
}

export function assertUniqueRouteIdentities(identities: readonly RouteIdentity[]): void {
  const keys = new Set<string>();
  identities.forEach((identity) => {
    const serialized = JSON.stringify(routeIdentityToCanonicalKey(identity));
    if (keys.has(serialized)) throw new Error("Route identities must be unique.");
    keys.add(serialized);
  });
}

export function sortRouteIdentities(
  identities: readonly RouteIdentity[],
): RouteIdentity[] {
  assertUniqueRouteIdentities(identities);
  return [...identities].sort(compareRouteIdentities);
}

export function normalizeConditionalReasonCodes(
  reasonCodes: readonly ConditionalReasonCode[],
): readonly [ConditionalReasonCode, ...ConditionalReasonCode[]] {
  const unique = [...new Set(reasonCodes)].sort(
    (left, right) =>
      (conditionalReasonRank.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (conditionalReasonRank.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
  if (unique.length === 0) throw new Error("A conditional alternative needs a reason code.");
  return unique as [ConditionalReasonCode, ...ConditionalReasonCode[]];
}

function compareReasonVectors(
  left: readonly ConditionalReasonCode[],
  right: readonly ConditionalReasonCode[],
): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] === undefined) return -1;
    if (right[index] === undefined) return 1;
    const difference =
      (conditionalReasonRank.get(left[index]) ?? Number.MAX_SAFE_INTEGER) -
      (conditionalReasonRank.get(right[index]) ?? Number.MAX_SAFE_INTEGER);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function compareConditionalAlternatives(
  left: ConditionalAlternative,
  right: ConditionalAlternative,
): number {
  const primaryDifference = compareRouteIdentities(
    left.routeIdentity,
    right.routeIdentity,
  );
  if (primaryDifference !== 0) return primaryDifference;

  const fallbackDifference = compareRouteIdentities(
    left.fallbackRouteIdentity,
    right.fallbackRouteIdentity,
  );
  if (fallbackDifference !== 0) return fallbackDifference;

  return compareReasonVectors(
    normalizeConditionalReasonCodes(left.reasonCodes),
    normalizeConditionalReasonCodes(right.reasonCodes),
  );
}

export function sortConditionalAlternatives(
  alternatives: readonly ConditionalAlternative[],
): ConditionalAlternative[] {
  return [...alternatives].sort(compareConditionalAlternatives);
}

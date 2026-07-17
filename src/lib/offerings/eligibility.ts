import { validateInvocationLimits } from "@/lib/calculation/invocation-feasibility";
import type { CostScenario } from "@/types/domain";
import type {
  AccessCapabilityPolicyClaimValue,
  AccessLimitPolicyClaimValue,
  ModelIdentityClaimValue,
  OfferingIdentityClaimValue,
  RegistryClaimId,
  RegistryClaimValueById,
  SubscriptionEligibilityProfileClaimValue,
} from "@/config/versioned-provider-registry";
import {
  CAPABILITY_IDS,
  CONDITIONAL_REASON_CODES,
  OFFERING_INELIGIBLE_REASON_CODES,
  type CapabilityId,
  type ConditionalReasonCode,
  type EvidenceFieldPath,
  type EvidenceRef,
  type InvocationLimits,
  type ModelBoundOffering,
  type ModelDefinition,
  type ModelOpaqueSubscriptionOffering,
  type Offering,
  type OfferingEligibilityRequirement,
  type OfferingEligibilityResult,
  type OfferingIneligibleReasonCode,
  type OfferingScenarioFailure,
  type PlanningQualityTier,
  type ResolvedRegistryReference,
  type SourcedCapabilityProfile,
  type SourcedInvocationLimits,
} from "@/types/offerings";

import {
  isResolverIssuedEvidenceForClaim,
  isResolverIssuedPlannerQualityTier,
} from "./evidence-resolver";

const qualityRank: Readonly<Record<PlanningQualityTier, number>> = {
  economy: 0,
  balanced: 1,
  premium: 2,
};
const conditionalReasonRank = new Map(
  CONDITIONAL_REASON_CODES.map((reason, index) => [reason, index]),
);
const ineligibleReasonRank = new Map(
  OFFERING_INELIGIBLE_REASON_CODES.map((reason, index) => [reason, index]),
);
const capabilityRank = new Map(CAPABILITY_IDS.map((capability, index) => [capability, index]));
const issuedOfferingEligibilityResults = new WeakSet<object>();
const eligibilityRequirementKeys = new WeakMap<object, string>();

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return value;
  }

  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const key of Reflect.ownKeys(object)) {
    deepFreeze(Reflect.get(object, key), seen);
  }
  return Object.freeze(value);
}

function issueOfferingEligibilityResult(
  result: OfferingEligibilityResult,
  offering: Offering,
  requirement: OfferingEligibilityRequirement,
): OfferingEligibilityResult {
  const frozen = deepFreeze(result);
  issuedOfferingEligibilityResults.add(frozen);
  eligibilityRequirementKeys.set(
    frozen,
    eligibilityRequirementKey(offering.providerId, offering.id, requirement),
  );
  return frozen;
}

function eligibilityRequirementKey(
  providerId: string,
  offeringId: string,
  requirement: OfferingEligibilityRequirement,
): string {
  const capabilityOrder = new Map(
    CAPABILITY_IDS.map((capability, index) => [capability, index]),
  );
  const scenarioOrder = new Map<CostScenario, number>([
    ["low", 0],
    ["expected", 1],
    ["high", 2],
  ]);
  return JSON.stringify({
    providerId,
    offeringId,
    surface: requirement.surface,
    minimumQualityTier: requirement.minimumQualityTier,
    requiredCapabilities: [...new Set(requirement.requiredCapabilities)].sort(
      (left, right) =>
        (capabilityOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (capabilityOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
    ),
    tokenScenarios: [...requirement.tokenScenarios]
      .map(({ scenario, inputTokens, outputTokens }) => ({
        scenario,
        inputTokens,
        outputTokens,
      }))
      .sort(
        (left, right) =>
          (scenarioOrder.get(left.scenario) ?? Number.MAX_SAFE_INTEGER) -
          (scenarioOrder.get(right.scenario) ?? Number.MAX_SAFE_INTEGER),
      ),
  });
}

export function isResolverIssuedOfferingEligibilityResult(
  value: unknown,
): value is OfferingEligibilityResult {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    issuedOfferingEligibilityResults.has(value)
  );
}

export function isResolverIssuedOfferingEligibilityResultFor(
  value: unknown,
  providerId: string,
  offeringId: string,
  requirement: OfferingEligibilityRequirement,
): value is OfferingEligibilityResult {
  return (
    isResolverIssuedOfferingEligibilityResult(value) &&
    eligibilityRequirementKeys.get(value) ===
      eligibilityRequirementKey(providerId, offeringId, requirement)
  );
}

interface LimitKnowledge {
  complete: boolean;
  completeLimits?: InvocationLimits;
  trustedKnownLimits?: InvocationLimits;
  reasons: ConditionalReasonCode[];
}

interface CapabilityKnowledge {
  complete: boolean;
  completeCapabilities?: readonly CapabilityId[];
  reasons: ConditionalReasonCode[];
}

function normalizeConditionalReasons(
  reasons: readonly ConditionalReasonCode[],
): readonly [ConditionalReasonCode, ...ConditionalReasonCode[]] {
  const normalized = [...new Set(reasons)].sort(
    (left, right) =>
      (conditionalReasonRank.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (conditionalReasonRank.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
  if (normalized.length === 0) throw new Error("Conditional eligibility needs a reason.");
  return normalized as [ConditionalReasonCode, ...ConditionalReasonCode[]];
}

function normalizeIneligibleReasons(
  reasons: readonly OfferingIneligibleReasonCode[],
): readonly [OfferingIneligibleReasonCode, ...OfferingIneligibleReasonCode[]] {
  const normalized = [...new Set(reasons)].sort(
    (left, right) =>
      (ineligibleReasonRank.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (ineligibleReasonRank.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
  if (normalized.length === 0) throw new Error("Ineligible eligibility needs a reason.");
  return normalized as [OfferingIneligibleReasonCode, ...OfferingIneligibleReasonCode[]];
}

function minDefined(left?: number, right?: number): number | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return Math.min(left, right);
}

export function intersectInvocationLimits(
  left: InvocationLimits,
  right: InvocationLimits,
): InvocationLimits {
  const maxInputTokens = minDefined(left.maxInputTokens, right.maxInputTokens);
  const maxOutputTokens = minDefined(left.maxOutputTokens, right.maxOutputTokens);
  const maxCombinedTokens = minDefined(
    left.maxCombinedTokens,
    right.maxCombinedTokens,
  );
  return {
    ...(maxInputTokens === undefined ? {} : { maxInputTokens }),
    ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
    ...(maxCombinedTokens === undefined ? {} : { maxCombinedTokens }),
  };
}

function supportsClaim<I extends RegistryClaimId>(
  evidence: EvidenceRef | undefined,
  registryReference: ResolvedRegistryReference | undefined,
  claimId: I,
  providerId: string,
  subjectId: string,
  fieldPath: EvidenceFieldPath,
  assertedValue: RegistryClaimValueById[I],
): boolean {
  if (!registryReference) return false;
  return isResolverIssuedEvidenceForClaim(
    evidence,
    {
      catalogId: registryReference.registryId,
      catalogVersion: registryReference.registryVersion,
      entryId: registryReference.entryId,
      claimId,
      providerId,
      subjectId,
      fieldPath,
    },
    assertedValue,
  );
}

function modelIdentityValue(model: ModelDefinition): ModelIdentityClaimValue {
  return {
    modelId: model.id,
    displayName: model.displayName,
    modelProviderId: model.modelProviderId,
    family: model.family,
  };
}

function modelIdentityTrusted(model: ModelDefinition): boolean {
  return supportsClaim(
    model.evidence,
    model.registryReference,
    "model-identity",
    model.modelProviderId,
    model.id,
    "model.identity",
    modelIdentityValue(model),
  );
}

function modelBoundOfferingIdentityValue(
  offering: ModelBoundOffering,
): OfferingIdentityClaimValue {
  return {
    offeringId: offering.id,
    modelId: offering.modelId,
    mode: offering.mode,
    supportedSurfaces: [...offering.supportedSurfaces],
  };
}

function modelBoundOfferingIdentityTrusted(offering: ModelBoundOffering): boolean {
  const api = offering.mode === "api";
  return supportsClaim(
    offering.evidence,
    offering.registryReference,
    api ? "api-offering-identity" : "subscription-offering-identity",
    offering.providerId,
    offering.id,
    api ? "api.offering-identity" : "subscription.offering-identity",
    modelBoundOfferingIdentityValue(offering),
  );
}

function modelLimitKnowledge(
  model: ModelDefinition,
  profile: SourcedInvocationLimits,
): LimitKnowledge {
  if (profile.knowledge === "unknown") {
    return { complete: false, reasons: ["model-limits-incomplete"] };
  }
  const trusted = supportsClaim(
    profile.evidence,
    model.registryReference,
    "invocation-limits",
    model.modelProviderId,
    model.id,
    "model.invocation-limits",
    profile.limits,
  );
  return {
    complete: profile.knowledge === "complete" && trusted,
    ...(profile.knowledge === "complete" && trusted
      ? { completeLimits: { ...profile.limits } }
      : {}),
    ...(trusted ? { trustedKnownLimits: { ...profile.limits } } : {}),
    reasons:
      profile.knowledge === "complete" && trusted
        ? []
        : [trusted ? "model-limits-incomplete" : "evidence-authority-invalid"],
  };
}

function accessLimitKnowledge(
  offering: ModelBoundOffering,
  model: LimitKnowledge,
): LimitKnowledge {
  const policy = offering.limitPolicy;
  if (policy.kind === "unknown") {
    return { complete: false, reasons: ["access-limits-incomplete"] };
  }
  if (policy.kind === "same-as-model") {
    const claimId =
      offering.mode === "api" ? "api-access-limits" : "subscription-access-limits";
    const fieldPath =
      offering.mode === "api" ? "api.access-limits" : "subscription.access-limits";
    if (
      !supportsClaim(
        policy.evidence,
        offering.registryReference,
        claimId,
        offering.providerId,
        offering.id,
        fieldPath,
        { kind: "same-as-model" } satisfies AccessLimitPolicyClaimValue,
      )
    ) {
      return { complete: false, reasons: ["evidence-authority-invalid"] };
    }
    return {
      complete: model.complete,
      ...(model.completeLimits === undefined
        ? {}
        : { completeLimits: { ...model.completeLimits } }),
      ...(model.trustedKnownLimits === undefined
        ? {}
        : { trustedKnownLimits: { ...model.trustedKnownLimits } }),
      reasons: model.complete ? [] : ["access-limits-incomplete"],
    };
  }

  const profile = policy.invocationLimits;
  if (profile.knowledge === "unknown") {
    return { complete: false, reasons: ["access-limits-incomplete"] };
  }
  const claimId =
    offering.mode === "api" ? "api-access-limits" : "subscription-access-limits";
  const fieldPath =
    offering.mode === "api" ? "api.access-limits" : "subscription.access-limits";
  const trusted = supportsClaim(
    profile.evidence,
    offering.registryReference,
    claimId,
    offering.providerId,
    offering.id,
    fieldPath,
    {
      kind: "bounded",
      limits: profile.limits,
    } satisfies AccessLimitPolicyClaimValue,
  );
  return {
    complete: profile.knowledge === "complete" && trusted,
    ...(profile.knowledge === "complete" && trusted
      ? { completeLimits: { ...profile.limits } }
      : {}),
    ...(trusted ? { trustedKnownLimits: { ...profile.limits } } : {}),
    reasons:
      profile.knowledge === "complete" && trusted
        ? []
        : [trusted ? "access-limits-incomplete" : "evidence-authority-invalid"],
  };
}

function modelCapabilityKnowledge(
  model: ModelDefinition,
  profile: SourcedCapabilityProfile,
): CapabilityKnowledge {
  if (profile.knowledge === "unknown") {
    return { complete: false, reasons: ["model-capabilities-incomplete"] };
  }
  const trusted = supportsClaim(
    profile.evidence,
    model.registryReference,
    "model-capabilities",
    model.modelProviderId,
    model.id,
    "model.capabilities",
    { capabilityIds: [...profile.capabilityIds] },
  );
  return {
    complete: profile.knowledge === "complete" && trusted,
    ...(profile.knowledge === "complete" && trusted
      ? { completeCapabilities: [...profile.capabilityIds] }
      : {}),
    reasons:
      profile.knowledge === "complete" && trusted
        ? []
        : [trusted ? "model-capabilities-incomplete" : "evidence-authority-invalid"],
  };
}

function accessCapabilityKnowledge(
  offering: ModelBoundOffering,
  model: CapabilityKnowledge,
): CapabilityKnowledge {
  const policy = offering.capabilityPolicy;
  if (policy.kind === "unknown") {
    return { complete: false, reasons: ["access-capabilities-incomplete"] };
  }
  if (policy.kind === "same-as-model") {
    const claimId =
      offering.mode === "api"
        ? "api-access-capabilities"
        : "subscription-access-capabilities";
    const fieldPath =
      offering.mode === "api"
        ? "api.access-capabilities"
        : "subscription.access-capabilities";
    if (
      !supportsClaim(
        policy.evidence,
        offering.registryReference,
        claimId,
        offering.providerId,
        offering.id,
        fieldPath,
        { kind: "same-as-model" } satisfies AccessCapabilityPolicyClaimValue,
      )
    ) {
      return { complete: false, reasons: ["evidence-authority-invalid"] };
    }
    return {
      complete: model.complete,
      ...(model.completeCapabilities === undefined
        ? {}
        : { completeCapabilities: [...model.completeCapabilities] }),
      reasons: model.complete ? [] : ["access-capabilities-incomplete"],
    };
  }

  const profile = policy.capabilityProfile;
  if (profile.knowledge === "unknown") {
    return { complete: false, reasons: ["access-capabilities-incomplete"] };
  }
  const claimId =
    offering.mode === "api"
      ? "api-access-capabilities"
      : "subscription-access-capabilities";
  const fieldPath =
    offering.mode === "api"
      ? "api.access-capabilities"
      : "subscription.access-capabilities";
  const trusted = supportsClaim(
    profile.evidence,
    offering.registryReference,
    claimId,
    offering.providerId,
    offering.id,
    fieldPath,
    {
      kind: "bounded",
      capabilityIds: [...profile.capabilityIds],
    } satisfies AccessCapabilityPolicyClaimValue,
  );
  return {
    complete: profile.knowledge === "complete" && trusted,
    ...(profile.knowledge === "complete" && trusted
      ? { completeCapabilities: [...profile.capabilityIds] }
      : {}),
    reasons:
      profile.knowledge === "complete" && trusted
        ? []
        : [
            trusted
              ? "access-capabilities-incomplete"
              : "evidence-authority-invalid",
          ],
  };
}

export function intersectCapabilities(
  left: readonly CapabilityId[],
  right: readonly CapabilityId[],
): CapabilityId[] {
  const rightSet = new Set(right);
  return [...new Set(left)]
    .filter((capability) => rightSet.has(capability))
    .sort(
      (a, b) =>
        (capabilityRank.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (capabilityRank.get(b) ?? Number.MAX_SAFE_INTEGER),
    );
}

function validateRequirement(requirement: OfferingEligibilityRequirement): void {
  const scenarioNames = new Set(requirement.tokenScenarios.map(({ scenario }) => scenario));
  if (
    requirement.tokenScenarios.length !== 3 ||
    scenarioNames.size !== 3 ||
    !scenarioNames.has("low") ||
    !scenarioNames.has("expected") ||
    !scenarioNames.has("high")
  ) {
    throw new Error("Eligibility requires one Low, Expected, and High token scenario.");
  }
  requirement.tokenScenarios.forEach(({ inputTokens, outputTokens }) => {
    if (
      !Number.isInteger(inputTokens) ||
      !Number.isInteger(outputTokens) ||
      inputTokens < 0 ||
      outputTokens < 0
    ) {
      throw new Error("Eligibility token scenarios require non-negative integer tokens.");
    }
  });
}

function scenarioFailures(
  limits: InvocationLimits | undefined,
  requirement: OfferingEligibilityRequirement,
): OfferingScenarioFailure[] {
  if (limits === undefined) return [];
  return requirement.tokenScenarios.flatMap(({ scenario, inputTokens, outputTokens }) => {
    const result = validateInvocationLimits(limits, { inputTokens, outputTokens });
    return result.feasible ? [] : [{ scenario, failures: result.failures }];
  });
}

function failureReasonCodes(
  failures: readonly OfferingScenarioFailure[],
): OfferingIneligibleReasonCode[] {
  return failures.flatMap(({ failures: scenarioFailure }) =>
    scenarioFailure.map(({ code }) => code),
  );
}

function opaqueProfileClaimValue(
  offering: ModelOpaqueSubscriptionOffering,
): SubscriptionEligibilityProfileClaimValue | undefined {
  if (offering.eligibility.kind !== "profiled") return undefined;
  const { profile } = offering.eligibility;
  const { capabilityProfile, invocationLimits } = profile;
  if (
    capabilityProfile.knowledge !== "complete" ||
    invocationLimits.knowledge !== "complete"
  ) {
    return undefined;
  }
  return {
    offeringId: offering.id,
    providerId: offering.providerId,
    supportedSurfaces: [...offering.supportedSurfaces],
    qualityTier: profile.qualityTier,
    capabilityIds: [...capabilityProfile.capabilityIds],
    invocationLimits: { ...invocationLimits.limits },
  };
}

function opaqueProfileEvidenceTrusted(
  offering: ModelOpaqueSubscriptionOffering,
  evidence: EvidenceRef | undefined,
): boolean {
  const value = opaqueProfileClaimValue(offering);
  return (
    value !== undefined &&
    supportsClaim(
      evidence,
      offering.registryReference,
      "subscription-eligibility-profile",
      offering.providerId,
      offering.id,
      "subscription.eligibility-profile",
      value,
    )
  );
}

function baseConditionalReasons(offering: Offering): ConditionalReasonCode[] {
  const trusted =
    offering.kind === "model-bound"
      ? modelBoundOfferingIdentityTrusted(offering)
      : opaqueProfileEvidenceTrusted(offering, offering.evidence);
  return trusted ? [] : ["evidence-authority-invalid"];
}

function ineligibleResult(
  offering: Offering,
  modelId: string | null,
  reasons: readonly OfferingIneligibleReasonCode[],
  failures: readonly OfferingScenarioFailure[] = [],
): OfferingEligibilityResult {
  return {
    status: "ineligible",
    offeringId: offering.id,
    providerId: offering.providerId,
    modelId,
    reasonCodes: normalizeIneligibleReasons(reasons),
    scenarioFailures: failures.map((failure) => ({
      scenario: failure.scenario,
      failures: failure.failures.map((item) => ({ ...item })),
    })),
  };
}

function conditionalResult(
  offering: Offering,
  modelId: string | null,
  reasons: readonly ConditionalReasonCode[],
): OfferingEligibilityResult {
  return {
    status: "conditional",
    offeringId: offering.id,
    providerId: offering.providerId,
    modelId,
    reasonCodes: normalizeConditionalReasons(reasons),
    fallbackRequired: true,
  };
}

function resolveModelBoundEligibility(
  offering: ModelBoundOffering,
  modelsById: ReadonlyMap<string, ModelDefinition>,
  requirement: OfferingEligibilityRequirement,
): OfferingEligibilityResult {
  const model = modelsById.get(offering.modelId);
  if (!model || model.id !== offering.modelId) {
    return ineligibleResult(offering, offering.modelId, ["model-reference-missing"]);
  }
  const offeringTrusted = modelBoundOfferingIdentityTrusted(offering);
  if (offeringTrusted && !offering.supportedSurfaces.includes(requirement.surface)) {
    return ineligibleResult(offering, model.id, ["surface-incompatible"]);
  }

  const conditionalReasons = baseConditionalReasons(offering);
  const identityTrusted = modelIdentityTrusted(model);
  const qualityTierTrusted =
    identityTrusted &&
    isResolverIssuedPlannerQualityTier(
      model.evidence,
      model.registryReference,
      model.qualityTier,
    );
  if (!identityTrusted || !qualityTierTrusted) {
    conditionalReasons.push("evidence-authority-invalid");
  }
  if (
    qualityTierTrusted &&
    qualityRank[model.qualityTier] < qualityRank[requirement.minimumQualityTier]
  ) {
    return ineligibleResult(offering, model.id, ["below-minimum-quality"]);
  }

  const modelLimits = modelLimitKnowledge(model, model.invocationLimits);
  const accessLimits = accessLimitKnowledge(offering, modelLimits);
  conditionalReasons.push(...modelLimits.reasons, ...accessLimits.reasons);
  const trustedKnownLimits =
    modelLimits.trustedKnownLimits === undefined
      ? accessLimits.trustedKnownLimits
      : accessLimits.trustedKnownLimits === undefined
        ? modelLimits.trustedKnownLimits
        : intersectInvocationLimits(
            modelLimits.trustedKnownLimits,
            accessLimits.trustedKnownLimits,
          );
  const hardLimitFailures = scenarioFailures(trustedKnownLimits, requirement);
  if (hardLimitFailures.length > 0) {
    return ineligibleResult(
      offering,
      model.id,
      failureReasonCodes(hardLimitFailures),
      hardLimitFailures,
    );
  }

  const modelCapabilities = modelCapabilityKnowledge(model, model.capabilityProfile);
  const accessCapabilities = accessCapabilityKnowledge(offering, modelCapabilities);
  conditionalReasons.push(...modelCapabilities.reasons, ...accessCapabilities.reasons);

  const effectiveCapabilities =
    modelCapabilities.completeCapabilities === undefined ||
    accessCapabilities.completeCapabilities === undefined
      ? undefined
      : intersectCapabilities(
          modelCapabilities.completeCapabilities,
          accessCapabilities.completeCapabilities,
        );
  if (
    effectiveCapabilities !== undefined &&
    requirement.requiredCapabilities.some(
      (capability) => !effectiveCapabilities.includes(capability),
    )
  ) {
    return ineligibleResult(offering, model.id, ["required-capability-missing"]);
  }

  if (conditionalReasons.length > 0) {
    return conditionalResult(offering, model.id, conditionalReasons);
  }

  if (
    modelLimits.completeLimits === undefined ||
    accessLimits.completeLimits === undefined ||
    effectiveCapabilities === undefined
  ) {
    throw new Error("Complete offering eligibility must have resolved limits and capabilities.");
  }
  const effectiveLimits = intersectInvocationLimits(
    modelLimits.completeLimits,
    accessLimits.completeLimits,
  );
  return {
    status: "eligible",
    offeringId: offering.id,
    providerId: offering.providerId,
    modelId: model.id,
    qualityTier: model.qualityTier,
    effectiveLimits,
    effectiveCapabilities,
  };
}

function resolveModelOpaqueEligibility(
  offering: ModelOpaqueSubscriptionOffering,
  requirement: OfferingEligibilityRequirement,
): OfferingEligibilityResult {
  const reasons = baseConditionalReasons(offering);
  if (offering.eligibility.kind === "unprofiled") {
    reasons.push("profile-unverified");
    return conditionalResult(offering, null, reasons);
  }

  const { profile } = offering.eligibility;
  const { invocationLimits, capabilityProfile } = profile;
  const limitsComplete = invocationLimits.knowledge === "complete";
  const capabilitiesComplete = capabilityProfile.knowledge === "complete";
  const profileTrusted =
    limitsComplete &&
    capabilitiesComplete &&
    opaqueProfileEvidenceTrusted(offering, offering.evidence) &&
    opaqueProfileEvidenceTrusted(offering, offering.eligibility.evidence) &&
    opaqueProfileEvidenceTrusted(offering, invocationLimits.evidence) &&
    opaqueProfileEvidenceTrusted(offering, capabilityProfile.evidence);
  if (!profileTrusted) reasons.push("profile-unverified");
  if (profileTrusted && !offering.supportedSurfaces.includes(requirement.surface)) {
    return ineligibleResult(offering, null, ["surface-incompatible"]);
  }
  if (
    profileTrusted &&
    qualityRank[profile.qualityTier] < qualityRank[requirement.minimumQualityTier]
  ) {
    return ineligibleResult(offering, null, ["below-minimum-quality"]);
  }

  if (!limitsComplete) reasons.push("model-limits-incomplete");
  if (!capabilitiesComplete) reasons.push("model-capabilities-incomplete");

  const trustedLimits =
    profileTrusted && invocationLimits.knowledge === "complete"
      ? invocationLimits.limits
      : undefined;
  const hardLimitFailures = scenarioFailures(trustedLimits, requirement);
  if (hardLimitFailures.length > 0) {
    return ineligibleResult(
      offering,
      null,
      failureReasonCodes(hardLimitFailures),
      hardLimitFailures,
    );
  }

  const effectiveCapabilities =
    profileTrusted && capabilityProfile.knowledge === "complete"
      ? [...capabilityProfile.capabilityIds]
      : undefined;
  if (
    effectiveCapabilities !== undefined &&
    requirement.requiredCapabilities.some(
      (capability) => !effectiveCapabilities.includes(capability),
    )
  ) {
    return ineligibleResult(offering, null, ["required-capability-missing"]);
  }

  if (reasons.length > 0) return conditionalResult(offering, null, reasons);
  if (
    invocationLimits.knowledge !== "complete" ||
    effectiveCapabilities === undefined
  ) {
    throw new Error("Complete opaque eligibility must have resolved limits and capabilities.");
  }

  return {
    status: "eligible",
    offeringId: offering.id,
    providerId: offering.providerId,
    modelId: null,
    qualityTier: profile.qualityTier,
    effectiveLimits: { ...invocationLimits.limits },
    effectiveCapabilities,
  };
}

export function resolveOfferingEligibility(
  offering: Offering,
  modelsById: ReadonlyMap<string, ModelDefinition>,
  requirement: OfferingEligibilityRequirement,
): OfferingEligibilityResult {
  validateRequirement(requirement);
  return issueOfferingEligibilityResult(
    offering.kind === "model-bound"
      ? resolveModelBoundEligibility(offering, modelsById, requirement)
      : resolveModelOpaqueEligibility(offering, requirement),
    offering,
    requirement,
  );
}

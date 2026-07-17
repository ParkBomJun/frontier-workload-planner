import type {
  CostScenario,
  InvocationLimitFailure,
  InvocationTokenScenario,
  ModelTier,
  ProviderId,
} from "./domain";
import type {
  CapabilityId,
  PlanningQualityTier,
  WorkSurface,
} from "./workload";

export {
  CAPABILITY_IDS,
  PLANNING_QUALITY_TIERS,
  WORK_SURFACES,
  type CapabilityId,
  type PlanningQualityTier,
  type WorkSurface,
} from "./workload";

declare const accessProviderIdBrand: unique symbol;
export type AccessProviderId = string & {
  readonly [accessProviderIdBrand]: "AccessProviderId";
};

export interface StoredCatalogEvidenceInput {
  kind: "catalog-ref";
  catalogId: string;
  catalogVersion: string;
  entryId: string;
  claimId: string;
}

export interface StoredPresetEvidenceInput {
  kind: "preset-ref";
  presetId: string;
  presetVersion: string;
  claimId: string;
}

export interface StoredConnectorEvidenceInput {
  kind: "connector-ref";
  adapterId: string;
  adapterVersion: string;
  bindingId: string;
  snapshotId: string;
  snapshotVersion: string;
}

export interface UserObservedEvidence {
  kind: "user-observed";
  observedAt: string;
  note: string;
}

export type StoredEvidenceInput =
  | StoredCatalogEvidenceInput
  | StoredPresetEvidenceInput
  | StoredConnectorEvidenceInput
  | UserObservedEvidence;

export type EvidenceFieldPath =
  | "model.identity"
  | "model.invocation-limits"
  | "model.capabilities"
  | "api.offering-identity"
  | "api.access-limits"
  | "api.access-capabilities"
  | "subscription.offering-identity"
  | "subscription.access-limits"
  | "subscription.access-capabilities"
  | "api.standard-text-pricing"
  | "subscription.eligibility-profile"
  | "subscription.availability"
  | "subscription.commitment"
  | "subscription.quota.included"
  | "subscription.quota.remaining"
  | "subscription.quota.initial-capacity"
  | "subscription.quota.consumption"
  | "subscription.reset"
  | "subscription.overage";

export interface EvidenceSubject {
  providerId: string;
  subjectId: string;
  fieldPath: EvidenceFieldPath;
}

declare const resolvedEvidenceBrand: unique symbol;

export interface ProviderPublishedEvidence extends EvidenceSubject {
  kind: "provider-published";
  authority: "allowlisted-registry-resolver";
  registryId: string;
  registryVersion: string;
  entryId: string;
  claimId: string;
  sourceUrl: string;
  verifiedAt: string;
  readonly [resolvedEvidenceBrand]: "provider-published";
}

export interface VerifiedConnectorEvidence {
  kind: "verified-connector-snapshot";
  authority: "verified-connector-resolver";
  adapterId: string;
  adapterVersion: string;
  bindingId: string;
  snapshotId: string;
  capturedAt: string;
  readonly [resolvedEvidenceBrand]: "verified-connector-snapshot";
}

export type EvidenceRef =
  | ProviderPublishedEvidence
  | VerifiedConnectorEvidence
  | UserObservedEvidence;

export interface ResolvedRegistryReference {
  registryId: string;
  registryVersion: string;
  entryId: string;
}

export interface InvocationLimits {
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxCombinedTokens?: number;
}

export type SourcedInvocationLimits =
  | {
      knowledge: "complete";
      limits: InvocationLimits;
      evidence: EvidenceRef;
    }
  | {
      knowledge: "partial";
      limits: InvocationLimits;
      reason: string;
      evidence: EvidenceRef;
    }
  | { knowledge: "unknown"; reason: string; evidence?: EvidenceRef };

export type SourcedCapabilityProfile =
  | {
      knowledge: "complete";
      capabilityIds: readonly CapabilityId[];
      evidence: EvidenceRef;
    }
  | {
      knowledge: "partial";
      capabilityIds: readonly CapabilityId[];
      reason: string;
      evidence: EvidenceRef;
    }
  | { knowledge: "unknown"; reason: string; evidence?: EvidenceRef };

export type OfferingLimitPolicy =
  | { kind: "same-as-model"; evidence: EvidenceRef }
  | { kind: "bounded"; invocationLimits: SourcedInvocationLimits }
  | { kind: "unknown"; evidence?: EvidenceRef };

export type OfferingCapabilityPolicy =
  | { kind: "same-as-model"; evidence: EvidenceRef }
  | { kind: "bounded"; capabilityProfile: SourcedCapabilityProfile }
  | { kind: "unknown"; evidence?: EvidenceRef };

export interface ModelDefinition {
  id: string;
  modelProviderId: string;
  family: string;
  displayName: string;
  qualityTier: PlanningQualityTier;
  capabilityProfile: SourcedCapabilityProfile;
  invocationLimits: SourcedInvocationLimits;
  evidence: EvidenceRef;
  registryReference: ResolvedRegistryReference;
}

interface OfferingBase {
  id: string;
  providerId: AccessProviderId;
  supportedSurfaces: readonly WorkSurface[];
  evidence: EvidenceRef;
  registryReference?: ResolvedRegistryReference;
}

export interface ModelBoundOffering extends OfferingBase {
  kind: "model-bound";
  mode: "api" | "subscription";
  modelId: string;
  limitPolicy: OfferingLimitPolicy;
  capabilityPolicy: OfferingCapabilityPolicy;
}

export interface ModelOpaqueEligibilityProfile {
  qualityTier: PlanningQualityTier;
  capabilityProfile: SourcedCapabilityProfile;
  invocationLimits: SourcedInvocationLimits;
}

export type ModelOpaqueReasonCode =
  | "model-undisclosed"
  | "quality-undocumented"
  | "capabilities-undocumented"
  | "limits-undocumented";

export interface ModelOpaqueSubscriptionOffering extends OfferingBase {
  kind: "model-opaque-subscription";
  mode: "subscription";
  modelId?: never;
  eligibility:
    | {
        kind: "profiled";
        profile: ModelOpaqueEligibilityProfile;
        evidence: EvidenceRef;
      }
    | {
        kind: "unprofiled";
        reason: ModelOpaqueReasonCode;
        evidence?: EvidenceRef;
      };
}

export type Offering = ModelBoundOffering | ModelOpaqueSubscriptionOffering;

export interface ApiRouteIdentity {
  providerId: AccessProviderId;
  offeringId: string;
  resourceId: null;
}

export interface SubscriptionRouteIdentity {
  providerId: AccessProviderId;
  offeringId: string;
  resourceId: string;
}

export type RouteIdentity = ApiRouteIdentity | SubscriptionRouteIdentity;
export type CanonicalRouteKey = readonly [AccessProviderId, string, string | null];

export interface SubscriptionResourceReference {
  id: string;
  offeringRef: {
    providerId: AccessProviderId;
    offeringId: string;
  };
}

export const CONDITIONAL_REASON_CODES = [
  "catalog-reference-unresolved",
  "catalog-version-mismatch",
  "catalog-claim-mismatch",
  "preset-version-mismatch",
  "connector-unverified",
  "connector-binding-mismatch",
  "connector-snapshot-stale",
  "connector-snapshot-replayed",
  "connector-receipt-invalid",
  "evidence-authority-invalid",
  "profile-unverified",
  "model-limits-incomplete",
  "access-limits-incomplete",
  "model-capabilities-incomplete",
  "access-capabilities-incomplete",
  "availability-uncertain",
  "consumption-user-observed",
  "quota-calibrated",
  "quota-opaque",
  "quota-insufficient-observed",
  "initial-capacity-unpublished",
] as const;

export type ConditionalReasonCode = (typeof CONDITIONAL_REASON_CODES)[number];

export const OFFERING_INELIGIBLE_REASON_CODES = [
  "model-reference-missing",
  "surface-incompatible",
  "below-minimum-quality",
  "required-capability-missing",
  "input-limit-exceeded",
  "output-limit-exceeded",
  "context-limit-exceeded",
] as const;

export type OfferingIneligibleReasonCode =
  (typeof OFFERING_INELIGIBLE_REASON_CODES)[number];

export interface ConditionalAlternative {
  routeIdentity: SubscriptionRouteIdentity;
  reasonCodes: readonly [ConditionalReasonCode, ...ConditionalReasonCode[]];
  fallbackRouteIdentity: ApiRouteIdentity;
}

export interface OfferingTokenScenario extends InvocationTokenScenario {
  scenario: CostScenario;
}

export interface OfferingEligibilityRequirement {
  surface: WorkSurface;
  minimumQualityTier: PlanningQualityTier;
  requiredCapabilities: readonly CapabilityId[];
  tokenScenarios: readonly OfferingTokenScenario[];
}

export interface OfferingScenarioFailure {
  scenario: CostScenario;
  failures: InvocationLimitFailure[];
}

interface OfferingEligibilityBase {
  offeringId: string;
  providerId: AccessProviderId;
}

export interface EligibleOfferingResult extends OfferingEligibilityBase {
  status: "eligible";
  qualityTier: PlanningQualityTier;
  effectiveLimits: InvocationLimits;
  effectiveCapabilities: readonly CapabilityId[];
  modelId: string | null;
}

export interface ConditionalOfferingResult extends OfferingEligibilityBase {
  status: "conditional";
  reasonCodes: readonly [ConditionalReasonCode, ...ConditionalReasonCode[]];
  fallbackRequired: true;
  modelId: string | null;
}

export interface IneligibleOfferingResult extends OfferingEligibilityBase {
  status: "ineligible";
  reasonCodes: readonly [
    OfferingIneligibleReasonCode,
    ...OfferingIneligibleReasonCode[],
  ];
  scenarioFailures: readonly OfferingScenarioFailure[];
  modelId: string | null;
}

export type OfferingEligibilityResult =
  | EligibleOfferingResult
  | ConditionalOfferingResult
  | IneligibleOfferingResult;

export const LEGACY_TO_PLANNING_TIER: Readonly<Record<ModelTier, PlanningQualityTier>> = {
  economy: "economy",
  balanced: "balanced",
  frontier: "premium",
};

export interface LegacyApiCatalogReference {
  providerId: ProviderId;
  tier: ModelTier;
}

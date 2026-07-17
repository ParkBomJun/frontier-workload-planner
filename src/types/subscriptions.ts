import type { CostScenario, PlannerTaskAnalysis } from "./domain";
import type {
  AccessProviderId,
  ApiRouteIdentity,
  ConditionalReasonCode,
  EvidenceRef,
  OfferingEligibilityResult,
  ProviderPublishedEvidence,
  StoredEvidenceInput,
  SubscriptionRouteIdentity,
  UserObservedEvidence,
  VerifiedConnectorEvidence,
} from "./offerings";

export const SUBSCRIPTION_RESOURCE_CONTRACT_VERSION = "subscription-resource-v1" as const;

export const SUBSCRIPTION_OWNERSHIPS = ["owned", "candidate-new"] as const;
export const SUBSCRIPTION_AVAILABILITY_STATUSES = [
  "available",
  "unavailable",
  "uncertain",
] as const;
export const SUBSCRIPTION_QUOTA_UNITS = ["request", "credit", "percent-point"] as const;
export const SUBSCRIPTION_CONSUMPTION_BASES = ["task", "analysis-iteration"] as const;
export const SUBSCRIPTION_QUOTA_KINDS = [
  "metered",
  "calibrated",
  "initial-capacity",
  "opaque",
] as const;

export const QUOTA_DEMAND_UNKNOWN_REASON_CODES = [
  "consumption-rule-missing",
  "consumption-evidence-unverified",
  "consumption-unit-mismatch",
  "consumption-value-non-finite",
  "consumption-range-invalid",
  "analysis-iteration-count-invalid",
  "quota-opaque",
] as const;

export const QUOTA_RESERVATION_FAILURE_CODES = [
  "resource-unavailable",
  "demand-unknown",
  "quota-unit-mismatch",
  "duplicate-task-reservation",
  "insufficient-included-quota",
  "overage-unavailable",
] as const;

export const OVERAGE_RESOLUTION_FAILURE_CODES = [
  "overage-disabled",
  "overage-unknown",
  "overage-evidence-unverified",
  "overage-policy-invalid",
  "overage-scope-mismatch",
  "overage-not-yet-effective",
  "overage-expired",
  "overage-unit-mismatch",
  "overage-cap-exceeded",
  "opaque-quota-overage-invalid",
] as const;

export const CONDITIONAL_FALLBACK_FAILURE_CODES = [
  "no-compatible-api-fallback",
  "fallback-over-incremental-cash-budget",
] as const;

export type SubscriptionResourceContractVersion =
  typeof SUBSCRIPTION_RESOURCE_CONTRACT_VERSION;
export type SubscriptionOwnership = (typeof SUBSCRIPTION_OWNERSHIPS)[number];
export type SubscriptionAvailabilityStatus =
  (typeof SUBSCRIPTION_AVAILABILITY_STATUSES)[number];
export type SubscriptionQuotaUnit = (typeof SUBSCRIPTION_QUOTA_UNITS)[number];
export type MeteredQuotaUnit = Exclude<SubscriptionQuotaUnit, "percent-point">;
export type SubscriptionConsumptionBasis =
  (typeof SUBSCRIPTION_CONSUMPTION_BASES)[number];
export type SubscriptionQuotaKind = (typeof SUBSCRIPTION_QUOTA_KINDS)[number];
export type QuotaDemandUnknownReasonCode =
  (typeof QUOTA_DEMAND_UNKNOWN_REASON_CODES)[number];
export type QuotaReservationFailureCode =
  (typeof QUOTA_RESERVATION_FAILURE_CODES)[number];
export type OverageResolutionFailureCode =
  (typeof OVERAGE_RESOLUTION_FAILURE_CODES)[number];
export type ConditionalFallbackFailureCode =
  (typeof CONDITIONAL_FALLBACK_FAILURE_CODES)[number];

export type StoredRegistryEvidenceInput = Extract<
  StoredEvidenceInput,
  { kind: "catalog-ref" | "preset-ref" }
>;
export type StoredCapacitySnapshotEvidenceInput = Extract<
  StoredEvidenceInput,
  { kind: "connector-ref" | "user-observed" }
>;
export type CapacitySnapshotEvidence = UserObservedEvidence | VerifiedConnectorEvidence;

export interface StoredSourcedValueInput<T, E extends StoredEvidenceInput = StoredEvidenceInput> {
  value: T;
  evidence: E;
}

export interface SourcedValue<T, E extends EvidenceRef = EvidenceRef> {
  value: T;
  evidence: E;
}

export interface StoredSubscriptionOfferingReferenceInput {
  providerId: string;
  offeringId: string;
}

export interface SubscriptionOfferingReference {
  providerId: AccessProviderId;
  offeringId: string;
}

export interface StoredAvailabilityInput {
  status: SubscriptionAvailabilityStatus;
  evidence: StoredEvidenceInput;
}

export interface SubscriptionAvailability {
  status: SubscriptionAvailabilityStatus;
  evidence: EvidenceRef;
}

export interface StoredFixedConsumptionRuleInput {
  kind: "fixed-per-basis";
  unit: MeteredQuotaUnit;
  basis: SubscriptionConsumptionBasis;
  units: number;
  evidence: StoredRegistryEvidenceInput;
}

export interface StoredObservedRangeConsumptionRuleInput {
  kind: "observed-range-per-basis";
  unit: SubscriptionQuotaUnit;
  basis: SubscriptionConsumptionBasis;
  low: number;
  expected: number;
  high: number;
  sampleSize: number;
  evidence: Extract<StoredEvidenceInput, { kind: "user-observed" }>;
}

export type StoredConsumptionRuleInput =
  | StoredFixedConsumptionRuleInput
  | StoredObservedRangeConsumptionRuleInput;
export type StoredMeteredConsumptionRuleInput =
  | StoredFixedConsumptionRuleInput
  | (StoredObservedRangeConsumptionRuleInput & { unit: MeteredQuotaUnit });

export interface FixedConsumptionRule {
  kind: "fixed-per-basis";
  unit: MeteredQuotaUnit;
  basis: SubscriptionConsumptionBasis;
  units: number;
  evidence: ProviderPublishedEvidence;
}

export interface ObservedRangeConsumptionRule {
  kind: "observed-range-per-basis";
  unit: SubscriptionQuotaUnit;
  basis: SubscriptionConsumptionBasis;
  low: number;
  expected: number;
  high: number;
  sampleSize: number;
  evidence: UserObservedEvidence;
}

export type ConsumptionRule = FixedConsumptionRule | ObservedRangeConsumptionRule;
export type MeteredConsumptionRule =
  | FixedConsumptionRule
  | (ObservedRangeConsumptionRule & { unit: MeteredQuotaUnit });

export interface StoredMeteredSubscriptionQuotaInput {
  kind: "metered";
  unit: MeteredQuotaUnit;
  included: StoredSourcedValueInput<number>;
  remaining: StoredSourcedValueInput<number, StoredCapacitySnapshotEvidenceInput>;
  consumptionRule: StoredMeteredConsumptionRuleInput;
}

export interface StoredCalibratedSubscriptionQuotaInput {
  kind: "calibrated";
  unit: "percent-point";
  remainingPercent: StoredSourcedValueInput<number, StoredCapacitySnapshotEvidenceInput>;
  consumptionRule: StoredObservedRangeConsumptionRuleInput & { unit: "percent-point" };
}

export interface StoredInitialCapacitySubscriptionQuotaInput {
  kind: "initial-capacity";
  unit: MeteredQuotaUnit;
  included: StoredSourcedValueInput<number, StoredRegistryEvidenceInput>;
  availableOnActivation: StoredSourcedValueInput<number, StoredRegistryEvidenceInput>;
  appliesFor: "one-plan-period";
  consumptionRule: StoredFixedConsumptionRuleInput;
}

export interface StoredOpaqueSubscriptionQuotaInput {
  kind: "opaque";
  description: string;
  consumptionRule?: never;
}

export type StoredOwnedSubscriptionQuotaInput =
  | StoredMeteredSubscriptionQuotaInput
  | StoredCalibratedSubscriptionQuotaInput
  | StoredOpaqueSubscriptionQuotaInput;
export type StoredCandidateSubscriptionQuotaInput =
  | StoredInitialCapacitySubscriptionQuotaInput
  | StoredOpaqueSubscriptionQuotaInput;
export type StoredSubscriptionQuotaInput =
  | StoredOwnedSubscriptionQuotaInput
  | StoredCandidateSubscriptionQuotaInput;

export interface MeteredSubscriptionQuota {
  kind: "metered";
  unit: MeteredQuotaUnit;
  included: SourcedValue<number>;
  remaining: SourcedValue<number, CapacitySnapshotEvidence>;
  consumptionRule: MeteredConsumptionRule;
}

export interface CalibratedSubscriptionQuota {
  kind: "calibrated";
  unit: "percent-point";
  remainingPercent: SourcedValue<number, CapacitySnapshotEvidence>;
  consumptionRule: ObservedRangeConsumptionRule & { unit: "percent-point" };
}

export interface InitialCapacitySubscriptionQuota {
  kind: "initial-capacity";
  unit: MeteredQuotaUnit;
  included: SourcedValue<number, ProviderPublishedEvidence>;
  availableOnActivation: SourcedValue<number, ProviderPublishedEvidence>;
  appliesFor: "one-plan-period";
  consumptionRule: FixedConsumptionRule;
}

export interface OpaqueSubscriptionQuota {
  kind: "opaque";
  description: string;
  consumptionRule?: never;
}

export type OwnedSubscriptionQuota =
  | MeteredSubscriptionQuota
  | CalibratedSubscriptionQuota
  | OpaqueSubscriptionQuota;
export type CandidateSubscriptionQuota =
  | InitialCapacitySubscriptionQuota
  | OpaqueSubscriptionQuota;
export type SubscriptionQuota = OwnedSubscriptionQuota | CandidateSubscriptionQuota;

export interface StoredExistingSubscriptionCommitmentInput {
  kind: "existing";
  currentFeeUsd: number;
  currency: "USD";
  billingBasis: "current-plan-period";
  evidence: StoredEvidenceInput;
}

export interface StoredNewSubscriptionCommitmentInput {
  kind: "new";
  feeUsd: number;
  currency: "USD";
  billingBasis: "one-plan-period";
  evidence: StoredEvidenceInput;
}

export interface ExistingSubscriptionCommitment {
  kind: "existing";
  currentFeeUsd: number;
  currency: "USD";
  billingBasis: "current-plan-period";
  evidence: EvidenceRef;
}

export interface NewSubscriptionCommitment {
  kind: "new";
  feeUsd: number;
  currency: "USD";
  billingBasis: "one-plan-period";
  evidence: EvidenceRef;
}

export interface StoredFixedResetPolicyInput {
  kind: "fixed";
  cadenceDays: number;
  nextResetAt: string;
  evidence: StoredEvidenceInput;
}

export interface StoredRollingResetPolicyInput {
  kind: "rolling";
  windowHours: number;
  evidence: StoredEvidenceInput;
}

export type StoredResetPolicyInput =
  | { kind: "none" }
  | StoredFixedResetPolicyInput
  | StoredRollingResetPolicyInput
  | { kind: "unknown" };

export interface FixedResetPolicy {
  kind: "fixed";
  cadenceDays: number;
  nextResetAt: string;
  evidence: EvidenceRef;
}

export interface RollingResetPolicy {
  kind: "rolling";
  windowHours: number;
  evidence: EvidenceRef;
}

export type ResetPolicy =
  | { kind: "none" }
  | FixedResetPolicy
  | RollingResetPolicy
  | { kind: "unknown" };

export type OverageApplicability =
  | { kind: "whole-resource" }
  | {
      kind: "offering-list";
      offeringRefs: readonly SubscriptionOfferingReference[];
    };

export type StoredOverageApplicabilityInput =
  | { kind: "whole-resource" }
  | {
      kind: "offering-list";
      offeringRefs: readonly StoredSubscriptionOfferingReferenceInput[];
    };

export interface StoredPaidOveragePolicyInput {
  kind: "paid";
  unit: SubscriptionQuotaUnit;
  usdPerUnit: number;
  appliesTo: StoredOverageApplicabilityInput;
  effectiveFrom: string;
  effectiveThrough?: string;
  maxOverageUnits?: number;
  evidence: StoredRegistryEvidenceInput;
}

export type StoredOveragePolicyInput =
  | { kind: "none" }
  | StoredPaidOveragePolicyInput
  | { kind: "unknown" };

export interface PaidOveragePolicy {
  kind: "paid";
  unit: SubscriptionQuotaUnit;
  usdPerUnit: number;
  appliesTo: OverageApplicability;
  effectiveFrom: string;
  effectiveThrough?: string;
  maxOverageUnits?: number;
  evidence: ProviderPublishedEvidence;
}

export type OveragePolicy =
  | { kind: "none" }
  | PaidOveragePolicy
  | { kind: "unknown" };

interface StoredSubscriptionResourceInputBase {
  contractVersion: SubscriptionResourceContractVersion;
  id: string;
  offeringRef: StoredSubscriptionOfferingReferenceInput;
  availability: StoredAvailabilityInput;
  reset: StoredResetPolicyInput;
  overage: StoredOveragePolicyInput;
}

export interface StoredOwnedSubscriptionResourceInput
  extends StoredSubscriptionResourceInputBase {
  ownership: "owned";
  commitment: StoredExistingSubscriptionCommitmentInput;
  quota: StoredOwnedSubscriptionQuotaInput;
}

export interface StoredCandidateSubscriptionResourceInput
  extends StoredSubscriptionResourceInputBase {
  ownership: "candidate-new";
  commitment: StoredNewSubscriptionCommitmentInput;
  quota: StoredCandidateSubscriptionQuotaInput;
}

export type StoredSubscriptionResourceInput =
  | StoredOwnedSubscriptionResourceInput
  | StoredCandidateSubscriptionResourceInput;

interface ResolvedSubscriptionResourceBase {
  contractVersion: SubscriptionResourceContractVersion;
  id: string;
  offeringRef: SubscriptionOfferingReference;
  availability: SubscriptionAvailability;
  reset: ResetPolicy;
  overage: OveragePolicy;
}

export interface ResolvedOwnedSubscriptionResource extends ResolvedSubscriptionResourceBase {
  ownership: "owned";
  commitment: ExistingSubscriptionCommitment;
  quota: OwnedSubscriptionQuota;
}

export interface ResolvedCandidateSubscriptionResource extends ResolvedSubscriptionResourceBase {
  ownership: "candidate-new";
  commitment: NewSubscriptionCommitment;
  quota: CandidateSubscriptionQuota;
}

export type ResolvedSubscriptionResource =
  | ResolvedOwnedSubscriptionResource
  | ResolvedCandidateSubscriptionResource;

export type SubscriptionResourceResolution =
  | {
      status: "resolved";
      source: StoredSubscriptionResourceInput;
      resource: ResolvedSubscriptionResource;
      reasonCodes: readonly [];
    }
  | {
      status: "conditional";
      source: StoredSubscriptionResourceInput;
      reference: {
        id: string;
        offeringRef: SubscriptionOfferingReference;
      };
      resource: ResolvedSubscriptionResource | null;
      reasonCodes: readonly [ConditionalReasonCode, ...ConditionalReasonCode[]];
    }
  | {
      status: "invalid";
      source: unknown;
      reasonCode: "invalid-subscription-resource-input";
    };

export interface QuotaDemandRange {
  unit: SubscriptionQuotaUnit;
  low: number;
  expected: number;
  high: number;
}

export interface QuotaDemandInput {
  quota: SubscriptionQuota;
  analysis: PlannerTaskAnalysis;
  evidenceSubject: {
    providerId: string;
    subjectId: string;
  };
}

export interface ConfirmedQuotaDemandResult {
  status: "known";
  confidence: "provider-published";
  basis: SubscriptionConsumptionBasis;
  demand: QuotaDemandRange;
  evidence: ProviderPublishedEvidence;
}

export interface ObservedQuotaDemandResult {
  status: "known";
  confidence: "user-observed";
  basis: SubscriptionConsumptionBasis;
  demand: QuotaDemandRange;
  evidence: UserObservedEvidence;
}

export type QuotaDemandResult =
  | ConfirmedQuotaDemandResult
  | ObservedQuotaDemandResult
  | {
      status: "unknown";
      reasonCode: QuotaDemandUnknownReasonCode;
      unit: SubscriptionQuotaUnit | null;
    };

interface SubscriptionQuotaReservationBase {
  taskId: string;
  routeIdentity: SubscriptionRouteIdentity;
  unit: SubscriptionQuotaUnit;
  reservedUnits: number;
  demand: QuotaDemandRange;
}

export interface ConfirmedSubscriptionQuotaReservation
  extends SubscriptionQuotaReservationBase {
  reservationBasis: "expected-confirmed";
}

export interface ConditionalSubscriptionQuotaReservation
  extends SubscriptionQuotaReservationBase {
  reservationBasis: "high-conditional";
}

export type SubscriptionQuotaReservation =
  | ConfirmedSubscriptionQuotaReservation
  | ConditionalSubscriptionQuotaReservation;

export interface NumericDerivedQuotaLedger {
  kind: "numeric";
  routeIdentity: SubscriptionRouteIdentity;
  planningAsOf: string;
  unit: SubscriptionQuotaUnit;
  sourceAvailableUnits: number;
  remainingUnits: number;
  sourceAvailableMicrounits: number;
  remainingMicrounits: number;
  overageUnitsUsed: number;
  overageMicrounitsUsed: number;
  overageCostMicroUsd: number;
  reservations: readonly SubscriptionQuotaReservation[];
}

export interface OpaqueDerivedQuotaLedger {
  kind: "opaque";
  routeIdentity: SubscriptionRouteIdentity;
  planningAsOf: string;
  suggestedTaskIds: readonly string[];
  description: string;
}

export type DerivedSubscriptionQuotaLedger =
  | NumericDerivedQuotaLedger
  | OpaqueDerivedQuotaLedger;

export type OverageResolution =
  | {
      status: "not-needed";
      unit: SubscriptionQuotaUnit;
      overageUnits: 0;
      costMicroUsd: 0;
    }
  | {
      status: "covered";
      unit: SubscriptionQuotaUnit;
      overageUnits: number;
      costMicroUsd: number;
      policy: PaidOveragePolicy;
    }
  | {
      status: "unavailable";
      unit: SubscriptionQuotaUnit | null;
      deficitUnits: number;
      reasonCode: OverageResolutionFailureCode;
    };

export type QuotaReservationResult =
  | {
      status: "reserved";
      ledger: NumericDerivedQuotaLedger;
      reservation: ConfirmedSubscriptionQuotaReservation;
      overage: OverageResolution;
    }
  | {
      status: "conditional";
      ledger: DerivedSubscriptionQuotaLedger;
      reservation: ConditionalSubscriptionQuotaReservation | null;
      reasonCodes: readonly [ConditionalReasonCode, ...ConditionalReasonCode[]];
    }
  | {
      status: "unavailable";
      ledger: DerivedSubscriptionQuotaLedger;
      reasonCode: QuotaReservationFailureCode;
    };

export interface ApiFallbackCandidate {
  routeIdentity: ApiRouteIdentity;
  cashMicroUsd: Readonly<Record<CostScenario, number>>;
}

export type ConditionalFallbackResolution =
  | {
      status: "ready";
      fallback: ApiFallbackCandidate;
    }
  | {
      status: "held";
      reasonCode: "fallback-over-incremental-cash-budget";
      fallback: ApiFallbackCandidate;
    }
  | {
      status: "infeasible";
      reasonCode: "no-compatible-api-fallback";
      fallback: null;
    };

export interface ExistingIncludedCashComponent {
  kind: "existing-included";
  resourceRouteIdentity: SubscriptionRouteIdentity;
  incrementalCashMicroUsd: 0;
}

export interface NewSubscriptionCommitmentCashComponent {
  kind: "new-subscription-commitment";
  resourceRouteIdentity: SubscriptionRouteIdentity;
  fullPlanPeriodFeeMicroUsd: number;
}

export type SubscriptionCommitmentCashComponent =
  | ExistingIncludedCashComponent
  | NewSubscriptionCommitmentCashComponent;

export type SubscriptionResourceEvaluation =
  | {
      status: "confirmed";
      routeIdentity: SubscriptionRouteIdentity;
      eligibility: Extract<OfferingEligibilityResult, { status: "eligible" }>;
      demand: ConfirmedQuotaDemandResult;
      reservation: Extract<QuotaReservationResult, { status: "reserved" }>;
      commitmentCash: SubscriptionCommitmentCashComponent;
    }
  | {
      status: "conditional";
      routeIdentity: SubscriptionRouteIdentity;
      eligibility: Exclude<OfferingEligibilityResult, { status: "ineligible" }>;
      demand: QuotaDemandResult;
      reservation: QuotaReservationResult | null;
      reasonCodes: readonly [ConditionalReasonCode, ...ConditionalReasonCode[]];
      fallbackRequired: true;
      fallback: ConditionalFallbackResolution;
    }
  | {
      status: "ineligible";
      routeIdentity: SubscriptionRouteIdentity;
      eligibility: Extract<OfferingEligibilityResult, { status: "ineligible" }>;
    }
  | {
      status: "unavailable";
      routeIdentity: SubscriptionRouteIdentity;
      eligibility: Exclude<OfferingEligibilityResult, { status: "ineligible" }>;
      demand: QuotaDemandResult;
      reservation: Extract<QuotaReservationResult, { status: "unavailable" }> | null;
      reasonCode: QuotaReservationFailureCode;
    };

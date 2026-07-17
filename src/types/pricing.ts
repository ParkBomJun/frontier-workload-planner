import type {
  CostScenario,
  ModelTier,
  ProviderId,
  ScenarioInvocationFeasibility,
  TaskCostEstimate,
} from "./domain";
import type {
  ApiRouteIdentity,
  PlanningQualityTier,
  ProviderPublishedEvidence,
  ResolvedRegistryReference,
} from "./offerings";

export interface StandardTextRate {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
}

export interface NormalizedStandardTextRate extends StandardTextRate {
  inputMicroUsdPerMillion: number;
  outputMicroUsdPerMillion: number;
}

export interface ApiCatalogOverride {
  kind: "api-catalog-override";
  provenance: "user-supplied";
  target: ResolvedRegistryReference;
  effectiveFrom: string;
  recordedAt: string;
  planningTier?: PlanningQualityTier;
  standardTextPrice?: StandardTextRate;
}

export const API_OVERRIDE_VALIDATION_FAILURE_CODES = [
  "invalid-user-override",
  "override-target-unresolved",
] as const;

export type ApiOverrideValidationFailureCode =
  (typeof API_OVERRIDE_VALIDATION_FAILURE_CODES)[number];

export const API_PRICE_CONDITIONAL_REASON_CODES = [
  "price-schedule-not-applicable",
  "standard-price-input-limit-exceeded",
] as const;

export type ApiPriceConditionalReasonCode =
  (typeof API_PRICE_CONDITIONAL_REASON_CODES)[number];

export const API_PRICE_INVALID_REASON_CODES = [
  "catalog-entry-not-found",
  "invalid-pricing-as-of",
  "catalog-price-schedule-invalid",
  "catalog-invocation-limits-unresolved",
  "invalid-token-scenarios",
  "invalid-user-override",
  "override-target-unresolved",
  "override-target-mismatch",
] as const;

export type ApiPriceInvalidReasonCode =
  (typeof API_PRICE_INVALID_REASON_CODES)[number];

export interface PriceConditionFailure {
  code: "standard-price-input-limit-exceeded";
  scenario: CostScenario;
  actualInputTokens: number;
  limitInputTokens: number;
}

export interface OfficialApiPricingDefault {
  planningTier: PlanningQualityTier;
  plannerTierAdapterVersion: string;
  standardTextPrice: NormalizedStandardTextRate;
  effectiveFrom: string;
  effectiveThrough: string | null;
  standardPriceInputLimitTokens: number | null;
  excludedLongContextPrice: StandardTextRate | null;
  sourceUrl: string;
  verifiedAt: string;
  evidence: ProviderPublishedEvidence;
}

export interface EffectiveApiPricingValue {
  planningTier: PlanningQualityTier;
  standardTextPrice: NormalizedStandardTextRate;
  planningTierSource: "verified-default" | "user-override";
  standardTextPriceSource: "verified-default" | "user-override";
}

interface ApiPriceResolutionIdentity {
  providerId: ProviderId;
  tier: ModelTier;
  modelId: string | null;
  pricingAsOf: string;
  catalogReference: ResolvedRegistryReference | null;
  routeIdentity: ApiRouteIdentity | null;
}

export interface ResolvedApiStandardTextPrice extends ApiPriceResolutionIdentity {
  status: "resolved";
  modelId: string;
  catalogReference: ResolvedRegistryReference;
  routeIdentity: ApiRouteIdentity;
  officialDefault: OfficialApiPricingDefault;
  effectiveValue: EffectiveApiPricingValue;
  override: ApiCatalogOverride | null;
  overrideApplied: boolean;
  basis: "standard-uncached-text";
  exclusions: readonly [
    "cache-discounts-and-writes",
    "batch-pricing",
    "tool-call-fees",
    "long-context-surcharges",
  ];
}

export interface ConditionalApiStandardTextPrice extends ApiPriceResolutionIdentity {
  status: "conditional";
  modelId: string;
  catalogReference: ResolvedRegistryReference;
  routeIdentity: ApiRouteIdentity;
  reasonCode: ApiPriceConditionalReasonCode;
  conditionFailures: PriceConditionFailure[];
  officialDefault: OfficialApiPricingDefault | null;
  override: ApiCatalogOverride | null;
  basis: "standard-uncached-text";
}

export interface InvalidApiStandardTextPrice extends ApiPriceResolutionIdentity {
  status: "invalid";
  reasonCode: ApiPriceInvalidReasonCode;
}

export type ApiStandardTextPriceResolution =
  | ResolvedApiStandardTextPrice
  | ConditionalApiStandardTextPrice
  | InvalidApiStandardTextPrice;

export interface ResolvedRateTaskCost {
  estimate: TaskCostEstimate;
  scenarioCostMicroUsd: Record<CostScenario, number>;
}

export type ApiOfferingCostEvaluation =
  | {
      status: "priced";
      providerId: ProviderId;
      tier: ModelTier;
      modelId: string;
      routeIdentity: ApiRouteIdentity;
      pricing: ResolvedApiStandardTextPrice;
      invocationScenarios: ScenarioInvocationFeasibility[];
      cost: TaskCostEstimate;
      scenarioCostMicroUsd: Record<CostScenario, number>;
      offeringEligibilityApplied: false;
    }
  | {
      status: "conditional";
      providerId: ProviderId;
      tier: ModelTier;
      modelId: string;
      routeIdentity: ApiRouteIdentity;
      pricing: ConditionalApiStandardTextPrice;
      invocationScenarios: ScenarioInvocationFeasibility[];
      cost: null;
      offeringEligibilityApplied: false;
    }
  | {
      status: "ineligible";
      providerId: ProviderId;
      tier: ModelTier;
      modelId: string;
      routeIdentity: ApiRouteIdentity;
      reasonCode: "invocation-limit-exceeded";
      pricing: ResolvedApiStandardTextPrice | ConditionalApiStandardTextPrice;
      invocationScenarios: ScenarioInvocationFeasibility[];
      cost: null;
      offeringEligibilityApplied: false;
    }
  | {
      status: "invalid";
      providerId: ProviderId;
      tier: ModelTier;
      modelId: string | null;
      reasonCode: ApiPriceInvalidReasonCode;
      pricing: InvalidApiStandardTextPrice;
      cost: null;
      offeringEligibilityApplied: false;
    };

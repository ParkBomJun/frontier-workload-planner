import {
  PROVIDER_CATALOG,
  type ProviderCatalog,
  type ProviderModelPrice,
} from "./provider-catalog";
import {
  MODEL_TIERS,
  PROVIDER_IDS,
  type ModelTier,
  type ProviderId,
} from "@/types/domain";
import type {
  CapabilityId,
  EvidenceFieldPath,
  EvidenceSubject,
  InvocationLimits,
  PlanningQualityTier,
  WorkSurface,
} from "@/types/offerings";

export const API_CATALOG_REGISTRY_ID = "frontier-provider-api-catalog" as const;
export const API_CATALOG_REGISTRY_VERSION = "provider-comparison-stable-v1" as const;

export const REGISTRY_CLAIM_IDS = [
  "model-identity",
  "invocation-limits",
  "model-capabilities",
  "api-offering-identity",
  "api-access-limits",
  "api-access-capabilities",
  "standard-text-pricing",
  "subscription-offering-identity",
  "subscription-access-limits",
  "subscription-access-capabilities",
  "subscription-eligibility-profile",
] as const;

export type RegistryClaimId = (typeof REGISTRY_CLAIM_IDS)[number];

export interface ModelIdentityClaimValue {
  modelId: string;
  displayName: string;
  modelProviderId: string;
  family: string;
}

export interface CapabilityClaimValue {
  capabilityIds: readonly CapabilityId[];
}

export interface OfferingIdentityClaimValue {
  offeringId: string;
  modelId: string;
  mode: "api" | "subscription";
  supportedSurfaces: readonly WorkSurface[];
}

export type AccessLimitPolicyClaimValue =
  | { kind: "same-as-model" }
  | { kind: "bounded"; limits: InvocationLimits };

export type AccessCapabilityPolicyClaimValue =
  | { kind: "same-as-model" }
  | { kind: "bounded"; capabilityIds: readonly CapabilityId[] };

export interface SubscriptionEligibilityProfileClaimValue {
  offeringId: string;
  providerId: string;
  supportedSurfaces: readonly WorkSurface[];
  qualityTier: PlanningQualityTier;
  capabilityIds: readonly CapabilityId[];
  invocationLimits: InvocationLimits;
}

export interface StandardTextPriceClaimValue {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  preview?: true;
  effectiveThrough?: string;
  priceAfterEffectiveThrough?: {
    inputUsdPerMillion: number;
    outputUsdPerMillion: number;
    effectiveFrom: string;
  };
  standardPriceInputLimitTokens?: number;
  excludedLongContextPrice?: {
    inputUsdPerMillion: number;
    outputUsdPerMillion: number;
  };
}

export interface RegistryClaimValueById {
  "model-identity": ModelIdentityClaimValue;
  "invocation-limits": InvocationLimits;
  "model-capabilities": CapabilityClaimValue;
  "api-offering-identity": OfferingIdentityClaimValue;
  "api-access-limits": AccessLimitPolicyClaimValue;
  "api-access-capabilities": AccessCapabilityPolicyClaimValue;
  "standard-text-pricing": StandardTextPriceClaimValue;
  "subscription-offering-identity": OfferingIdentityClaimValue;
  "subscription-access-limits": AccessLimitPolicyClaimValue;
  "subscription-access-capabilities": AccessCapabilityPolicyClaimValue;
  "subscription-eligibility-profile": SubscriptionEligibilityProfileClaimValue;
}

export type RegistryClaimValue = RegistryClaimValueById[RegistryClaimId];

export interface ProviderRegistryClaim<
  I extends RegistryClaimId = RegistryClaimId,
> {
  catalogId: typeof API_CATALOG_REGISTRY_ID;
  catalogVersion: typeof API_CATALOG_REGISTRY_VERSION;
  entryId: string;
  claimId: I;
  subject: EvidenceSubject;
  value: RegistryClaimValueById[I];
  sourceUrl: string;
  verifiedAt: ProviderCatalog["verifiedAt"];
}

export interface VersionedProviderRegistryEntry {
  providerId: ProviderId;
  legacyTier: ModelTier;
  providerDisplayName: string;
  productFamily: string;
  pricingSource: string;
  modelsSource: string;
  verifiedAt: ProviderCatalog["verifiedAt"];
  legacyModel: ProviderModelPrice;
  claims: Readonly<Partial<{ [I in RegistryClaimId]: ProviderRegistryClaim<I> }>>;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function cloneModel(model: ProviderModelPrice): ProviderModelPrice {
  return {
    tier: model.tier,
    catalogId: model.catalogId,
    displayName: model.displayName,
    inputUsdPerMillion: model.inputUsdPerMillion,
    outputUsdPerMillion: model.outputUsdPerMillion,
    ...(model.preview === true ? { preview: true as const } : {}),
    ...(model.effectiveThrough === undefined
      ? {}
      : { effectiveThrough: model.effectiveThrough }),
    ...(model.priceAfterEffectiveThrough === undefined
      ? {}
      : { priceAfterEffectiveThrough: { ...model.priceAfterEffectiveThrough } }),
    ...(model.standardPriceInputLimitTokens === undefined
      ? {}
      : { standardPriceInputLimitTokens: model.standardPriceInputLimitTokens }),
    ...(model.excludedLongContextPrice === undefined
      ? {}
      : { excludedLongContextPrice: { ...model.excludedLongContextPrice } }),
    limits: { ...model.limits },
  };
}

function invocationLimits(model: ProviderModelPrice): InvocationLimits {
  return {
    ...(model.limits.maxInputTokens === undefined
      ? {}
      : { maxInputTokens: model.limits.maxInputTokens }),
    ...(model.limits.maxOutputTokens === undefined
      ? {}
      : { maxOutputTokens: model.limits.maxOutputTokens }),
    ...(model.limits.maxCombinedTokens === undefined
      ? {}
      : { maxCombinedTokens: model.limits.maxCombinedTokens }),
  };
}

function standardPrice(model: ProviderModelPrice): StandardTextPriceClaimValue {
  return {
    inputUsdPerMillion: model.inputUsdPerMillion,
    outputUsdPerMillion: model.outputUsdPerMillion,
    ...(model.preview === true ? { preview: true as const } : {}),
    ...(model.effectiveThrough === undefined
      ? {}
      : { effectiveThrough: model.effectiveThrough }),
    ...(model.priceAfterEffectiveThrough === undefined
      ? {}
      : { priceAfterEffectiveThrough: { ...model.priceAfterEffectiveThrough } }),
    ...(model.standardPriceInputLimitTokens === undefined
      ? {}
      : { standardPriceInputLimitTokens: model.standardPriceInputLimitTokens }),
    ...(model.excludedLongContextPrice === undefined
      ? {}
      : { excludedLongContextPrice: { ...model.excludedLongContextPrice } }),
  };
}

function claim<I extends RegistryClaimId>(
  provider: ProviderCatalog,
  model: ProviderModelPrice,
  claimId: I,
  fieldPath: EvidenceFieldPath,
  value: RegistryClaimValueById[I],
  sourceUrl: string,
): ProviderRegistryClaim<I> {
  return deepFreeze({
    catalogId: API_CATALOG_REGISTRY_ID,
    catalogVersion: API_CATALOG_REGISTRY_VERSION,
    entryId: model.catalogId,
    claimId,
    subject: {
      providerId: provider.id,
      subjectId: model.catalogId,
      fieldPath,
    },
    value,
    sourceUrl,
    verifiedAt: provider.verifiedAt,
  });
}

function createEntry(
  provider: ProviderCatalog,
  tier: ModelTier,
): VersionedProviderRegistryEntry {
  const model = cloneModel(provider.models[tier]);
  const identity = claim(
    provider,
    model,
    "model-identity",
    "model.identity",
    {
      modelId: model.catalogId,
      displayName: model.displayName,
      modelProviderId: provider.id,
      family: provider.productFamily,
    },
    provider.modelsSource,
  );
  const limits = claim(
    provider,
    model,
    "invocation-limits",
    "model.invocation-limits",
    invocationLimits(model),
    model.limits.sourceUrl,
  );
  const pricing = claim(
    provider,
    model,
    "standard-text-pricing",
    "api.standard-text-pricing",
    standardPrice(model),
    provider.pricingSource,
  );

  return deepFreeze({
    providerId: provider.id,
    legacyTier: tier,
    providerDisplayName: provider.displayName,
    productFamily: provider.productFamily,
    pricingSource: provider.pricingSource,
    modelsSource: provider.modelsSource,
    verifiedAt: provider.verifiedAt,
    legacyModel: model,
    claims: {
      "model-identity": identity,
      "invocation-limits": limits,
      "standard-text-pricing": pricing,
    },
  });
}

function registryEntryKey(providerId: ProviderId, tier: ModelTier): string {
  return `${providerId}:${tier}`;
}

const entries = PROVIDER_IDS.flatMap((providerId) =>
  MODEL_TIERS.map((tier) => createEntry(PROVIDER_CATALOG[providerId], tier)),
);

export const VERSIONED_PROVIDER_REGISTRY = deepFreeze({
  id: API_CATALOG_REGISTRY_ID,
  version: API_CATALOG_REGISTRY_VERSION,
  entries,
  entriesByProviderTier: Object.fromEntries(
    entries.map((entry) => [registryEntryKey(entry.providerId, entry.legacyTier), entry]),
  ) as Record<string, VersionedProviderRegistryEntry>,
  entriesById: Object.fromEntries(entries.map((entry) => [entry.legacyModel.catalogId, entry])) as Record<
    string,
    VersionedProviderRegistryEntry
  >,
});

export function getProviderRegistryEntry(
  providerId: ProviderId,
  tier: ModelTier,
): VersionedProviderRegistryEntry {
  const entry = VERSIONED_PROVIDER_REGISTRY.entriesByProviderTier[
    registryEntryKey(providerId, tier)
  ];
  if (!entry) throw new Error("Provider registry entry is missing.");
  return entry;
}

export function getProviderRegistryEntryById(
  entryId: string,
): VersionedProviderRegistryEntry | undefined {
  return Object.hasOwn(VERSIONED_PROVIDER_REGISTRY.entriesById, entryId)
    ? VERSIONED_PROVIDER_REGISTRY.entriesById[entryId]
    : undefined;
}

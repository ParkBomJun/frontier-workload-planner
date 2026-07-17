import {
  type ProviderCatalog,
  type ProviderModelPrice,
} from "./provider-catalog";
import {
  API_CATALOG_REGISTRY_VERSIONS,
  PROVIDER_CATALOG_SNAPSHOTS,
  type ApiCatalogRegistryVersion,
} from "./provider-catalog-snapshots";
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
export const API_CATALOG_REGISTRY_V1_VERSION = API_CATALOG_REGISTRY_VERSIONS[0];
export const API_CATALOG_REGISTRY_VERSION = API_CATALOG_REGISTRY_VERSIONS[1];
export const PLANNER_TIER_ADAPTER_VERSION = "legacy-tier-adapter-v1" as const;
export type { ApiCatalogRegistryVersion } from "./provider-catalog-snapshots";

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
  catalogVersion: ApiCatalogRegistryVersion;
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

export interface VersionedProviderRegistry {
  id: typeof API_CATALOG_REGISTRY_ID;
  version: ApiCatalogRegistryVersion;
  entries: readonly VersionedProviderRegistryEntry[];
  entriesByProviderTier: Readonly<Record<string, VersionedProviderRegistryEntry>>;
  entriesById: Readonly<Record<string, VersionedProviderRegistryEntry>>;
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
  catalogVersion: ApiCatalogRegistryVersion,
  claimId: I,
  fieldPath: EvidenceFieldPath,
  value: RegistryClaimValueById[I],
  sourceUrl: string,
): ProviderRegistryClaim<I> {
  return deepFreeze({
    catalogId: API_CATALOG_REGISTRY_ID,
    catalogVersion,
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
  catalogVersion: ApiCatalogRegistryVersion,
): VersionedProviderRegistryEntry {
  const model = cloneModel(provider.models[tier]);
  const identity = claim(
    provider,
    model,
    catalogVersion,
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
    catalogVersion,
    "invocation-limits",
    "model.invocation-limits",
    invocationLimits(model),
    model.limits.sourceUrl,
  );
  const pricing = claim(
    provider,
    model,
    catalogVersion,
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

function assertUniqueRegistryEntries(
  entries: readonly VersionedProviderRegistryEntry[],
): void {
  const providerTiers = new Set<string>();
  const entryIds = new Set<string>();
  entries.forEach((entry) => {
    const providerTier = registryEntryKey(entry.providerId, entry.legacyTier);
    if (providerTiers.has(providerTier)) {
      throw new Error("Provider registry contains a duplicate provider/tier entry.");
    }
    providerTiers.add(providerTier);
    if (entryIds.has(entry.legacyModel.catalogId)) {
      throw new Error("Provider registry contains a duplicate entry ID.");
    }
    entryIds.add(entry.legacyModel.catalogId);

    const claimIds = new Set<string>();
    Object.entries(entry.claims).forEach(([claimId, registryClaim]) => {
      if (claimIds.has(claimId) || registryClaim.claimId !== claimId) {
        throw new Error("Provider registry contains a duplicate or mismatched claim ID.");
      }
      claimIds.add(claimId);
    });
  });
}

function createRegistry(
  version: ApiCatalogRegistryVersion,
): VersionedProviderRegistry {
  const snapshot = PROVIDER_CATALOG_SNAPSHOTS[version];
  const entries = PROVIDER_IDS.flatMap((providerId) =>
    MODEL_TIERS.map((tier) => createEntry(snapshot[providerId], tier, version)),
  );
  assertUniqueRegistryEntries(entries);
  return deepFreeze({
    id: API_CATALOG_REGISTRY_ID,
    version,
    entries,
    entriesByProviderTier: Object.fromEntries(
      entries.map((entry) => [registryEntryKey(entry.providerId, entry.legacyTier), entry]),
    ) as Record<string, VersionedProviderRegistryEntry>,
    entriesById: Object.fromEntries(
      entries.map((entry) => [entry.legacyModel.catalogId, entry]),
    ) as Record<string, VersionedProviderRegistryEntry>,
  });
}

const registriesByVersion: Readonly<
  Record<ApiCatalogRegistryVersion, VersionedProviderRegistry>
> = deepFreeze(
  Object.fromEntries(
    API_CATALOG_REGISTRY_VERSIONS.map((version) => [version, createRegistry(version)]),
  ) as Record<ApiCatalogRegistryVersion, VersionedProviderRegistry>,
);

export const VERSIONED_PROVIDER_REGISTRY =
  registriesByVersion[API_CATALOG_REGISTRY_VERSION];

export function getProviderRegistry(
  catalogId: string,
  catalogVersion: string,
): VersionedProviderRegistry | undefined {
  if (catalogId !== API_CATALOG_REGISTRY_ID) return undefined;
  return Object.hasOwn(registriesByVersion, catalogVersion)
    ? registriesByVersion[catalogVersion as ApiCatalogRegistryVersion]
    : undefined;
}

export function getProviderRegistryEntry(
  providerId: ProviderId,
  tier: ModelTier,
  catalogVersion: ApiCatalogRegistryVersion,
): VersionedProviderRegistryEntry {
  const registry = getProviderRegistry(API_CATALOG_REGISTRY_ID, catalogVersion);
  if (!registry) throw new Error("Provider registry version is missing.");
  const entry = registry.entriesByProviderTier[
    registryEntryKey(providerId, tier)
  ];
  if (!entry) throw new Error("Provider registry entry is missing.");
  return entry;
}

export function getProviderRegistryEntryById(
  catalogId: string,
  catalogVersion: string,
  entryId: string,
): VersionedProviderRegistryEntry | undefined {
  const registry = getProviderRegistry(catalogId, catalogVersion);
  if (!registry) return undefined;
  return Object.hasOwn(registry.entriesById, entryId)
    ? registry.entriesById[entryId]
    : undefined;
}

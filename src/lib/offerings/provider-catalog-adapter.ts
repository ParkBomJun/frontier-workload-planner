import {
  PROVIDER_PRICING_BASIS,
  PROVIDER_PRICING_EXCLUSIONS,
  type ProviderCatalog,
  type ProviderModelPrice,
} from "@/config/provider-catalog";
import {
  derivePlannerApiOfferingId,
  derivePlannerApiSurfaces,
} from "@/config/planner-api-route-adapter";
import {
  API_CATALOG_REGISTRY_ID,
  API_CATALOG_REGISTRY_VERSION,
  getProviderRegistryEntry,
  type ApiCatalogRegistryVersion,
  type RegistryClaimId,
  type RegistryClaimValueById,
} from "@/config/versioned-provider-registry";
import {
  MODEL_TIERS,
  PROVIDER_IDS,
  type ModelTier,
  type ProviderId,
} from "@/types/domain";
import {
  LEGACY_TO_PLANNING_TIER,
  type ApiRouteIdentity,
  type LegacyApiCatalogReference,
  type ModelBoundOffering,
  type ModelDefinition,
  type ProviderPublishedEvidence,
} from "@/types/offerings";

import {
  catalogClaimExpectation,
  catalogReferenceFor,
  resolveStoredEvidence,
} from "./evidence-resolver";
import { createApiRouteIdentity, registeredAccessProviderId } from "./route-identity";

export type ApiStandardTextPriceView = RegistryClaimValueById["standard-text-pricing"] & {
  basis: typeof PROVIDER_PRICING_BASIS;
  exclusions: typeof PROVIDER_PRICING_EXCLUSIONS;
  evidence: ProviderPublishedEvidence;
};

export interface ResolvedApiCatalogEntry {
  legacyReference: LegacyApiCatalogReference;
  planningTier: ModelDefinition["qualityTier"];
  model: ModelDefinition;
  offering: ModelBoundOffering & { mode: "api" };
  routeIdentity: ApiRouteIdentity;
  standardTextPrice: ApiStandardTextPriceView;
  providerDisplayName: string;
  productFamily: string;
  pricingSource: string;
  modelsSource: string;
  verifiedAt: ProviderCatalog["verifiedAt"];
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function mustResolve<I extends RegistryClaimId>(
  providerId: ProviderId,
  tier: ModelTier,
  claimId: I,
  catalogVersion: ApiCatalogRegistryVersion,
): { value: RegistryClaimValueById[I]; evidence: ProviderPublishedEvidence } {
  const result = resolveStoredEvidence(
    catalogReferenceFor(providerId, tier, claimId, catalogVersion),
    catalogClaimExpectation(providerId, tier, claimId, catalogVersion),
  );
  if (result.status !== "resolved") {
    throw new Error(`Bundled provider claim did not resolve: ${result.reasonCode}.`);
  }
  return result;
}

function adaptEntry(
  providerId: ProviderId,
  tier: ModelTier,
  catalogVersion: ApiCatalogRegistryVersion,
): ResolvedApiCatalogEntry {
  const registryEntry = getProviderRegistryEntry(providerId, tier, catalogVersion);
  const identity = mustResolve(providerId, tier, "model-identity", catalogVersion);
  const limits = mustResolve(providerId, tier, "invocation-limits", catalogVersion);
  const price = mustResolve(
    providerId,
    tier,
    "standard-text-pricing",
    catalogVersion,
  );
  const capabilities = mustResolve(
    providerId,
    tier,
    "model-capabilities",
    catalogVersion,
  );
  const apiIdentity = mustResolve(
    providerId,
    tier,
    "api-offering-identity",
    catalogVersion,
  );
  const accessLimits = mustResolve(
    providerId,
    tier,
    "api-access-limits",
    catalogVersion,
  );
  const accessCapabilities = mustResolve(
    providerId,
    tier,
    "api-access-capabilities",
    catalogVersion,
  );
  if (apiIdentity.value.modelId !== identity.value.modelId) {
    throw new Error("Bundled API offering identity does not match its model.");
  }
  const registryReference = {
    registryId: API_CATALOG_REGISTRY_ID,
    registryVersion: catalogVersion,
    entryId: registryEntry.legacyModel.catalogId,
  };
  const accessProviderId = registeredAccessProviderId(providerId);
  const model: ModelDefinition = {
    id: identity.value.modelId,
    modelProviderId: identity.value.modelProviderId,
    family: identity.value.family,
    displayName: identity.value.displayName,
    qualityTier: LEGACY_TO_PLANNING_TIER[tier],
    capabilityProfile: {
      knowledge: "complete",
      capabilityIds: [...capabilities.value.capabilityIds],
      evidence: capabilities.evidence,
    },
    invocationLimits: {
      knowledge: "complete",
      limits: { ...limits.value },
      evidence: limits.evidence,
    },
    evidence: identity.evidence,
    registryReference,
  };
  const offering: ModelBoundOffering & { mode: "api" } = {
    kind: "model-bound",
    id: derivePlannerApiOfferingId(providerId, model.id),
    providerId: accessProviderId,
    mode: "api",
    modelId: model.id,
    supportedSurfaces: derivePlannerApiSurfaces(apiIdentity.value.endpointIds),
    limitPolicy:
      accessLimits.value.kind === "same-as-model"
        ? { kind: "same-as-model", evidence: accessLimits.evidence }
        : {
            kind: "bounded",
            invocationLimits: {
              knowledge: "complete",
              limits: { ...accessLimits.value.limits },
              evidence: accessLimits.evidence,
            },
          },
    capabilityPolicy:
      accessCapabilities.value.kind === "same-as-model"
        ? { kind: "same-as-model", evidence: accessCapabilities.evidence }
        : {
            kind: "bounded",
            capabilityProfile: {
              knowledge: "complete",
              capabilityIds: [...accessCapabilities.value.capabilityIds],
              evidence: accessCapabilities.evidence,
            },
          },
    evidence: apiIdentity.evidence,
    registryReference,
  };

  return deepFreeze({
    legacyReference: { providerId, tier },
    planningTier: model.qualityTier,
    model,
    offering,
    routeIdentity: createApiRouteIdentity(offering),
    standardTextPrice: {
      ...price.value,
      basis: PROVIDER_PRICING_BASIS,
      exclusions: PROVIDER_PRICING_EXCLUSIONS,
      evidence: price.evidence,
    },
    providerDisplayName: registryEntry.providerDisplayName,
    productFamily: registryEntry.productFamily,
    pricingSource: registryEntry.pricingSource,
    modelsSource: registryEntry.modelsSource,
    verifiedAt: registryEntry.verifiedAt,
  });
}

const allEntries = deepFreeze(
  PROVIDER_IDS.flatMap((providerId) =>
    MODEL_TIERS.map((tier) =>
      adaptEntry(providerId, tier, API_CATALOG_REGISTRY_VERSION),
    ),
  ),
);

const entriesByLegacyReference = new Map(
  allEntries.map((entry) => [
    `${entry.legacyReference.providerId}:${entry.legacyReference.tier}`,
    entry,
  ]),
);

export function resolveAllApiCatalogEntries(): readonly ResolvedApiCatalogEntry[] {
  return allEntries;
}

export function resolveApiCatalogEntry(
  providerId: ProviderId,
  tier: ModelTier,
): ResolvedApiCatalogEntry {
  const entry = entriesByLegacyReference.get(`${providerId}:${tier}`);
  if (!entry) throw new Error("Resolved API catalog entry is missing.");
  return entry;
}

function projectCanonicalEntryToLegacyModel(
  entry: ResolvedApiCatalogEntry,
): ProviderModelPrice {
  if (entry.model.invocationLimits.knowledge !== "complete") {
    throw new Error("A legacy API model projection requires complete invocation limits.");
  }
  if (entry.model.invocationLimits.evidence.kind !== "provider-published") {
    throw new Error("A legacy API model projection requires provider-published limits.");
  }
  const price = entry.standardTextPrice;
  const limits = entry.model.invocationLimits.limits;
  const verifiedApiClaims = getProviderRegistryEntry(
    entry.legacyReference.providerId,
    entry.legacyReference.tier,
    API_CATALOG_REGISTRY_VERSION,
  ).legacyModel.verifiedApiClaims;

  return {
    tier: entry.legacyReference.tier,
    catalogId: entry.model.id,
    displayName: entry.model.displayName,
    inputUsdPerMillion: price.inputUsdPerMillion,
    outputUsdPerMillion: price.outputUsdPerMillion,
    ...(price.preview === true ? { preview: true as const } : {}),
    ...(price.effectiveThrough === undefined
      ? {}
      : { effectiveThrough: price.effectiveThrough }),
    ...(price.priceAfterEffectiveThrough === undefined
      ? {}
      : { priceAfterEffectiveThrough: { ...price.priceAfterEffectiveThrough } }),
    ...(price.standardPriceInputLimitTokens === undefined
      ? {}
      : { standardPriceInputLimitTokens: price.standardPriceInputLimitTokens }),
    ...(price.excludedLongContextPrice === undefined
      ? {}
      : { excludedLongContextPrice: { ...price.excludedLongContextPrice } }),
    ...(verifiedApiClaims === undefined
      ? {}
      : {
          verifiedApiClaims: {
            modelCapabilities: {
              capabilityIds: [
                ...verifiedApiClaims.modelCapabilities.capabilityIds,
              ],
              sourceUrl: verifiedApiClaims.modelCapabilities.sourceUrl,
            },
            offeringIdentity: {
              endpointIds: [...verifiedApiClaims.offeringIdentity.endpointIds],
              sourceUrl: verifiedApiClaims.offeringIdentity.sourceUrl,
            },
            accessLimits: { ...verifiedApiClaims.accessLimits },
            accessCapabilities: {
              ...verifiedApiClaims.accessCapabilities,
            },
          },
        }),
    limits: {
      ...(limits.maxInputTokens === undefined
        ? {}
        : { maxInputTokens: limits.maxInputTokens }),
      ...(limits.maxOutputTokens === undefined
        ? {}
        : { maxOutputTokens: limits.maxOutputTokens }),
      ...(limits.maxCombinedTokens === undefined
        ? {}
        : { maxCombinedTokens: limits.maxCombinedTokens }),
      sourceUrl: entry.model.invocationLimits.evidence.sourceUrl,
      verifiedAt: entry.verifiedAt,
    },
  };
}

export function projectApiCatalogEntryToLegacyModel(
  providerId: ProviderId,
  tier: ModelTier,
): ProviderModelPrice {
  return projectCanonicalEntryToLegacyModel(resolveApiCatalogEntry(providerId, tier));
}

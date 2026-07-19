import { z } from "zod";

import {
  derivePlannerApiOfferingId,
  derivePlannerApiSurfaces,
} from "@/config/planner-api-route-adapter";
import {
  API_CATALOG_REGISTRY_ID,
  getProviderRegistry,
  getProviderRegistryEntry,
  getProviderRegistryEntryById,
  type ApiCatalogRegistryVersion,
  type ProviderRegistryClaim,
  type RegistryClaimId,
  type RegistryClaimValueById,
} from "@/config/versioned-provider-registry";
import type { ModelTier, ProviderId } from "@/types/domain";
import type {
  ConditionalReasonCode,
  EvidenceRef,
  EvidenceSubject,
  ModelBoundOffering,
  ProviderPublishedEvidence,
  PlanningQualityTier,
  ResolvedRegistryReference,
  StoredCatalogEvidenceInput,
  StoredEvidenceInput,
} from "@/types/offerings";
import { LEGACY_TO_PLANNING_TIER } from "@/types/offerings";

const evidenceId = z.string().min(1).max(200);

export const storedEvidenceInputSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("catalog-ref"),
    catalogId: evidenceId,
    catalogVersion: evidenceId,
    entryId: evidenceId,
    claimId: evidenceId,
  }),
  z.strictObject({
    kind: z.literal("preset-ref"),
    presetId: evidenceId,
    presetVersion: evidenceId,
    claimId: evidenceId,
  }),
  z.strictObject({
    kind: z.literal("connector-ref"),
    adapterId: evidenceId,
    adapterVersion: evidenceId,
    bindingId: evidenceId,
    snapshotId: evidenceId,
    snapshotVersion: evidenceId,
  }),
  z.strictObject({
    kind: z.literal("user-observed"),
    observedAt: z.iso.datetime(),
    note: z.string().min(1).max(500),
  }),
]);

export type StoredEvidenceInputParseResult =
  | { success: true; data: StoredEvidenceInput }
  | { success: false; reason: "invalid-evidence-input" };

export interface CatalogClaimExpectation<I extends RegistryClaimId = RegistryClaimId>
  extends EvidenceSubject {
  catalogId: typeof API_CATALOG_REGISTRY_ID;
  catalogVersion: ApiCatalogRegistryVersion;
  entryId: string;
  claimId: I;
  providerId: ProviderId;
}

export type EvidenceResolution<I extends RegistryClaimId = RegistryClaimId> =
  | {
      status: "resolved";
      value: RegistryClaimValueById[I];
      evidence: ProviderPublishedEvidence;
    }
  | {
      status: "conditional";
      reasonCode: ConditionalReasonCode;
      source?: StoredEvidenceInput;
    };

const issuedEvidence = new WeakSet<object>();
const issuedClaims = new WeakMap<object, ProviderRegistryClaim>();
const evidenceCache = new Map<string, ProviderPublishedEvidence>();

export function parseStoredEvidenceInput(input: unknown): StoredEvidenceInputParseResult {
  const parsed = storedEvidenceInputSchema.safeParse(input);
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, reason: "invalid-evidence-input" };
}

export function catalogClaimExpectation<I extends RegistryClaimId>(
  providerId: ProviderId,
  tier: ModelTier,
  claimId: I,
  catalogVersion: ApiCatalogRegistryVersion,
): CatalogClaimExpectation<I> {
  const claim = getProviderRegistryEntry(providerId, tier, catalogVersion).claims[
    claimId
  ];
  if (!claim) throw new Error("Provider registry claim is missing.");
  return {
    catalogId: claim.catalogId,
    catalogVersion: claim.catalogVersion,
    entryId: claim.entryId,
    claimId: claim.claimId,
    ...claim.subject,
    providerId,
  };
}

export function catalogReferenceFor(
  providerId: ProviderId,
  tier: ModelTier,
  claimId: RegistryClaimId,
  catalogVersion: ApiCatalogRegistryVersion,
): StoredCatalogEvidenceInput {
  const expected = catalogClaimExpectation(
    providerId,
    tier,
    claimId,
    catalogVersion,
  );
  return {
    kind: "catalog-ref",
    catalogId: expected.catalogId,
    catalogVersion: expected.catalogVersion,
    entryId: expected.entryId,
    claimId: expected.claimId,
  };
}

function claimMatchesExpectation<I extends RegistryClaimId>(
  claim: ProviderRegistryClaim<I>,
  expectation: CatalogClaimExpectation<I>,
): boolean {
  return (
    claim.catalogId === expectation.catalogId &&
    claim.catalogVersion === expectation.catalogVersion &&
    claim.entryId === expectation.entryId &&
    claim.claimId === expectation.claimId &&
    claim.subject.providerId === expectation.providerId &&
    claim.subject.subjectId === expectation.subjectId &&
    claim.subject.fieldPath === expectation.fieldPath
  );
}

function evidenceForClaim<I extends RegistryClaimId>(
  claim: ProviderRegistryClaim<I>,
): ProviderPublishedEvidence {
  const cacheKey = [
    claim.catalogId,
    claim.catalogVersion,
    claim.entryId,
    claim.claimId,
  ].join("\u0000");
  const cached = evidenceCache.get(cacheKey);
  if (cached) return cached;

  const evidence = Object.freeze({
    kind: "provider-published",
    authority: "allowlisted-registry-resolver",
    registryId: claim.catalogId,
    registryVersion: claim.catalogVersion,
    entryId: claim.entryId,
    claimId: claim.claimId,
    sourceUrl: claim.sourceUrl,
    verifiedAt: claim.verifiedAt,
    ...claim.subject,
  }) as unknown as ProviderPublishedEvidence;
  issuedEvidence.add(evidence);
  issuedClaims.set(evidence, claim);
  evidenceCache.set(cacheKey, evidence);
  return evidence;
}

function registryClaim<I extends RegistryClaimId>(
  entry: ReturnType<typeof getProviderRegistryEntry>,
  claimId: I,
): ProviderRegistryClaim<I> | undefined {
  if (!Object.hasOwn(entry.claims, claimId)) return undefined;
  return entry.claims[claimId] as ProviderRegistryClaim<I> | undefined;
}

export function resolveStoredEvidence<I extends RegistryClaimId>(
  input: unknown,
  expectation: CatalogClaimExpectation<I>,
): EvidenceResolution<I> {
  const parsed = parseStoredEvidenceInput(input);
  if (!parsed.success) {
    return { status: "conditional", reasonCode: "evidence-authority-invalid" };
  }

  const source = parsed.data;
  if (source.kind === "user-observed") {
    return { status: "conditional", reasonCode: "profile-unverified", source };
  }
  if (source.kind === "preset-ref") {
    return { status: "conditional", reasonCode: "preset-version-mismatch", source };
  }
  if (source.kind === "connector-ref") {
    return { status: "conditional", reasonCode: "connector-unverified", source };
  }

  if (source.catalogId !== API_CATALOG_REGISTRY_ID) {
    return { status: "conditional", reasonCode: "catalog-reference-unresolved", source };
  }
  const registry = getProviderRegistry(source.catalogId, source.catalogVersion);
  if (!registry) {
    return { status: "conditional", reasonCode: "catalog-version-mismatch", source };
  }
  if (source.catalogVersion !== expectation.catalogVersion) {
    return { status: "conditional", reasonCode: "catalog-version-mismatch", source };
  }
  const entry = getProviderRegistryEntryById(
    source.catalogId,
    source.catalogVersion,
    source.entryId,
  );
  if (!entry) {
    return { status: "conditional", reasonCode: "catalog-reference-unresolved", source };
  }
  if (
    source.entryId !== expectation.entryId ||
    source.claimId !== expectation.claimId
  ) {
    return { status: "conditional", reasonCode: "catalog-claim-mismatch", source };
  }
  if (!Object.hasOwn(entry.claims, source.claimId)) {
    return { status: "conditional", reasonCode: "catalog-claim-mismatch", source };
  }
  const claim = registryClaim(entry, expectation.claimId);
  if (!claim || !claimMatchesExpectation(claim, expectation)) {
    return { status: "conditional", reasonCode: "catalog-claim-mismatch", source };
  }

  return {
    status: "resolved",
    value: claim.value,
    evidence: evidenceForClaim(claim),
  };
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => valuesEqual(value, right[index]))
    );
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        Object.hasOwn(right, key) &&
        valuesEqual(
          (left as Record<string, unknown>)[key],
          (right as Record<string, unknown>)[key],
        ),
    )
  );
}

export function isResolverIssuedEvidence(value: unknown): value is EvidenceRef {
  return typeof value === "object" && value !== null && issuedEvidence.has(value);
}

export function isResolverIssuedProviderEvidence(
  value: unknown,
): value is ProviderPublishedEvidence {
  return (
    isResolverIssuedEvidence(value) &&
    "kind" in value &&
    value.kind === "provider-published"
  );
}

export function isResolverIssuedEvidenceFor(
  value: unknown,
  expectation: EvidenceSubject,
): value is ProviderPublishedEvidence {
  return (
    isResolverIssuedProviderEvidence(value) &&
    value.providerId === expectation.providerId &&
    value.subjectId === expectation.subjectId &&
    value.fieldPath === expectation.fieldPath
  );
}

export function isResolverIssuedEvidenceForClaim<I extends RegistryClaimId>(
  value: unknown,
  expectation: EvidenceSubject & {
    catalogId: string;
    catalogVersion: string;
    entryId: string;
    claimId: I;
  },
  assertedValue: RegistryClaimValueById[I],
): value is ProviderPublishedEvidence {
  if (!isResolverIssuedEvidenceFor(value, expectation)) return false;
  const claim = issuedClaims.get(value);
  return (
    claim !== undefined &&
    claim.catalogId === expectation.catalogId &&
    claim.catalogVersion === expectation.catalogVersion &&
    claim.entryId === expectation.entryId &&
    claim.claimId === expectation.claimId &&
    valuesEqual(claim.value, assertedValue)
  );
}

/**
 * Verifies the planner-authored legacy-tier adapter separately from the
 * provider-published model identity claim used to locate the registry entry.
 */
export function isResolverIssuedPlannerQualityTier(
  value: unknown,
  registryReference: ResolvedRegistryReference,
  assertedTier: PlanningQualityTier,
): boolean {
  if (!isResolverIssuedProviderEvidence(value)) return false;
  const claim = issuedClaims.get(value);
  if (!claim || claim.claimId !== "model-identity") return false;
  if (
    claim.catalogId !== registryReference.registryId ||
    claim.catalogVersion !== registryReference.registryVersion ||
    claim.entryId !== registryReference.entryId
  ) {
    return false;
  }
  const entry = getProviderRegistryEntryById(
    claim.catalogId,
    claim.catalogVersion,
    claim.entryId,
  );
  return (
    entry?.claims["model-identity"] === claim &&
    LEGACY_TO_PLANNING_TIER[entry.legacyTier] === assertedTier
  );
}

/**
 * Verifies the planner-authored API offering ID and surface projection
 * separately from the provider-published endpoint identity claim. Provider
 * evidence never claims the planner's chat/IDE/Batch vocabulary.
 */
export function isResolverIssuedPlannerApiOfferingIdentity(
  value: unknown,
  registryReference: ResolvedRegistryReference | undefined,
  offering: ModelBoundOffering,
): boolean {
  if (
    offering.mode !== "api" ||
    registryReference === undefined ||
    !isResolverIssuedProviderEvidence(value)
  ) {
    return false;
  }
  const untypedClaim = issuedClaims.get(value);
  if (!untypedClaim || untypedClaim.claimId !== "api-offering-identity") {
    return false;
  }
  const claim = untypedClaim as ProviderRegistryClaim<"api-offering-identity">;
  if (
    claim.catalogId !== registryReference.registryId ||
    claim.catalogVersion !== registryReference.registryVersion ||
    claim.entryId !== registryReference.entryId ||
    claim.subject.providerId !== offering.providerId ||
    claim.subject.subjectId !== offering.modelId ||
    claim.subject.fieldPath !== "api.offering-identity" ||
    claim.value.mode !== "api" ||
    claim.value.modelId !== offering.modelId
  ) {
    return false;
  }
  const entry = getProviderRegistryEntryById(
    claim.catalogId,
    claim.catalogVersion,
    claim.entryId,
  );
  if (entry?.claims["api-offering-identity"] !== claim) return false;

  const expectedSurfaces = derivePlannerApiSurfaces(claim.value.endpointIds);
  return (
    offering.id === derivePlannerApiOfferingId(offering.providerId, offering.modelId) &&
    offering.supportedSurfaces.length === expectedSurfaces.length &&
    offering.supportedSurfaces.every(
      (surface, index) => surface === expectedSurfaces[index],
    )
  );
}

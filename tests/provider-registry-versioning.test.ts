import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { PROVIDER_CATALOG } from "@/config/provider-catalog";
import { PROVIDER_CATALOG_SNAPSHOTS } from "@/config/provider-catalog-snapshots";
import { PLANNER_API_ROUTE_ADAPTER_VERSION } from "@/config/planner-api-route-adapter";
import {
  API_CATALOG_REGISTRY_ID,
  API_CATALOG_REGISTRY_V1_VERSION,
  API_CATALOG_REGISTRY_V2_VERSION,
  API_CATALOG_REGISTRY_V3_VERSION,
  API_CATALOG_REGISTRY_VERSION,
  PLANNER_TIER_ADAPTER_VERSION,
  getProviderRegistry,
} from "@/config/versioned-provider-registry";
import {
  catalogClaimExpectation,
  catalogReferenceFor,
  isResolverIssuedEvidenceForClaim,
  resolveStoredEvidence,
} from "@/lib/offerings/evidence-resolver";
import { LEGACY_TO_PLANNING_TIER } from "@/types/offerings";

function normalizeCanonical(value: unknown): unknown {
  if (value === undefined) throw new Error("Canonical manifests cannot contain undefined.");
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("Canonical manifests require finite numbers.");
  }
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(normalizeCanonical);
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [
        key,
        normalizeCanonical((value as Record<string, unknown>)[key]),
      ]),
  );
}

function registryManifest(version: string): unknown {
  const registry = getProviderRegistry(API_CATALOG_REGISTRY_ID, version);
  if (!registry) throw new Error("Registry fixture is missing.");
  return {
    catalogId: registry.id,
    catalogVersion: registry.version,
    plannerTierAdapter: {
      version: PLANNER_TIER_ADAPTER_VERSION,
      mapping: LEGACY_TO_PLANNING_TIER,
    },
    entries: [...registry.entries]
      .sort((left, right) =>
        left.legacyModel.catalogId < right.legacyModel.catalogId
          ? -1
          : left.legacyModel.catalogId > right.legacyModel.catalogId
            ? 1
            : 0,
      )
      .map((entry) => ({
        providerId: entry.providerId,
        legacyTier: entry.legacyTier,
        entryId: entry.legacyModel.catalogId,
        providerDisplayName: entry.providerDisplayName,
        productFamily: entry.productFamily,
        pricingSource: entry.pricingSource,
        modelsSource: entry.modelsSource,
        verifiedAt: entry.verifiedAt,
        legacyModel: entry.legacyModel,
        claims: Object.values(entry.claims)
          .sort((left, right) =>
            left.claimId < right.claimId
              ? -1
              : left.claimId > right.claimId
                ? 1
                : 0,
          )
          .map((claim) => ({
            catalogId: claim.catalogId,
            catalogVersion: claim.catalogVersion,
            entryId: claim.entryId,
            claimId: claim.claimId,
            subject: claim.subject,
            value: claim.value,
            sourceUrl: claim.sourceUrl,
            verifiedAt: claim.verifiedAt,
          })),
      })),
  };
}

function manifestDigest(version: string): string {
  const canonical = JSON.stringify(normalizeCanonical(registryManifest(version)));
  return createHash("sha256").update(canonical).digest("hex");
}

describe("versioned provider registry", () => {
  it("keeps the historical v1 canonical manifest at its recorded digest", () => {
    expect(manifestDigest(API_CATALOG_REGISTRY_V1_VERSION)).toBe(
      "4e0dc56731d374b7bbd93e307956bba8321d7288312735c5fd40c027aeab2d25",
    );
  });

  it("keeps the historical v2 canonical manifest at its recorded digest", () => {
    expect(manifestDigest(API_CATALOG_REGISTRY_V2_VERSION)).toBe(
      "947b8431b32c873f218a0e84a745574fb21bdf90d27e9893790ea87a822f253e",
    );
  });

  it("records the v3 canonical manifest including API claim source facts", () => {
    expect(manifestDigest(API_CATALOG_REGISTRY_V3_VERSION)).toBe(
      "f8e1f34ec4d8bb7a622d7bc97b653a82bf586055580c0b0b92d97acea0822e12",
    );
  });

  it("resolves v1, v2, and v3 simultaneously without silently upgrading any", () => {
    const resolutions = [
      API_CATALOG_REGISTRY_V1_VERSION,
      API_CATALOG_REGISTRY_V2_VERSION,
      API_CATALOG_REGISTRY_V3_VERSION,
    ].map((version) => {
      const expectation = catalogClaimExpectation(
        "openai",
        "economy",
        "invocation-limits",
        version,
      );
      const resolution = resolveStoredEvidence(
        catalogReferenceFor("openai", "economy", "invocation-limits", version),
        expectation,
      );
      expect(resolution).toMatchObject({
        status: "resolved",
        evidence: { registryVersion: version },
      });
      return { expectation, resolution };
    });

    expect(new Set(resolutions.map(({ resolution }) =>
      resolution.status === "resolved" ? resolution.evidence : null,
    )).size).toBe(3);
  });

  it("does not accept evidence or references across registry versions", () => {
    const v1Expectation = catalogClaimExpectation(
      "openai",
      "economy",
      "invocation-limits",
      API_CATALOG_REGISTRY_V1_VERSION,
    );
    const v2Expectation = catalogClaimExpectation(
      "openai",
      "economy",
      "invocation-limits",
      API_CATALOG_REGISTRY_VERSION,
    );
    const v1Reference = catalogReferenceFor(
      "openai",
      "economy",
      "invocation-limits",
      API_CATALOG_REGISTRY_V1_VERSION,
    );
    const v2Reference = catalogReferenceFor(
      "openai",
      "economy",
      "invocation-limits",
      API_CATALOG_REGISTRY_VERSION,
    );
    const v1 = resolveStoredEvidence(v1Reference, v1Expectation);
    const v2 = resolveStoredEvidence(v2Reference, v2Expectation);
    expect(v1.status).toBe("resolved");
    expect(v2.status).toBe("resolved");
    if (v1.status !== "resolved" || v2.status !== "resolved") return;

    expect(
      isResolverIssuedEvidenceForClaim(
        v1.evidence,
        v2Expectation,
        v2.value,
      ),
    ).toBe(false);
    expect(resolveStoredEvidence(v1Reference, v2Expectation)).toMatchObject({
      status: "conditional",
      reasonCode: "catalog-version-mismatch",
    });
    expect(resolveStoredEvidence(v2Reference, v1Expectation)).toMatchObject({
      status: "conditional",
      reasonCode: "catalog-version-mismatch",
    });
  });

  it("keeps both snapshots and registries recursively frozen and reference-independent", () => {
    const v1Snapshot =
      PROVIDER_CATALOG_SNAPSHOTS[API_CATALOG_REGISTRY_V1_VERSION];
    const v2Snapshot = PROVIDER_CATALOG_SNAPSHOTS[API_CATALOG_REGISTRY_VERSION];
    const historicalV2Snapshot =
      PROVIDER_CATALOG_SNAPSHOTS[API_CATALOG_REGISTRY_V2_VERSION];
    const v1Registry = getProviderRegistry(
      API_CATALOG_REGISTRY_ID,
      API_CATALOG_REGISTRY_V1_VERSION,
    );
    const v2Registry = getProviderRegistry(
      API_CATALOG_REGISTRY_ID,
      API_CATALOG_REGISTRY_VERSION,
    );
    const historicalV2Registry = getProviderRegistry(
      API_CATALOG_REGISTRY_ID,
      API_CATALOG_REGISTRY_V2_VERSION,
    );
    expect(v1Snapshot).not.toBe(v2Snapshot);
    expect(v1Snapshot).not.toBe(historicalV2Snapshot);
    expect(historicalV2Snapshot).not.toBe(v2Snapshot);
    expect(v1Snapshot.openai).not.toBe(v2Snapshot.openai);
    expect(v1Snapshot.openai.models.economy).not.toBe(
      v2Snapshot.openai.models.economy,
    );
    expect(v1Snapshot.openai.models.economy.verifiedApiClaims).toBeUndefined();
    expect(
      historicalV2Snapshot.openai.models.economy.verifiedApiClaims,
    ).toBeUndefined();
    expect(v2Snapshot.openai.models.economy.verifiedApiClaims).toBeDefined();
    expect(v2Snapshot).not.toBe(PROVIDER_CATALOG);
    expect(v2Snapshot.openai.models.economy).not.toBe(
      PROVIDER_CATALOG.openai.models.economy,
    );
    expect(Object.isFrozen(v1Snapshot.openai.models.economy.limits)).toBe(true);
    expect(Object.isFrozen(v2Snapshot.openai.models.economy.limits)).toBe(true);
    expect(
      Object.isFrozen(
        v2Snapshot.openai.models.economy.verifiedApiClaims?.modelCapabilities
          .capabilityIds,
      ),
    ).toBe(true);
    expect(v1Registry).not.toBe(v2Registry);
    expect(v1Registry).not.toBe(historicalV2Registry);
    expect(historicalV2Registry).not.toBe(v2Registry);
    expect(v1Registry?.entries[0]).not.toBe(v2Registry?.entries[0]);
    expect(Object.isFrozen(v1Registry?.entries[0].claims["model-identity"]?.value)).toBe(
      true,
    );
    expect(Object.isFrozen(v2Registry?.entries[0].claims["model-identity"]?.value)).toBe(
      true,
    );
  });

  it("publishes v3 API facts without rewriting historical registries or provider-owned surfaces", () => {
    const v1 = getProviderRegistry(
      API_CATALOG_REGISTRY_ID,
      API_CATALOG_REGISTRY_V1_VERSION,
    );
    const v2 = getProviderRegistry(
      API_CATALOG_REGISTRY_ID,
      API_CATALOG_REGISTRY_V2_VERSION,
    );
    const v3 = getProviderRegistry(
      API_CATALOG_REGISTRY_ID,
      API_CATALOG_REGISTRY_V3_VERSION,
    );
    const newClaimIds = [
      "model-capabilities",
      "api-offering-identity",
      "api-access-limits",
      "api-access-capabilities",
    ] as const;

    for (const historical of [v1, v2]) {
      for (const entry of historical?.entries ?? []) {
        for (const claimId of newClaimIds) {
          expect(entry.claims[claimId]).toBeUndefined();
        }
      }
    }
    for (const entry of v3?.entries ?? []) {
      for (const claimId of newClaimIds) {
        expect(entry.claims[claimId]).toBeDefined();
      }
      const apiIdentity = entry.claims["api-offering-identity"];
      expect(apiIdentity?.value).toMatchObject({
        modelId: entry.legacyModel.catalogId,
        mode: "api",
      });
      expect(apiIdentity?.value).not.toHaveProperty("supportedSurfaces");
      expect(apiIdentity?.value).not.toHaveProperty("offeringId");
      expect(apiIdentity?.subject).toEqual({
        providerId: entry.providerId,
        subjectId: entry.legacyModel.catalogId,
        fieldPath: "api.offering-identity",
      });
    }
    expect(API_CATALOG_REGISTRY_VERSION).toBe(API_CATALOG_REGISTRY_V3_VERSION);
    expect(PLANNER_API_ROUTE_ADAPTER_VERSION).toBe(
      "provider-endpoint-to-planner-surface-v1",
    );
  });

  it("rejects unknown and inherited-property version names without throwing", () => {
    for (const version of ["unknown", "__proto__", "constructor", "toString"]) {
      expect(getProviderRegistry(API_CATALOG_REGISTRY_ID, version)).toBeUndefined();
      const reference = {
        ...catalogReferenceFor(
          "openai",
          "economy",
          "model-identity",
          API_CATALOG_REGISTRY_V1_VERSION,
        ),
        catalogVersion: version,
      };
      expect(
        resolveStoredEvidence(
          reference,
          catalogClaimExpectation(
            "openai",
            "economy",
            "model-identity",
            API_CATALOG_REGISTRY_V1_VERSION,
          ),
        ),
      ).toMatchObject({
        status: "conditional",
        reasonCode: "catalog-version-mismatch",
      });
    }
  });
});

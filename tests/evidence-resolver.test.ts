import { describe, expect, it } from "vitest";

import {
  API_CATALOG_REGISTRY_ID,
  API_CATALOG_REGISTRY_VERSION,
  VERSIONED_PROVIDER_REGISTRY,
} from "@/config/versioned-provider-registry";
import {
  catalogClaimExpectation,
  catalogReferenceFor,
  isResolverIssuedEvidence,
  isResolverIssuedEvidenceForClaim,
  isResolverIssuedPlannerQualityTier,
  parseStoredEvidenceInput,
  resolveStoredEvidence,
  storedEvidenceInputSchema,
} from "@/lib/offerings/evidence-resolver";
describe("stored evidence authority", () => {
  it("resolves only the exact immutable registry claim", () => {
    const reference = catalogReferenceFor("openai", "economy", "invocation-limits");
    const expectation = catalogClaimExpectation(
      "openai",
      "economy",
      "invocation-limits",
    );
    const first = resolveStoredEvidence(reference, expectation);
    const second = resolveStoredEvidence(reference, expectation);

    expect(first).toMatchObject({
      status: "resolved",
      value: { maxOutputTokens: 128_000, maxCombinedTokens: 1_050_000 },
      evidence: {
        kind: "provider-published",
        authority: "allowlisted-registry-resolver",
        registryId: API_CATALOG_REGISTRY_ID,
        registryVersion: API_CATALOG_REGISTRY_VERSION,
        entryId: "gpt-5.6-luna",
        claimId: "invocation-limits",
        providerId: "openai",
        subjectId: "gpt-5.6-luna",
        fieldPath: "model.invocation-limits",
      },
    });
    expect(first.status === "resolved" && isResolverIssuedEvidence(first.evidence)).toBe(true);
    expect(
      first.status === "resolved" &&
        second.status === "resolved" &&
        first.evidence === second.evidence,
    ).toBe(true);
  });

  it("rejects forged trusted discriminators and official-looking extra fields", () => {
    const expectation = catalogClaimExpectation(
      "openai",
      "economy",
      "model-identity",
    );
    const forged = {
      kind: "provider-published",
      authority: "allowlisted-registry-resolver",
      sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
      verifiedAt: "2026-07-17",
    };
    const extraField = {
      ...catalogReferenceFor("openai", "economy", "model-identity"),
      sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
    };

    expect(storedEvidenceInputSchema.safeParse(forged).success).toBe(false);
    expect(storedEvidenceInputSchema.safeParse(extraField).success).toBe(false);
    expect(resolveStoredEvidence(forged, expectation)).toEqual({
      status: "conditional",
      reasonCode: "evidence-authority-invalid",
    });
    expect(resolveStoredEvidence(extraField, expectation)).toEqual({
      status: "conditional",
      reasonCode: "evidence-authority-invalid",
    });
  });

  it("keeps catalog ID, version, entry, and claim mismatches distinct", () => {
    const reference = catalogReferenceFor("openai", "economy", "model-identity");
    const expectation = catalogClaimExpectation(
      "openai",
      "economy",
      "model-identity",
    );

    expect(
      resolveStoredEvidence({ ...reference, catalogId: "user-catalog" }, expectation),
    ).toMatchObject({ status: "conditional", reasonCode: "catalog-reference-unresolved" });
    expect(
      resolveStoredEvidence({ ...reference, catalogVersion: "latest" }, expectation),
    ).toMatchObject({ status: "conditional", reasonCode: "catalog-version-mismatch" });
    expect(
      resolveStoredEvidence({ ...reference, entryId: "unknown-model" }, expectation),
    ).toMatchObject({ status: "conditional", reasonCode: "catalog-reference-unresolved" });
    expect(
      resolveStoredEvidence({ ...reference, claimId: "standard-text-pricing" }, expectation),
    ).toMatchObject({ status: "conditional", reasonCode: "catalog-claim-mismatch" });
    expect(
      resolveStoredEvidence(
        reference,
        catalogClaimExpectation("openai", "balanced", "model-identity"),
      ),
    ).toMatchObject({ status: "conditional", reasonCode: "catalog-claim-mismatch" });
  });

  it("binds issued evidence to the exact subject, field, claim, and value", () => {
    const limitsExpectation = catalogClaimExpectation(
      "openai",
      "economy",
      "invocation-limits",
    );
    const limits = resolveStoredEvidence(
      catalogReferenceFor("openai", "economy", "invocation-limits"),
      limitsExpectation,
    );
    const identity = resolveStoredEvidence(
      catalogReferenceFor("openai", "economy", "model-identity"),
      catalogClaimExpectation("openai", "economy", "model-identity"),
    );
    expect(limits.status).toBe("resolved");
    expect(identity.status).toBe("resolved");
    if (limits.status !== "resolved" || identity.status !== "resolved") return;

    expect(identity.value).not.toHaveProperty("planningQualityTier");
    expect(isResolverIssuedPlannerQualityTier(identity.evidence, "economy")).toBe(
      true,
    );
    expect(isResolverIssuedPlannerQualityTier(identity.evidence, "premium")).toBe(
      false,
    );

    expect(
      isResolverIssuedEvidenceForClaim(
        limits.evidence,
        limitsExpectation,
        limits.value,
      ),
    ).toBe(true);
    expect(
      isResolverIssuedEvidenceForClaim(
        limits.evidence,
        limitsExpectation,
        { ...limits.value, maxOutputTokens: 999_999 },
      ),
    ).toBe(false);
    expect(
      isResolverIssuedEvidenceForClaim(
        identity.evidence,
        limitsExpectation,
        limits.value,
      ),
    ).toBe(false);
    expect(
      isResolverIssuedEvidenceForClaim(
        limits.evidence,
        { ...limitsExpectation, providerId: "anthropic" },
        limits.value,
      ),
    ).toBe(false);
  });

  it("treats inherited-property entry and claim names as unresolved data", () => {
    const reference = catalogReferenceFor("openai", "economy", "model-identity");
    const expectation = catalogClaimExpectation(
      "openai",
      "economy",
      "model-identity",
    );
    for (const specialKey of ["__proto__", "constructor", "toString"]) {
      expect(
        resolveStoredEvidence(
          { ...reference, entryId: specialKey },
          { ...expectation, entryId: specialKey },
        ),
      ).toMatchObject({
        status: "conditional",
        reasonCode: "catalog-reference-unresolved",
      });
      expect(
        resolveStoredEvidence(
          { ...reference, claimId: specialKey },
          { ...expectation, claimId: specialKey } as unknown as typeof expectation,
        ),
      ).toMatchObject({
        status: "conditional",
        reasonCode: "catalog-claim-mismatch",
      });
    }
  });

  it("does not treat user, preset, or unverified connector input as official evidence", () => {
    const expectation = catalogClaimExpectation(
      "openai",
      "economy",
      "model-identity",
    );
    const observed = {
      kind: "user-observed" as const,
      observedAt: "2026-07-17T00:00:00.000Z",
      note: "User-entered Custom subscription profile",
    };
    const preset = {
      kind: "preset-ref" as const,
      presetId: "custom-official-looking",
      presetVersion: "v1",
      claimId: "profile",
    };
    const connector = {
      kind: "connector-ref" as const,
      adapterId: "fake-connector",
      adapterVersion: "v1",
      bindingId: "another-account",
      snapshotId: "snapshot-1",
      snapshotVersion: "v1",
    };

    expect(resolveStoredEvidence(observed, expectation)).toMatchObject({
      status: "conditional",
      reasonCode: "profile-unverified",
    });
    expect(resolveStoredEvidence(preset, expectation)).toMatchObject({
      status: "conditional",
      reasonCode: "preset-version-mismatch",
    });
    expect(resolveStoredEvidence(connector, expectation)).toMatchObject({
      status: "conditional",
      reasonCode: "connector-unverified",
    });
  });

  it("does not restore authority from an exported resolved evidence snapshot", () => {
    const reference = catalogReferenceFor("google", "balanced", "standard-text-pricing");
    const expectation = catalogClaimExpectation(
      "google",
      "balanced",
      "standard-text-pricing",
    );
    const resolved = resolveStoredEvidence(reference, expectation);
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;

    const exportedSnapshot = JSON.parse(JSON.stringify(resolved.evidence)) as unknown;
    expect(isResolverIssuedEvidence(exportedSnapshot)).toBe(false);
    expect(parseStoredEvidenceInput(exportedSnapshot)).toEqual({
      success: false,
      reason: "invalid-evidence-input",
    });
    expect(resolveStoredEvidence(exportedSnapshot, expectation)).toEqual({
      status: "conditional",
      reasonCode: "evidence-authority-invalid",
    });
  });

  it("keeps the independent registry snapshot recursively immutable", () => {
    const entry = VERSIONED_PROVIDER_REGISTRY.entries[0];
    expect(Object.isFrozen(VERSIONED_PROVIDER_REGISTRY)).toBe(true);
    expect(Object.isFrozen(VERSIONED_PROVIDER_REGISTRY.entries)).toBe(true);
    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(entry.legacyModel)).toBe(true);
    expect(Object.isFrozen(entry.legacyModel.limits)).toBe(true);
    expect(Object.isFrozen(entry.claims["invocation-limits"]?.value)).toBe(true);
  });
});

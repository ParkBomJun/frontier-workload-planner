import { describe, expect, it } from "vitest";

import {
  intersectCapabilities,
  intersectInvocationLimits,
  isResolverIssuedOfferingEligibilityResult,
  resolveOfferingEligibility,
} from "@/lib/offerings/eligibility";
import { resolveApiCatalogEntry } from "@/lib/offerings/provider-catalog-adapter";
import type {
  ModelBoundOffering,
  ModelDefinition,
  ModelOpaqueSubscriptionOffering,
  OfferingEligibilityRequirement,
  UserObservedEvidence,
} from "@/types/offerings";

const adapterEntry = resolveApiCatalogEntry("openai", "balanced");

const baseRequirement: OfferingEligibilityRequirement = {
  surface: "chat",
  minimumQualityTier: "economy",
  requiredCapabilities: [],
  tokenScenarios: [
    { scenario: "low", inputTokens: 10, outputTokens: 5 },
    { scenario: "expected", inputTokens: 40, outputTokens: 20 },
    { scenario: "high", inputTokens: 80, outputTokens: 50 },
  ],
};

function resolve(
  offering: ModelBoundOffering = adapterEntry.offering,
  model: ModelDefinition = adapterEntry.model,
  requirement: OfferingEligibilityRequirement = baseRequirement,
) {
  return resolveOfferingEligibility(
    offering,
    new Map([[model.id, model]]),
    requirement,
  );
}

describe("offering eligibility", () => {
  it("intersects resolved limits and capability sets without mutating inputs", () => {
    const leftLimits = {
      maxInputTokens: 100,
      maxOutputTokens: 80,
      maxCombinedTokens: 150,
    };
    const rightLimits = {
      maxInputTokens: 90,
      maxOutputTokens: 60,
      maxCombinedTokens: 140,
    };
    expect(intersectInvocationLimits(leftLimits, rightLimits)).toEqual({
      maxInputTokens: 90,
      maxOutputTokens: 60,
      maxCombinedTokens: 140,
    });
    expect(leftLimits).toEqual({
      maxInputTokens: 100,
      maxOutputTokens: 80,
      maxCombinedTokens: 150,
    });
    expect(
      intersectCapabilities(
        ["tool-use", "structured-output"],
        ["structured-output", "file-input"],
      ),
    ).toEqual(["structured-output"]);
  });

  it("keeps the passive current catalog conditional when access and capabilities lack claims", () => {
    expect(resolve()).toMatchObject({
      status: "conditional",
      reasonCodes: [
        "evidence-authority-invalid",
        "access-limits-incomplete",
        "model-capabilities-incomplete",
        "access-capabilities-incomplete",
      ],
      fallbackRequired: true,
    });
  });

  it("brands and deeply freezes only the exact resolver-issued result", () => {
    const issued = resolve();
    expect(isResolverIssuedOfferingEligibilityResult(issued)).toBe(true);
    expect(Object.isFrozen(issued)).toBe(true);
    if (issued.status !== "conditional") {
      throw new Error("Current catalog fixture must remain conditional.");
    }
    expect(Object.isFrozen(issued.reasonCodes)).toBe(true);

    const clone = {
      ...issued,
      reasonCodes: [...issued.reasonCodes],
    } as typeof issued;
    expect(isResolverIssuedOfferingEligibilityResult(clone)).toBe(false);
    expect(isResolverIssuedOfferingEligibilityResult(null)).toBe(false);
  });

  it("rejects a missing model and enforces quality only from the exact identity claim", () => {
    expect(
      resolveOfferingEligibility(adapterEntry.offering, new Map(), baseRequirement),
    ).toMatchObject({
      status: "ineligible",
      reasonCodes: ["model-reference-missing"],
    });
    expect(
      resolveOfferingEligibility(
        adapterEntry.offering,
        new Map([
          [adapterEntry.model.id, { ...adapterEntry.model, id: "different-model" }],
        ]),
        baseRequirement,
      ),
    ).toMatchObject({
      status: "ineligible",
      reasonCodes: ["model-reference-missing"],
    });
    expect(
      resolve(adapterEntry.offering, adapterEntry.model, {
        ...baseRequirement,
        minimumQualityTier: "premium",
      }),
    ).toMatchObject({
      status: "ineligible",
      reasonCodes: ["below-minimum-quality"],
    });

    const forgedQuality: ModelDefinition = {
      ...adapterEntry.model,
      qualityTier: "premium",
    };
    expect(
      resolve(adapterEntry.offering, forgedQuality, {
        ...baseRequirement,
        minimumQualityTier: "premium",
      }),
    ).toMatchObject({
      status: "conditional",
      reasonCodes: expect.arrayContaining(["evidence-authority-invalid"]),
    });
  });

  it("applies exact official model limits as hard Low/Expected/High boundaries", () => {
    const result = resolve(adapterEntry.offering, adapterEntry.model, {
      ...baseRequirement,
      tokenScenarios: [
        { scenario: "low", inputTokens: 10, outputTokens: 5 },
        { scenario: "expected", inputTokens: 40, outputTokens: 20 },
        { scenario: "high", inputTokens: 80, outputTokens: 128_001 },
      ],
    });
    expect(result).toMatchObject({
      status: "ineligible",
      reasonCodes: ["output-limit-exceeded"],
      scenarioFailures: [
        {
          scenario: "high",
          failures: [
            {
              code: "output-limit-exceeded",
              actualTokens: 128_001,
              limitTokens: 128_000,
            },
          ],
        },
      ],
    });
  });

  it("does not bind a legitimate limit claim to altered limit values", () => {
    if (adapterEntry.model.invocationLimits.knowledge !== "complete") {
      throw new Error("Fixture requires complete bundled model limits.");
    }
    const forgedModel: ModelDefinition = {
      ...adapterEntry.model,
      invocationLimits: {
        ...adapterEntry.model.invocationLimits,
        limits: { maxInputTokens: 1, maxOutputTokens: 1, maxCombinedTokens: 2 },
      },
    };
    const result = resolve(adapterEntry.offering, forgedModel);
    expect(result).toMatchObject({
      status: "conditional",
      reasonCodes: expect.arrayContaining(["evidence-authority-invalid"]),
      fallbackRequired: true,
    });
    expect(result).not.toHaveProperty("scenarioFailures");
  });

  it("does not reuse model claims for access limits or capabilities", () => {
    if (adapterEntry.model.invocationLimits.knowledge !== "complete") {
      throw new Error("Fixture requires complete bundled model limits.");
    }
    const limitEvidence = adapterEntry.model.invocationLimits.evidence;
    const reused: ModelBoundOffering = {
      ...adapterEntry.offering,
      limitPolicy: { kind: "same-as-model", evidence: limitEvidence },
      capabilityPolicy: {
        kind: "same-as-model",
        evidence: adapterEntry.model.evidence,
      },
    };
    expect(resolve(reused)).toMatchObject({
      status: "conditional",
      reasonCodes: [
        "evidence-authority-invalid",
        "model-capabilities-incomplete",
      ],
    });

    const boundedReuse: ModelBoundOffering = {
      ...adapterEntry.offering,
      limitPolicy: {
        kind: "bounded",
        invocationLimits: {
          knowledge: "complete",
          limits: { maxInputTokens: 10 },
          evidence: limitEvidence,
        },
      },
    };
    expect(resolve(boundedReuse)).toMatchObject({
      status: "conditional",
      reasonCodes: expect.arrayContaining(["evidence-authority-invalid"]),
    });
  });

  it("uses an exact trusted partial model claim only as a conservative hard bound", () => {
    if (adapterEntry.model.invocationLimits.knowledge !== "complete") {
      throw new Error("Fixture requires complete bundled model limits.");
    }
    const partialModel: ModelDefinition = {
      ...adapterEntry.model,
      invocationLimits: {
        knowledge: "partial",
        limits: { ...adapterEntry.model.invocationLimits.limits },
        reason: "The consumer intentionally treats the complete claim as incomplete.",
        evidence: adapterEntry.model.invocationLimits.evidence,
      },
    };
    expect(
      resolve(adapterEntry.offering, partialModel, {
        ...baseRequirement,
        tokenScenarios: [
          { scenario: "low", inputTokens: 10, outputTokens: 5 },
          { scenario: "expected", inputTokens: 40, outputTokens: 20 },
          { scenario: "high", inputTokens: 80, outputTokens: 128_001 },
        ],
      }),
    ).toMatchObject({
      status: "ineligible",
      reasonCodes: ["output-limit-exceeded"],
    });
  });

  it("does not hard-filter a surface asserted by an unverified Offering clone", () => {
    expect(
      resolve({ ...adapterEntry.offering, supportedSurfaces: ["batch"] }),
    ).toMatchObject({
      status: "conditional",
      reasonCodes: expect.arrayContaining(["evidence-authority-invalid"]),
    });
  });

  it("keeps user-observed capability knowledge conditional", () => {
    const observed: UserObservedEvidence = {
      kind: "user-observed",
      observedAt: "2026-07-17T00:00:00.000Z",
      note: "User-entered capability claim",
    };
    const model: ModelDefinition = {
      ...adapterEntry.model,
      capabilityProfile: {
        knowledge: "complete",
        capabilityIds: ["structured-output"],
        evidence: observed,
      },
    };
    expect(
      resolve(adapterEntry.offering, model, {
        ...baseRequirement,
        requiredCapabilities: ["structured-output"],
      }),
    ).toMatchObject({
      status: "conditional",
      reasonCodes: expect.arrayContaining(["evidence-authority-invalid"]),
    });
  });

  it("does not reuse API evidence to confirm a model-opaque subscription profile", () => {
    if (adapterEntry.model.invocationLimits.knowledge !== "complete") {
      throw new Error("Fixture requires complete bundled model limits.");
    }
    const opaque: ModelOpaqueSubscriptionOffering = {
      kind: "model-opaque-subscription",
      id: "subscription.openai.opaque-plan",
      providerId: adapterEntry.offering.providerId,
      mode: "subscription",
      supportedSurfaces: ["chat"],
      evidence: adapterEntry.model.evidence,
      eligibility: {
        kind: "profiled",
        evidence: adapterEntry.model.evidence,
        profile: {
          qualityTier: "balanced",
          capabilityProfile: {
            knowledge: "complete",
            capabilityIds: ["structured-output"],
            evidence: adapterEntry.model.evidence,
          },
          invocationLimits: {
            knowledge: "complete",
            limits: { ...adapterEntry.model.invocationLimits.limits },
            evidence: adapterEntry.model.invocationLimits.evidence,
          },
        },
      },
    };
    expect(resolveOfferingEligibility(opaque, new Map(), baseRequirement)).toMatchObject({
      status: "conditional",
      modelId: null,
      reasonCodes: ["evidence-authority-invalid", "profile-unverified"],
      fallbackRequired: true,
    });
    expect(
      resolveOfferingEligibility(
        {
          ...opaque,
          eligibility: { kind: "unprofiled", reason: "model-undisclosed" },
        },
        new Map(),
        baseRequirement,
      ),
    ).toMatchObject({
      status: "conditional",
      reasonCodes: ["evidence-authority-invalid", "profile-unverified"],
    });
  });

  it("validates the three-scenario contract and does not mutate caller objects", () => {
    const before = JSON.stringify({
      offering: adapterEntry.offering,
      model: adapterEntry.model,
      requirement: baseRequirement,
    });
    resolve();
    expect(
      JSON.stringify({
        offering: adapterEntry.offering,
        model: adapterEntry.model,
        requirement: baseRequirement,
      }),
    ).toBe(before);
    expect(() =>
      resolve(adapterEntry.offering, adapterEntry.model, {
        ...baseRequirement,
        tokenScenarios: baseRequirement.tokenScenarios.slice(0, 2),
      }),
    ).toThrow(/one Low, Expected, and High/);
  });
});

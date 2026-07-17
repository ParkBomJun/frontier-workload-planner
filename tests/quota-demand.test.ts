import { describe, expect, it } from "vitest";

import {
  canonicalizeSubscriptionConsumptionClaimValue,
  VERSIONED_PROVIDER_REGISTRY,
} from "@/config/versioned-provider-registry";
import { resolveApiCatalogEntry } from "@/lib/offerings/provider-catalog-adapter";
import {
  calculateQuotaDemandRange,
  estimateQuotaDemand,
  isIssuedQuotaDemandResultFor,
} from "@/lib/subscriptions/quota-demand";
import {
  toDerivedSubscriptionMicrounits,
  toSourceSubscriptionMicrounits,
} from "@/lib/subscriptions/fixed-decimal";
import type { TaskAnalysis } from "@/types/domain";
import type { ProviderPublishedEvidence } from "@/types/offerings";
import type {
  CalibratedSubscriptionQuota,
  MeteredSubscriptionQuota,
  SubscriptionQuota,
} from "@/types/subscriptions";

const analysis: TaskAnalysis = {
  taskId: "task-1",
  taskType: "software-development",
  complexity: "medium",
  reasoningDepth: "moderate",
  expectedIterations: 3,
  estimatedInputSize: "m",
  estimatedOutputSize: "m",
  uncertainty: "medium",
  recommendedModelTier: "balanced",
  workMode: "coding-agent",
  requiredQualityTier: "balanced",
  requiredCapabilities: ["code-editing"],
  upgradeConditions: [],
  failureRisk: "medium",
  riskFactors: [],
  rationale: "Quota fixture",
};

const observedEvidence = {
  kind: "user-observed" as const,
  observedAt: "2026-07-17T09:00:00.000Z",
  note: "Observed quota consumption",
};

const remainingEvidence = {
  kind: "user-observed" as const,
  observedAt: "2026-07-17T09:00:00.000Z",
  note: "Observed remaining quota",
};

function observedMeteredQuota(
  patch: Partial<MeteredSubscriptionQuota> = {},
): MeteredSubscriptionQuota {
  return {
    kind: "metered",
    unit: "credit",
    included: { value: 100, evidence: observedEvidence },
    remaining: { value: 50, evidence: remainingEvidence },
    consumptionRule: {
      kind: "observed-range-per-basis",
      unit: "credit",
      basis: "task",
      low: 1,
      expected: 2,
      high: 3,
      sampleSize: 5,
      evidence: observedEvidence,
    },
    ...patch,
  };
}

const evidenceSubject = {
  providerId: "github",
  subjectId: "subscription.github.copilot-like",
};

describe("calculateQuotaDemandRange", () => {
  it("separates strict source precision from derived floating-point residue", () => {
    expect(toSourceSubscriptionMicrounits(1e-13)).toBeNull();
    expect(toSourceSubscriptionMicrounits(1.0000000000001)).toBeNull();
    expect(toSourceSubscriptionMicrounits(12.345678)).toBe(12_345_678);
    expect(toSourceSubscriptionMicrounits(8.030292)).toBe(8_030_292);
    expect(toSourceSubscriptionMicrounits(9_007_199_254.74097)).toBe(
      9_007_199_254_740_970,
    );
    expect(toSourceSubscriptionMicrounits(0.1 * 3)).toBeNull();
    expect(toDerivedSubscriptionMicrounits(0.1 * 3)).toBe(300_000);

    expect(
      calculateQuotaDemandRange({
        unit: "credit",
        basis: "analysis-iteration",
        perBasis: { low: 0.1, expected: 0.1, high: 0.1 },
        expectedIterations: 3,
      }),
    ).toEqual({
      ok: true,
      demand: {
        unit: "credit",
        low: 0.1 * 2,
        expected: 0.1 * 3,
        high: 0.1 * 4,
      },
    });
  });

  it("keeps fixed task demand constant for one and three expected iterations", () => {
    for (const expectedIterations of [1, 3]) {
      expect(
        calculateQuotaDemandRange({
          unit: "request",
          basis: "task",
          perBasis: { low: 2, expected: 2, high: 2 },
          expectedIterations,
        }),
      ).toEqual({
        ok: true,
        demand: { unit: "request", low: 2, expected: 2, high: 2 },
      });
    }
  });

  it("applies the shared 1/1/2 and 2/3/4 iteration multipliers", () => {
    expect(
      calculateQuotaDemandRange({
        unit: "request",
        basis: "analysis-iteration",
        perBasis: { low: 2, expected: 2, high: 2 },
        expectedIterations: 1,
      }),
    ).toEqual({
      ok: true,
      demand: { unit: "request", low: 2, expected: 2, high: 4 },
    });
    expect(
      calculateQuotaDemandRange({
        unit: "request",
        basis: "analysis-iteration",
        perBasis: { low: 2, expected: 2, high: 2 },
        expectedIterations: 3,
      }),
    ).toEqual({
      ok: true,
      demand: { unit: "request", low: 4, expected: 6, high: 8 },
    });
  });

  it("multiplies an observed range by its matching scenario iteration count", () => {
    expect(
      calculateQuotaDemandRange({
        unit: "percent-point",
        basis: "analysis-iteration",
        perBasis: { low: 1, expected: 2, high: 3 },
        expectedIterations: 3,
      }),
    ).toEqual({
      ok: true,
      demand: { unit: "percent-point", low: 2, expected: 6, high: 12 },
    });
  });

  it("rejects invalid ranges, units, non-finite values, and iterations", () => {
    expect(
      calculateQuotaDemandRange({
        unit: "credit",
        basis: "task",
        perBasis: { low: 3, expected: 2, high: 1 },
        expectedIterations: 3,
      }),
    ).toEqual({ ok: false, reasonCode: "consumption-range-invalid" });
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        calculateQuotaDemandRange({
          unit: "credit",
          basis: "task",
          perBasis: { low: 1, expected: value, high: 3 },
          expectedIterations: 3,
        }),
      ).toEqual({ ok: false, reasonCode: "consumption-value-non-finite" });
    }
    for (const expectedIterations of [0, 1.5, 6, Number.NaN]) {
      expect(
        calculateQuotaDemandRange({
          unit: "credit",
          basis: "task",
          perBasis: { low: 1, expected: 2, high: 3 },
          expectedIterations,
        }),
      ).toEqual({ ok: false, reasonCode: "analysis-iteration-count-invalid" });
    }
    expect(
      calculateQuotaDemandRange({
        unit: "tokens" as never,
        basis: "task",
        perBasis: { low: 1, expected: 2, high: 3 },
        expectedIterations: 3,
      }),
    ).toEqual({ ok: false, reasonCode: "consumption-unit-mismatch" });
  });
});

describe("estimateQuotaDemand", () => {
  it("returns a known user-observed range without promoting its provenance", () => {
    expect(
      estimateQuotaDemand({
        quota: observedMeteredQuota(),
        analysis,
        evidenceSubject,
      }),
    ).toEqual({
      status: "known",
      confidence: "user-observed",
      basis: "task",
      demand: { unit: "credit", low: 1, expected: 2, high: 3 },
      evidence: observedEvidence,
    });
  });

  it("accepts the calibrated 0 and 100 percent capacity boundaries", () => {
    for (const remainingPercent of [0, 100]) {
      const quota: CalibratedSubscriptionQuota = {
        kind: "calibrated",
        unit: "percent-point",
        remainingPercent: { value: remainingPercent, evidence: remainingEvidence },
        consumptionRule: {
          kind: "observed-range-per-basis",
          unit: "percent-point",
          basis: "task",
          low: 1,
          expected: 2,
          high: 3,
          sampleSize: 2,
          evidence: observedEvidence,
        },
      };
      expect(
        estimateQuotaDemand({ quota, analysis, evidenceSubject }),
      ).toMatchObject({
        status: "known",
        confidence: "user-observed",
        demand: { unit: "percent-point", low: 1, expected: 2, high: 3 },
      });
    }
  });

  it("rejects quota/rule unit mismatches and invalid quota numbers", () => {
    const mismatch = observedMeteredQuota({
      consumptionRule: {
        ...observedMeteredQuota().consumptionRule,
        unit: "request",
      },
    });
    expect(
      estimateQuotaDemand({ quota: mismatch, analysis, evidenceSubject }),
    ).toEqual({
      status: "unknown",
      reasonCode: "consumption-unit-mismatch",
      unit: "credit",
    });

    for (const remaining of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        estimateQuotaDemand({
          quota: observedMeteredQuota({
            remaining: { value: remaining, evidence: remainingEvidence },
          }),
          analysis,
          evidenceSubject,
        }),
      ).toEqual({
        status: "unknown",
        reasonCode: "consumption-value-non-finite",
        unit: "credit",
      });
    }
  });

  it("rejects invalid observed ranges, sample sizes, and timestamps", () => {
    const baseRule = observedMeteredQuota().consumptionRule;
    if (baseRule.kind !== "observed-range-per-basis") {
      throw new Error("Fixture requires an observed range.");
    }
    const invalidRules = [
      { ...baseRule, low: 4, expected: 2 },
      { ...baseRule, sampleSize: 0 },
      {
        ...baseRule,
        evidence: { ...observedEvidence, observedAt: "2026-02-30T09:00:00.000Z" },
      },
    ];
    const expectedReasons = [
      "consumption-range-invalid",
      "consumption-range-invalid",
      "consumption-evidence-unverified",
    ];
    invalidRules.forEach((consumptionRule, index) => {
      expect(
        estimateQuotaDemand({
          quota: observedMeteredQuota({ consumptionRule }),
          analysis,
          evidenceSubject,
        }),
      ).toMatchObject({
        status: "unknown",
        reasonCode: expectedReasons[index],
      });
    });
  });

  it("keeps opaque quota unknown and never invents a numeric unit", () => {
    expect(
      estimateQuotaDemand({
        quota: { kind: "opaque", description: "Private variable limit" },
        analysis,
        evidenceSubject,
      }),
    ).toEqual({ status: "unknown", reasonCode: "quota-opaque", unit: null });
  });

  it("rejects forged or wrong-subject fixed-rule evidence", () => {
    const issuedForAnotherClaim = resolveApiCatalogEntry(
      "openai",
      "economy",
    ).model.invocationLimits;
    if (issuedForAnotherClaim.knowledge !== "complete") {
      throw new Error("Fixture requires issued invocation-limit evidence.");
    }
    const fixedQuota = (evidence: typeof issuedForAnotherClaim.evidence) =>
      ({
        kind: "metered",
        unit: "request",
        included: { value: 100, evidence: observedEvidence },
        remaining: { value: 50, evidence: remainingEvidence },
        consumptionRule: {
          kind: "fixed-per-basis",
          unit: "request",
          basis: "analysis-iteration",
          units: 2,
          evidence,
        },
      }) as MeteredSubscriptionQuota;

    const forgedExactSubject = {
      ...issuedForAnotherClaim.evidence,
      providerId: evidenceSubject.providerId,
      subjectId: evidenceSubject.subjectId,
      fieldPath: "subscription.quota.consumption",
      claimId: "subscription-consumption",
    } as unknown as ProviderPublishedEvidence;
    for (const evidence of [
      issuedForAnotherClaim.evidence,
      { ...issuedForAnotherClaim.evidence },
      forgedExactSubject,
      null as unknown as ProviderPublishedEvidence,
    ]) {
      expect(
        estimateQuotaDemand({
          quota: fixedQuota(evidence),
          analysis,
          evidenceSubject,
        }),
      ).toEqual({
        status: "unknown",
        reasonCode: "consumption-evidence-unverified",
        unit: "request",
      });
    }

    for (const consumptionRule of [
      { ...fixedQuota(forgedExactSubject).consumptionRule, units: 3 },
      {
        ...fixedQuota(forgedExactSubject).consumptionRule,
        basis: "task" as const,
      },
      {
        ...fixedQuota(forgedExactSubject).consumptionRule,
        unit: "credit" as const,
      },
    ]) {
      expect(
        estimateQuotaDemand({
          quota: {
            ...fixedQuota(forgedExactSubject),
            unit: consumptionRule.unit,
            consumptionRule,
          },
          analysis,
          evidenceSubject,
        }),
      ).toMatchObject({
        status: "unknown",
        reasonCode: "consumption-evidence-unverified",
      });
    }
  });

  it("publishes no fabricated subscription-consumption claim in current snapshots", () => {
    for (const entry of VERSIONED_PROVIDER_REGISTRY.entries) {
      expect(entry.claims["subscription-consumption"]).toBeUndefined();
    }
  });

  it("normalizes subscription-consumption claims to one closed frozen value", () => {
    const canonical = canonicalizeSubscriptionConsumptionClaimValue({
      kind: "fixed-per-basis",
      unit: "request",
      basis: "analysis-iteration",
      units: 2,
      ignored: "caller field",
    } as never);
    expect(canonical).toEqual({
      kind: "fixed-per-basis",
      unit: "request",
      basis: "analysis-iteration",
      units: 2,
    });
    expect(Object.isFrozen(canonical)).toBe(true);
  });

  it("binds every issued demand result to the exact quota object and subject", () => {
    const quota = observedMeteredQuota();
    const result = estimateQuotaDemand({ quota, analysis, evidenceSubject });

    expect(
      isIssuedQuotaDemandResultFor(result, quota, analysis, evidenceSubject),
    ).toBe(true);
    expect(
      isIssuedQuotaDemandResultFor(
        { ...result },
        quota,
        analysis,
        evidenceSubject,
      ),
    ).toBe(false);
    expect(
      isIssuedQuotaDemandResultFor(
        result,
        structuredClone(quota),
        analysis,
        evidenceSubject,
      ),
    ).toBe(false);
    expect(
      isIssuedQuotaDemandResultFor(
        result,
        quota,
        analysis,
        {
          ...evidenceSubject,
          subjectId: "subscription.github.other-account",
        },
      ),
    ).toBe(false);
    expect(
      isIssuedQuotaDemandResultFor(
        result,
        quota,
        { ...analysis, expectedIterations: analysis.expectedIterations + 1 },
        evidenceSubject,
      ),
    ).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.status === "known" && Object.isFrozen(result.demand)).toBe(true);
    expect(Object.isFrozen(observedEvidence)).toBe(false);
  });

  it("is deterministic, reads no clock, and does not mutate inputs", () => {
    const quota: SubscriptionQuota = observedMeteredQuota({
      consumptionRule: {
        ...observedMeteredQuota().consumptionRule,
        basis: "analysis-iteration",
      },
    });
    const before = structuredClone({ quota, analysis, evidenceSubject });
    const first = estimateQuotaDemand({ quota, analysis, evidenceSubject });
    const second = estimateQuotaDemand({ quota, analysis, evidenceSubject });

    expect(first).toEqual(second);
    expect({ quota, analysis, evidenceSubject }).toEqual(before);
    expect(first).toMatchObject({
      status: "known",
      confidence: "user-observed",
      demand: { unit: "credit", low: 2, expected: 6, high: 12 },
    });
  });
});

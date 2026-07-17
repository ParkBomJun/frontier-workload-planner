import { iterationsForCostScenario } from "@/lib/calculation/scenario-iterations";
import {
  toSourceSubscriptionMicrounits,
  toDerivedSubscriptionMicrounits,
} from "@/lib/subscriptions/fixed-decimal";
import {
  canonicalizeSubscriptionConsumptionClaimValue,
  type SubscriptionConsumptionClaimValue,
} from "@/config/versioned-provider-registry";
import {
  isResolverIssuedEvidenceForClaim,
  isResolverIssuedProviderEvidence,
} from "@/lib/offerings/evidence-resolver";
import { z } from "zod";
import type { CostScenario } from "@/types/domain";
import {
  SUBSCRIPTION_CONSUMPTION_BASES,
  SUBSCRIPTION_QUOTA_UNITS,
  type ConsumptionRule,
  type QuotaDemandInput,
  type QuotaDemandRange,
  type QuotaDemandResult,
  type QuotaDemandUnknownReasonCode,
  type SubscriptionConsumptionBasis,
  type SubscriptionQuota,
  type SubscriptionQuotaUnit,
} from "@/types/subscriptions";

const COST_SCENARIOS = ["low", "expected", "high"] as const satisfies readonly CostScenario[];
const MAX_ANALYSIS_ITERATIONS = 5;
const issuedDemandResults = new WeakSet<object>();
const demandMetadata = new WeakMap<
  object,
  {
    quota: unknown;
    analysisDemandKey: string;
    providerId: string | null;
    subjectId: string | null;
  }
>();

export interface CalculateQuotaDemandRangeInput {
  unit: SubscriptionQuotaUnit;
  basis: SubscriptionConsumptionBasis;
  perBasis: {
    low: number;
    expected: number;
    high: number;
  };
  expectedIterations: number;
}

export type QuotaDemandRangeCalculation =
  | { ok: true; demand: QuotaDemandRange }
  | {
      ok: false;
      reasonCode: Extract<
        QuotaDemandUnknownReasonCode,
        | "consumption-unit-mismatch"
        | "consumption-value-non-finite"
        | "consumption-range-invalid"
        | "analysis-iteration-count-invalid"
      >;
    };

function isQuotaUnit(value: unknown): value is SubscriptionQuotaUnit {
  return (
    typeof value === "string" &&
    (SUBSCRIPTION_QUOTA_UNITS as readonly string[]).includes(value)
  );
}

function isConsumptionBasis(value: unknown): value is SubscriptionConsumptionBasis {
  return (
    typeof value === "string" &&
    (SUBSCRIPTION_CONSUMPTION_BASES as readonly string[]).includes(value)
  );
}

function validExpectedIterations(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_ANALYSIS_ITERATIONS
  );
}

function allFinite(values: readonly number[]): boolean {
  return values.every(Number.isFinite);
}

export function calculateQuotaDemandRange(
  input: CalculateQuotaDemandRangeInput,
): QuotaDemandRangeCalculation {
  if (!isQuotaUnit(input.unit) || !isConsumptionBasis(input.basis)) {
    return { ok: false, reasonCode: "consumption-unit-mismatch" };
  }
  if (!validExpectedIterations(input.expectedIterations)) {
    return { ok: false, reasonCode: "analysis-iteration-count-invalid" };
  }

  const values = [input.perBasis.low, input.perBasis.expected, input.perBasis.high];
  if (!allFinite(values)) {
    return { ok: false, reasonCode: "consumption-value-non-finite" };
  }
  if (
    input.perBasis.low <= 0 ||
    input.perBasis.low > input.perBasis.expected ||
    input.perBasis.expected > input.perBasis.high
  ) {
    return { ok: false, reasonCode: "consumption-range-invalid" };
  }
  if (values.some((value) => toSourceSubscriptionMicrounits(value) === null)) {
    return { ok: false, reasonCode: "consumption-range-invalid" };
  }

  const multiplier = (scenario: CostScenario): number =>
    input.basis === "task"
      ? 1
      : iterationsForCostScenario(input.expectedIterations, scenario);
  const demand = {
    unit: input.unit,
    low: input.perBasis.low * multiplier("low"),
    expected: input.perBasis.expected * multiplier("expected"),
    high: input.perBasis.high * multiplier("high"),
  };
  if (!allFinite(COST_SCENARIOS.map((scenario) => demand[scenario]))) {
    return { ok: false, reasonCode: "consumption-value-non-finite" };
  }
  if (
    COST_SCENARIOS.some(
      (scenario) => toDerivedSubscriptionMicrounits(demand[scenario]) === null,
    )
  ) {
    return { ok: false, reasonCode: "consumption-range-invalid" };
  }
  return { ok: true, demand };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function issueDemandResult(
  result: QuotaDemandResult,
  input: QuotaDemandInput,
): QuotaDemandResult {
  const frozen = deepFreeze(result);
  issuedDemandResults.add(frozen);
  demandMetadata.set(frozen, {
    quota: input.quota,
    analysisDemandKey: `${input.analysis.taskId}\u0000${input.analysis.expectedIterations}`,
    providerId: input.evidenceSubject?.providerId ?? null,
    subjectId: input.evidenceSubject?.subjectId ?? null,
  });
  return frozen;
}

export function isIssuedQuotaDemandResultFor(
  value: unknown,
  quota: SubscriptionQuota,
  analysis: QuotaDemandInput["analysis"],
  evidenceSubject: QuotaDemandInput["evidenceSubject"],
): value is QuotaDemandResult {
  if (
    typeof value !== "object" ||
    value === null ||
    !issuedDemandResults.has(value)
  ) {
    return false;
  }
  const metadata = demandMetadata.get(value);
  return (
    metadata !== undefined &&
    metadata.quota === quota &&
    metadata.analysisDemandKey ===
      `${analysis.taskId}\u0000${analysis.expectedIterations}` &&
    metadata.providerId === evidenceSubject.providerId &&
    metadata.subjectId === evidenceSubject.subjectId
  );
}

function unknown(
  input: QuotaDemandInput,
  reasonCode: QuotaDemandUnknownReasonCode,
  unit: SubscriptionQuotaUnit | null,
): QuotaDemandResult {
  return issueDemandResult({ status: "unknown", reasonCode, unit }, input);
}

function numericValue(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function validateQuotaNumbers(
  quota: SubscriptionQuota,
): QuotaDemandUnknownReasonCode | null {
  if (quota.kind === "opaque") return null;
  if (quota.kind === "calibrated") {
    const remaining = numericValue(quota.remainingPercent?.value);
    if (remaining === null || !Number.isFinite(remaining)) {
      return "consumption-value-non-finite";
    }
    if (toSourceSubscriptionMicrounits(remaining) === null) {
      return "consumption-range-invalid";
    }
    return remaining < 0 || remaining > 100
      ? "consumption-range-invalid"
      : null;
  }

  const included = numericValue(quota.included?.value);
  const available =
    quota.kind === "metered"
      ? numericValue(quota.remaining?.value)
      : numericValue(quota.availableOnActivation?.value);
  if (
    included === null ||
    available === null ||
    !Number.isFinite(included) ||
    !Number.isFinite(available)
  ) {
    return "consumption-value-non-finite";
  }
  if (
    toSourceSubscriptionMicrounits(included) === null ||
    toSourceSubscriptionMicrounits(available) === null
  ) {
    return "consumption-range-invalid";
  }
  if (
    included <= 0 ||
    available < 0 ||
    available > included ||
    (quota.kind === "initial-capacity" && available === 0)
  ) {
    return "consumption-range-invalid";
  }
  return null;
}

function isUserObservedEvidence(
  value: unknown,
): value is Extract<
  QuotaDemandResult,
  { status: "known"; confidence: "user-observed" }
>["evidence"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.kind !== "user-observed" ||
    typeof candidate.observedAt !== "string" ||
    typeof candidate.note !== "string" ||
    candidate.note.trim().length === 0 ||
    candidate.note.length > 500
  ) {
    return false;
  }
  return z.iso.datetime().safeParse(candidate.observedAt).success;
}

export function estimateQuotaDemand(input: QuotaDemandInput): QuotaDemandResult {
  const quota = input.quota as SubscriptionQuota | undefined;
  if (typeof quota !== "object" || quota === null) {
    return unknown(input, "consumption-rule-missing", null);
  }
  if (quota.kind === "opaque") return unknown(input, "quota-opaque", null);
  if (!isQuotaUnit(quota.unit)) {
    return unknown(input, "consumption-unit-mismatch", null);
  }
  if (!validExpectedIterations(input.analysis?.expectedIterations)) {
    return unknown(input, "analysis-iteration-count-invalid", quota.unit);
  }

  const quotaNumberFailure = validateQuotaNumbers(quota);
  if (quotaNumberFailure !== null) {
    return unknown(input, quotaNumberFailure, quota.unit);
  }

  const rawRule = (quota as { consumptionRule?: unknown }).consumptionRule;
  if (typeof rawRule !== "object" || rawRule === null) {
    return unknown(input, "consumption-rule-missing", quota.unit);
  }
  const rule = rawRule as ConsumptionRule;
  if (!isQuotaUnit(rule.unit) || rule.unit !== quota.unit) {
    return unknown(input, "consumption-unit-mismatch", quota.unit);
  }
  if (!isConsumptionBasis(rule.basis)) {
    return unknown(input, "consumption-range-invalid", quota.unit);
  }

  const observed = rule.kind === "observed-range-per-basis";
  const perBasis = observed
    ? { low: rule.low, expected: rule.expected, high: rule.high }
    : rule.kind === "fixed-per-basis"
      ? { low: rule.units, expected: rule.units, high: rule.units }
      : null;
  if (perBasis === null) {
    return unknown(input, "consumption-rule-missing", quota.unit);
  }
  if (
    Object.values(perBasis).some(
      (value) => toSourceSubscriptionMicrounits(value) === null,
    )
  ) {
    return unknown(input, "consumption-range-invalid", quota.unit);
  }
  if (observed && (!Number.isInteger(rule.sampleSize) || rule.sampleSize <= 0)) {
    return unknown(input, "consumption-range-invalid", quota.unit);
  }

  const calculated = calculateQuotaDemandRange({
    unit: quota.unit,
    basis: rule.basis,
    perBasis,
    expectedIterations: input.analysis.expectedIterations,
  });
  if (!calculated.ok) return unknown(input, calculated.reasonCode, quota.unit);

  if (observed) {
    if (!isUserObservedEvidence(rule.evidence)) {
      return unknown(input, "consumption-evidence-unverified", quota.unit);
    }
    return issueDemandResult(
      {
        status: "known",
        confidence: "user-observed",
        basis: rule.basis,
        demand: calculated.demand,
        evidence: { ...rule.evidence },
      },
      input,
    );
  }

  const claimValue: SubscriptionConsumptionClaimValue =
    canonicalizeSubscriptionConsumptionClaimValue({
      kind: "fixed-per-basis",
      unit: rule.unit,
      basis: rule.basis,
      units: rule.units,
    });
  if (
    !isResolverIssuedProviderEvidence(rule.evidence) ||
    !isResolverIssuedEvidenceForClaim(
      rule.evidence,
      {
        catalogId: rule.evidence.registryId,
        catalogVersion: rule.evidence.registryVersion,
        entryId: rule.evidence.entryId,
        claimId: "subscription-consumption",
        providerId: input.evidenceSubject.providerId,
        subjectId: input.evidenceSubject.subjectId,
        fieldPath: "subscription.quota.consumption",
      },
      claimValue,
    )
  ) {
    return unknown(input, "consumption-evidence-unverified", quota.unit);
  }
  return issueDemandResult(
    {
      status: "known",
      confidence: "provider-published",
      basis: rule.basis,
      demand: calculated.demand,
      evidence: rule.evidence,
    },
    input,
  );
}

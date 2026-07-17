import { z } from "zod";

import { storedEvidenceInputSchema } from "@/lib/offerings/evidence-resolver";
import { parseAccessProviderId } from "@/lib/offerings/route-identity";
import {
  SUBSCRIPTION_RESOURCE_CONTRACT_VERSION,
  type StoredSubscriptionResourceInput,
} from "@/types/subscriptions";

import {
  MAX_SUBSCRIPTION_QUOTA_UNITS,
  toSourceSubscriptionMicrounits,
} from "./fixed-decimal";

const MAX_SAFE_NUMBER = Number.MAX_SAFE_INTEGER;
const MAX_SAFE_USD_FOR_MICRO_USD = Number.MAX_SAFE_INTEGER / 1_000_000;
const STABLE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

const stableIdSchema = z.string().min(1).max(200).regex(STABLE_ID_PATTERN);
const accessProviderIdSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => {
    try {
      parseAccessProviderId(value);
      return true;
    } catch {
      return false;
    }
  });
const safeNonNegativeNumber = z.number().finite().min(0).max(MAX_SAFE_NUMBER);
const safePositiveNumber = z.number().finite().gt(0).max(MAX_SAFE_NUMBER);
const safePositiveInteger = z.number().int().positive().max(MAX_SAFE_NUMBER);
const quotaNonNegativeNumber = z
  .number()
  .finite()
  .min(0)
  .max(MAX_SUBSCRIPTION_QUOTA_UNITS)
  .refine((value) => toSourceSubscriptionMicrounits(value) !== null);
const quotaPositiveNumber = quotaNonNegativeNumber.refine((value) => value > 0);
const safeMicroUsdFee = z
  .number()
  .finite()
  .min(0)
  .max(MAX_SAFE_USD_FOR_MICRO_USD)
  .refine((value) => toSourceSubscriptionMicrounits(value) !== null);
const utcDateTimeSchema = z.iso.datetime();
const isoDateSchema = z.iso.date();

const registryEvidenceInputSchema = storedEvidenceInputSchema.refine(
  (value) => value.kind === "catalog-ref" || value.kind === "preset-ref",
);
const capacitySnapshotEvidenceInputSchema = storedEvidenceInputSchema.refine(
  (value) => value.kind === "connector-ref" || value.kind === "user-observed",
);
const userObservedEvidenceInputSchema = storedEvidenceInputSchema.refine(
  (value) => value.kind === "user-observed",
);

const offeringReferenceSchema = z.strictObject({
  providerId: accessProviderIdSchema,
  offeringId: stableIdSchema,
});

const sourcedNumberSchema = (valueSchema: z.ZodNumber, evidenceSchema = storedEvidenceInputSchema) =>
  z.strictObject({
    value: valueSchema,
    evidence: evidenceSchema,
  });

const fixedConsumptionRuleSchema = z.strictObject({
  kind: z.literal("fixed-per-basis"),
  unit: z.enum(["request", "credit"]),
  basis: z.enum(["task", "analysis-iteration"]),
  units: quotaPositiveNumber,
  evidence: registryEvidenceInputSchema,
});

const observedRangeConsumptionRuleSchema = z
  .strictObject({
    kind: z.literal("observed-range-per-basis"),
    unit: z.enum(["request", "credit", "percent-point"]),
    basis: z.enum(["task", "analysis-iteration"]),
    low: quotaPositiveNumber,
    expected: quotaPositiveNumber,
    high: quotaPositiveNumber,
    sampleSize: safePositiveInteger,
    evidence: userObservedEvidenceInputSchema,
  })
  .refine((value) => value.low <= value.expected && value.expected <= value.high);

const meteredQuotaSchema = z
  .strictObject({
    kind: z.literal("metered"),
    unit: z.enum(["request", "credit"]),
    included: sourcedNumberSchema(quotaPositiveNumber),
    remaining: sourcedNumberSchema(
      quotaNonNegativeNumber,
      capacitySnapshotEvidenceInputSchema,
    ),
    consumptionRule: z.union([
      fixedConsumptionRuleSchema,
      observedRangeConsumptionRuleSchema,
    ]),
  })
  .refine((value) => value.remaining.value <= value.included.value)
  .refine((value) => value.consumptionRule.unit === value.unit);

const calibratedQuotaSchema = z.strictObject({
  kind: z.literal("calibrated"),
  unit: z.literal("percent-point"),
  remainingPercent: sourcedNumberSchema(
    quotaNonNegativeNumber.max(100),
    capacitySnapshotEvidenceInputSchema,
  ),
  consumptionRule: observedRangeConsumptionRuleSchema.refine(
    (value) => value.unit === "percent-point",
  ),
});

const initialCapacityQuotaSchema = z
  .strictObject({
    kind: z.literal("initial-capacity"),
    unit: z.enum(["request", "credit"]),
    included: sourcedNumberSchema(quotaPositiveNumber, registryEvidenceInputSchema),
    availableOnActivation: sourcedNumberSchema(
      quotaPositiveNumber,
      registryEvidenceInputSchema,
    ),
    appliesFor: z.literal("one-plan-period"),
    consumptionRule: fixedConsumptionRuleSchema,
  })
  .refine((value) => value.availableOnActivation.value <= value.included.value)
  .refine((value) => value.consumptionRule.unit === value.unit);

const opaqueQuotaSchema = z.strictObject({
  kind: z.literal("opaque"),
  description: z
    .string()
    .min(1)
    .max(500)
    .refine((value) => value.trim().length > 0),
});

const existingCommitmentSchema = z.strictObject({
  kind: z.literal("existing"),
  currentFeeUsd: safeNonNegativeNumber,
  currency: z.literal("USD"),
  billingBasis: z.literal("current-plan-period"),
  evidence: storedEvidenceInputSchema,
});

const newCommitmentSchema = z.strictObject({
  kind: z.literal("new"),
  feeUsd: safeMicroUsdFee,
  currency: z.literal("USD"),
  billingBasis: z.literal("one-plan-period"),
  evidence: storedEvidenceInputSchema,
});

const resetPolicySchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none") }),
  z.strictObject({
    kind: z.literal("fixed"),
    cadenceDays: safePositiveInteger,
    nextResetAt: utcDateTimeSchema,
    evidence: storedEvidenceInputSchema,
  }),
  z.strictObject({
    kind: z.literal("rolling"),
    windowHours: safePositiveNumber,
    evidence: storedEvidenceInputSchema,
  }),
  z.strictObject({ kind: z.literal("unknown") }),
]);

const overageApplicabilitySchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("whole-resource") }),
  z
    .strictObject({
      kind: z.literal("offering-list"),
      offeringRefs: z.array(offeringReferenceSchema).min(1).max(100).readonly(),
    })
    .refine((value) => {
      const keys = value.offeringRefs.map(({ providerId, offeringId }) =>
        JSON.stringify([providerId, offeringId]),
      );
      return new Set(keys).size === keys.length;
    }),
]);

const paidOveragePolicySchema = z
  .strictObject({
    kind: z.literal("paid"),
    unit: z.enum(["request", "credit", "percent-point"]),
    usdPerUnit: safePositiveNumber,
    appliesTo: overageApplicabilitySchema,
    effectiveFrom: isoDateSchema,
    effectiveThrough: isoDateSchema.optional(),
    maxOverageUnits: quotaNonNegativeNumber.optional(),
    evidence: registryEvidenceInputSchema,
  })
  .refine(
    (value) =>
      value.effectiveThrough === undefined ||
      value.effectiveFrom <= value.effectiveThrough,
  );

const overagePolicySchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none") }),
  paidOveragePolicySchema,
  z.strictObject({ kind: z.literal("unknown") }),
]);

const resourceBase = {
  contractVersion: z.literal(SUBSCRIPTION_RESOURCE_CONTRACT_VERSION),
  id: stableIdSchema,
  offeringRef: offeringReferenceSchema,
  availability: z.strictObject({
    status: z.enum(["available", "unavailable", "uncertain"]),
    evidence: storedEvidenceInputSchema,
  }),
  reset: resetPolicySchema,
  overage: overagePolicySchema,
};

const ownedResourceSchema = z
  .strictObject({
    ...resourceBase,
    ownership: z.literal("owned"),
    commitment: existingCommitmentSchema,
    quota: z.union([meteredQuotaSchema, calibratedQuotaSchema, opaqueQuotaSchema]),
  })
  .refine((value) => value.quota.kind !== "opaque" || value.overage.kind !== "paid")
  .refine(
    (value) =>
      value.overage.kind !== "paid" ||
      (value.quota.kind !== "opaque" && value.overage.unit === value.quota.unit),
  );

const candidateResourceSchema = z
  .strictObject({
    ...resourceBase,
    ownership: z.literal("candidate-new"),
    commitment: newCommitmentSchema,
    quota: z.union([initialCapacityQuotaSchema, opaqueQuotaSchema]),
  })
  .refine((value) => value.quota.kind !== "opaque" || value.overage.kind !== "paid")
  .refine(
    (value) =>
      value.overage.kind !== "paid" ||
      (value.quota.kind !== "opaque" && value.overage.unit === value.quota.unit),
  );

export const storedSubscriptionResourceInputSchema = z.union([
  ownedResourceSchema,
  candidateResourceSchema,
]);

export type StoredSubscriptionResourceInputParseResult =
  | { success: true; data: StoredSubscriptionResourceInput }
  | { success: false; reason: "invalid-subscription-resource-input" };

export function parseStoredSubscriptionResourceInput(
  value: unknown,
): StoredSubscriptionResourceInputParseResult {
  const parsed = storedSubscriptionResourceInputSchema.safeParse(value);
  return parsed.success
    ? { success: true, data: parsed.data as StoredSubscriptionResourceInput }
    : { success: false, reason: "invalid-subscription-resource-input" };
}

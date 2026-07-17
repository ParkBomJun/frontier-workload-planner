import {
  PROVIDER_PRICING_BASIS,
  PROVIDER_PRICING_EXCLUSIONS,
} from "@/config/provider-catalog";
import { PLANNER_TIER_ADAPTER_VERSION } from "@/config/versioned-provider-registry";
import { normalizeStandardTextRate } from "@/lib/calculation/micro-usd";
import {
  COST_SCENARIOS,
  invocationTokensForScenario,
} from "@/lib/calculation/invocation-feasibility";
import { MODEL_TIERS, PROVIDER_IDS, type CostScenario, type ModelTier, type PlannerTaskAnalysis, type ProviderId } from "@/types/domain";
import type {
  ApiCatalogOverride,
  ApiStandardTextPriceResolution,
  NormalizedStandardTextRate,
  OfficialApiPricingDefault,
  PriceConditionFailure,
  StandardTextRate,
} from "@/types/pricing";

import { isIsoDate, validateApiCatalogOverride } from "./catalog-overrides";
import { resolveApiCatalogEntry } from "./provider-catalog-adapter";

export interface StandardTextPriceSchedule {
  verifiedAt: string;
  basePrice: StandardTextRate;
  effectiveThrough?: string;
  priceAfterEffectiveThrough?: StandardTextRate & { effectiveFrom: string };
}

export type StandardTextPriceScheduleResolution =
  | {
      status: "resolved";
      rate: NormalizedStandardTextRate;
      effectiveFrom: string;
      effectiveThrough: string | null;
    }
  | { status: "conditional"; reasonCode: "price-schedule-not-applicable" }
  | { status: "invalid"; reasonCode: "catalog-price-schedule-invalid" };

export interface ResolveApiStandardTextPriceInput {
  providerId: ProviderId;
  tier: ModelTier;
  pricingAsOf: string;
  perInvocationInputTokens: Record<CostScenario, number>;
  override?: ApiCatalogOverride;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function shiftIsoDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function resolveStandardTextPriceSchedule(
  schedule: StandardTextPriceSchedule,
  pricingAsOf: string,
): StandardTextPriceScheduleResolution {
  const basePrice = normalizeStandardTextRate(schedule.basePrice);
  const nextPrice = schedule.priceAfterEffectiveThrough
    ? normalizeStandardTextRate(schedule.priceAfterEffectiveThrough)
    : null;
  const effectiveThrough = schedule.effectiveThrough;
  const nextEffectiveFrom = schedule.priceAfterEffectiveThrough?.effectiveFrom;

  if (
    !isIsoDate(schedule.verifiedAt) ||
    !isIsoDate(pricingAsOf) ||
    !basePrice ||
    (effectiveThrough !== undefined && !isIsoDate(effectiveThrough)) ||
    (nextEffectiveFrom !== undefined && !isIsoDate(nextEffectiveFrom)) ||
    (schedule.priceAfterEffectiveThrough !== undefined && !nextPrice) ||
    (effectiveThrough !== undefined && effectiveThrough < schedule.verifiedAt) ||
    (nextEffectiveFrom !== undefined && nextEffectiveFrom < schedule.verifiedAt) ||
    (effectiveThrough !== undefined &&
      nextEffectiveFrom !== undefined &&
      nextEffectiveFrom <= effectiveThrough)
  ) {
    return { status: "invalid", reasonCode: "catalog-price-schedule-invalid" };
  }

  if (pricingAsOf < schedule.verifiedAt) {
    return { status: "conditional", reasonCode: "price-schedule-not-applicable" };
  }

  if (effectiveThrough === undefined && nextEffectiveFrom === undefined) {
    return {
      status: "resolved",
      rate: basePrice,
      effectiveFrom: schedule.verifiedAt,
      effectiveThrough: null,
    };
  }

  const baseEffectiveThrough =
    effectiveThrough ??
    (nextEffectiveFrom === undefined ? null : shiftIsoDate(nextEffectiveFrom, -1));
  if (baseEffectiveThrough !== null && pricingAsOf <= baseEffectiveThrough) {
    return {
      status: "resolved",
      rate: basePrice,
      effectiveFrom: schedule.verifiedAt,
      effectiveThrough: baseEffectiveThrough,
    };
  }

  if (
    nextEffectiveFrom !== undefined &&
    nextPrice !== null &&
    pricingAsOf >= nextEffectiveFrom
  ) {
    return {
      status: "resolved",
      rate: nextPrice,
      effectiveFrom: nextEffectiveFrom,
      effectiveThrough: null,
    };
  }

  return { status: "conditional", reasonCode: "price-schedule-not-applicable" };
}

function validTokenScenarios(value: Record<CostScenario, number>): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    COST_SCENARIOS.every(
      (scenario) =>
        Number.isSafeInteger(value[scenario]) && value[scenario] >= 0,
    )
  );
}

function invalidResult(
  input: ResolveApiStandardTextPriceInput,
  reasonCode: Extract<ApiStandardTextPriceResolution, { status: "invalid" }>["reasonCode"],
  identity: {
    modelId?: string;
    catalogReference?: Extract<
      ApiStandardTextPriceResolution,
      { status: "resolved" }
    >["catalogReference"];
    routeIdentity?: Extract<
      ApiStandardTextPriceResolution,
      { status: "resolved" }
    >["routeIdentity"];
  } = {},
): ApiStandardTextPriceResolution {
  return {
    status: "invalid",
    providerId: input.providerId,
    tier: input.tier,
    modelId: identity.modelId ?? null,
    pricingAsOf: input.pricingAsOf,
    catalogReference: identity.catalogReference ?? null,
    routeIdentity: identity.routeIdentity ?? null,
    reasonCode,
  };
}

export function inputTokensByScenario(
  analysis: PlannerTaskAnalysis,
): Record<CostScenario, number> {
  return Object.fromEntries(
    COST_SCENARIOS.map((scenario) => [
      scenario,
      invocationTokensForScenario(analysis, scenario).inputTokens,
    ]),
  ) as Record<CostScenario, number>;
}

export function resolveApiStandardTextPrice(
  input: ResolveApiStandardTextPriceInput,
): ApiStandardTextPriceResolution {
  if (
    !PROVIDER_IDS.includes(input.providerId) ||
    !MODEL_TIERS.includes(input.tier)
  ) {
    return invalidResult(input, "catalog-entry-not-found");
  }
  if (!isIsoDate(input.pricingAsOf)) {
    return invalidResult(input, "invalid-pricing-as-of");
  }
  if (!validTokenScenarios(input.perInvocationInputTokens)) {
    return invalidResult(input, "invalid-token-scenarios");
  }

  const entry = resolveApiCatalogEntry(input.providerId, input.tier);
  const identity = {
    modelId: entry.model.id,
    catalogReference: entry.model.registryReference,
    routeIdentity: entry.routeIdentity,
  };
  let normalizedOverride: ApiCatalogOverride | null = null;
  if (input.override !== undefined) {
    const validated = validateApiCatalogOverride(input.override);
    if (!validated.ok) {
      return invalidResult(input, validated.reasonCode, identity);
    }
    normalizedOverride = validated.override;
    const target = normalizedOverride.target;
    const expected = entry.model.registryReference;
    if (
      target.registryId !== expected.registryId ||
      target.registryVersion !== expected.registryVersion ||
      target.entryId !== expected.entryId
    ) {
      return invalidResult(input, "override-target-mismatch", identity);
    }
  }

  const schedule = resolveStandardTextPriceSchedule(
    {
      verifiedAt: entry.standardTextPrice.evidence.verifiedAt,
      basePrice: {
        inputUsdPerMillion: entry.standardTextPrice.inputUsdPerMillion,
        outputUsdPerMillion: entry.standardTextPrice.outputUsdPerMillion,
      },
      ...(entry.standardTextPrice.effectiveThrough === undefined
        ? {}
        : { effectiveThrough: entry.standardTextPrice.effectiveThrough }),
      ...(entry.standardTextPrice.priceAfterEffectiveThrough === undefined
        ? {}
        : {
            priceAfterEffectiveThrough: {
              ...entry.standardTextPrice.priceAfterEffectiveThrough,
            },
          }),
    },
    input.pricingAsOf,
  );
  if (schedule.status === "invalid") {
    return invalidResult(input, schedule.reasonCode, identity);
  }
  if (schedule.status === "conditional") {
    return deepFreeze({
      status: "conditional",
      providerId: input.providerId,
      tier: input.tier,
      ...identity,
      pricingAsOf: input.pricingAsOf,
      reasonCode: schedule.reasonCode,
      conditionFailures: [],
      officialDefault: null,
      override: normalizedOverride,
      basis: PROVIDER_PRICING_BASIS,
    });
  }

  const excludedLongContextPrice = entry.standardTextPrice.excludedLongContextPrice;
  if (
    excludedLongContextPrice !== undefined &&
    !normalizeStandardTextRate(excludedLongContextPrice)
  ) {
    return invalidResult(input, "catalog-price-schedule-invalid", identity);
  }
  const officialDefault: OfficialApiPricingDefault = {
    planningTier: entry.planningTier,
    plannerTierAdapterVersion: PLANNER_TIER_ADAPTER_VERSION,
    standardTextPrice: schedule.rate,
    effectiveFrom: schedule.effectiveFrom,
    effectiveThrough: schedule.effectiveThrough,
    standardPriceInputLimitTokens:
      entry.standardTextPrice.standardPriceInputLimitTokens ?? null,
    excludedLongContextPrice: excludedLongContextPrice
      ? { ...excludedLongContextPrice }
      : null,
    sourceUrl: entry.standardTextPrice.evidence.sourceUrl,
    verifiedAt: entry.standardTextPrice.evidence.verifiedAt,
    evidence: entry.standardTextPrice.evidence,
  };
  const conditionFailures: PriceConditionFailure[] = [];
  const inputLimit = officialDefault.standardPriceInputLimitTokens;
  if (inputLimit !== null) {
    COST_SCENARIOS.forEach((scenario) => {
      const actualInputTokens = input.perInvocationInputTokens[scenario];
      if (actualInputTokens > inputLimit) {
        conditionFailures.push({
          code: "standard-price-input-limit-exceeded",
          scenario,
          actualInputTokens,
          limitInputTokens: inputLimit,
        });
      }
    });
  }
  if (conditionFailures.length > 0) {
    return deepFreeze({
      status: "conditional",
      providerId: input.providerId,
      tier: input.tier,
      ...identity,
      pricingAsOf: input.pricingAsOf,
      reasonCode: "standard-price-input-limit-exceeded",
      conditionFailures,
      officialDefault,
      override: normalizedOverride,
      basis: PROVIDER_PRICING_BASIS,
    });
  }

  const appliedOverride =
    normalizedOverride !== null && input.pricingAsOf >= normalizedOverride.effectiveFrom
      ? normalizedOverride
      : null;
  const overrideApplied = appliedOverride !== null;
  const overrideRate =
    appliedOverride?.standardTextPrice
      ? normalizeStandardTextRate(appliedOverride.standardTextPrice)
      : null;
  if (
    appliedOverride?.standardTextPrice !== undefined &&
    overrideRate === null
  ) {
    return invalidResult(input, "invalid-user-override", identity);
  }

  return deepFreeze({
    status: "resolved",
    providerId: input.providerId,
    tier: input.tier,
    ...identity,
    pricingAsOf: input.pricingAsOf,
    officialDefault,
    effectiveValue: {
      planningTier:
        appliedOverride?.planningTier
          ? appliedOverride.planningTier
          : officialDefault.planningTier,
      standardTextPrice: overrideRate ?? officialDefault.standardTextPrice,
      planningTierSource:
        appliedOverride?.planningTier
          ? "user-override"
          : "verified-default",
      standardTextPriceSource:
        overrideRate === null ? "verified-default" : "user-override",
    },
    override: normalizedOverride,
    overrideApplied,
    basis: PROVIDER_PRICING_BASIS,
    exclusions: PROVIDER_PRICING_EXCLUSIONS,
  });
}

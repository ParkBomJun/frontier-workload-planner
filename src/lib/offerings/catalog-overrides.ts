import { z } from "zod";

import {
  API_CATALOG_REGISTRY_ID,
  API_CATALOG_REGISTRY_VERSION,
  getProviderRegistryEntry,
  getProviderRegistryEntryById,
} from "@/config/versioned-provider-registry";
import { normalizeStandardTextRate } from "@/lib/calculation/micro-usd";
import {
  API_CATALOG_OVERRIDE_SOURCE_VERSION,
  apiCatalogOverrideSourceSchema,
  apiCatalogOverrideSourcesSchema,
} from "@/lib/storage/best-fit-sources";
import { MODEL_TIERS, PROVIDER_IDS, type ModelTier, type ProviderId } from "@/types/domain";
import { PLANNING_QUALITY_TIERS } from "@/types/offerings";
import type {
  ApiCatalogOverride,
  ApiOverrideValidationFailureCode,
} from "@/types/pricing";

const OVERRIDE_KEYS = [
  "kind",
  "provenance",
  "target",
  "effectiveFrom",
  "recordedAt",
  "planningTier",
  "standardTextPrice",
] as const;
const TARGET_KEYS = ["registryId", "registryVersion", "entryId"] as const;
const RATE_KEYS = ["inputUsdPerMillion", "outputUsdPerMillion"] as const;
const UTC_ISO_DATE_TIME_SCHEMA = z.iso.datetime();

type OverrideValidationResult =
  | { ok: true; override: ApiCatalogOverride }
  | { ok: false; reasonCode: ApiOverrideValidationFailureCode };

export type OverrideMutationResult =
  | { ok: true; overrides: readonly ApiCatalogOverride[] }
  | { ok: false; reasonCode: ApiOverrideValidationFailureCode };

export type OverrideSourceRemovalResult = OverrideMutationResult;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function hasOnlyKeys(value: object, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isIsoDateTime(value: unknown): value is string {
  return UTC_ISO_DATE_TIME_SCHEMA.safeParse(value).success;
}

function sameTarget(
  left: ApiCatalogOverride["target"],
  right: ApiCatalogOverride["target"],
): boolean {
  return (
    left.registryId === right.registryId &&
    left.registryVersion === right.registryVersion &&
    left.entryId === right.entryId
  );
}

function compareTargets(
  left: ApiCatalogOverride["target"],
  right: ApiCatalogOverride["target"],
): number {
  for (const key of TARGET_KEYS) {
    if (left[key] < right[key]) return -1;
    if (left[key] > right[key]) return 1;
  }
  return 0;
}

function normalizeExistingOverrideSources(
  current: readonly ApiCatalogOverride[],
): OverrideMutationResult {
  const normalized: ApiCatalogOverride[] = [];
  for (const existing of current) {
    const resolved = validateApiCatalogOverride(existing);
    if (resolved.ok) {
      normalized.push(resolved.override);
      continue;
    }
    if (resolved.reasonCode !== "override-target-unresolved") return resolved;

    const source = apiCatalogOverrideSourceSchema.safeParse(existing);
    if (!source.success) {
      return { ok: false, reasonCode: "invalid-user-override" };
    }
    normalized.push(deepFreeze(source.data));
  }
  return finalizeOverrideSources(normalized);
}

function finalizeOverrideSources(
  overrides: readonly ApiCatalogOverride[],
): OverrideMutationResult {
  const parsed = apiCatalogOverrideSourcesSchema.safeParse({
    contractVersion: API_CATALOG_OVERRIDE_SOURCE_VERSION,
    overrides,
  });
  return parsed.success
    ? { ok: true, overrides: deepFreeze(parsed.data.overrides) }
    : { ok: false, reasonCode: "invalid-user-override" };
}

export function validateApiCatalogOverride(value: unknown): OverrideValidationResult {
  if (
    typeof value !== "object" ||
    value === null ||
    !hasOnlyKeys(value, OVERRIDE_KEYS)
  ) {
    return { ok: false, reasonCode: "invalid-user-override" };
  }
  const candidate = value as Partial<ApiCatalogOverride>;
  if (
    candidate.kind !== "api-catalog-override" ||
    candidate.provenance !== "user-supplied" ||
    !isIsoDate(candidate.effectiveFrom) ||
    !isIsoDateTime(candidate.recordedAt) ||
    typeof candidate.target !== "object" ||
    candidate.target === null ||
    !hasOnlyKeys(candidate.target, TARGET_KEYS) ||
    typeof candidate.target.registryId !== "string" ||
    typeof candidate.target.registryVersion !== "string" ||
    typeof candidate.target.entryId !== "string"
  ) {
    return { ok: false, reasonCode: "invalid-user-override" };
  }

  const registryEntry = getProviderRegistryEntryById(
    candidate.target.registryId,
    candidate.target.registryVersion,
    candidate.target.entryId,
  );
  if (!registryEntry) {
    return { ok: false, reasonCode: "override-target-unresolved" };
  }

  const planningTier = candidate.planningTier;
  if (
    planningTier !== undefined &&
    !PLANNING_QUALITY_TIERS.includes(planningTier)
  ) {
    return { ok: false, reasonCode: "invalid-user-override" };
  }

  let standardTextPrice: ApiCatalogOverride["standardTextPrice"];
  if (candidate.standardTextPrice !== undefined) {
    if (
      typeof candidate.standardTextPrice !== "object" ||
      candidate.standardTextPrice === null ||
      !hasOnlyKeys(candidate.standardTextPrice, RATE_KEYS)
    ) {
      return { ok: false, reasonCode: "invalid-user-override" };
    }
    const normalized = normalizeStandardTextRate(candidate.standardTextPrice);
    if (!normalized) return { ok: false, reasonCode: "invalid-user-override" };
    standardTextPrice = {
      inputUsdPerMillion: normalized.inputUsdPerMillion,
      outputUsdPerMillion: normalized.outputUsdPerMillion,
    };
  }

  if (planningTier === undefined && standardTextPrice === undefined) {
    return { ok: false, reasonCode: "invalid-user-override" };
  }

  return {
    ok: true,
    override: deepFreeze({
      kind: "api-catalog-override",
      provenance: "user-supplied",
      target: {
        registryId: candidate.target.registryId,
        registryVersion: candidate.target.registryVersion,
        entryId: candidate.target.entryId,
      },
      effectiveFrom: candidate.effectiveFrom,
      recordedAt: candidate.recordedAt,
      ...(planningTier === undefined ? {} : { planningTier }),
      ...(standardTextPrice === undefined ? {} : { standardTextPrice }),
    }),
  };
}

export function catalogOverrideTargetFor(
  providerId: ProviderId,
  tier: ModelTier,
): ApiCatalogOverride["target"] {
  if (!PROVIDER_IDS.includes(providerId) || !MODEL_TIERS.includes(tier)) {
    throw new Error("Override targets must reference a supported provider catalog entry.");
  }
  const entry = getProviderRegistryEntry(
    providerId,
    tier,
    API_CATALOG_REGISTRY_VERSION,
  );
  return deepFreeze({
    registryId: API_CATALOG_REGISTRY_ID,
    registryVersion: API_CATALOG_REGISTRY_VERSION,
    entryId: entry.legacyModel.catalogId,
  });
}

export function upsertApiCatalogOverride(
  current: readonly ApiCatalogOverride[],
  value: unknown,
): OverrideMutationResult {
  const validated = validateApiCatalogOverride(value);
  if (!validated.ok) return validated;
  const normalizedCurrent = normalizeExistingOverrideSources(current);
  if (!normalizedCurrent.ok) return normalizedCurrent;
  const overrides = normalizedCurrent.overrides
    .filter((override) => !sameTarget(override.target, validated.override.target))
    .concat(validated.override)
    .sort((left, right) => compareTargets(left.target, right.target));
  return finalizeOverrideSources(overrides);
}

export function restoreApiCatalogDefaults(
  current: readonly ApiCatalogOverride[],
  target: ApiCatalogOverride["target"],
): OverrideMutationResult {
  if (
    !getProviderRegistryEntryById(
      target.registryId,
      target.registryVersion,
      target.entryId,
    )
  ) {
    return { ok: false, reasonCode: "override-target-unresolved" };
  }
  const normalizedCurrent = normalizeExistingOverrideSources(current);
  if (!normalizedCurrent.ok) return normalizedCurrent;
  return finalizeOverrideSources(
    normalizedCurrent.overrides.filter(
      (override) => !sameTarget(override.target, target),
    ),
  );
}

export function removeApiCatalogOverrideSource(
  current: readonly ApiCatalogOverride[],
  target: ApiCatalogOverride["target"],
): OverrideSourceRemovalResult {
  const normalizedCurrent = normalizeExistingOverrideSources(current);
  if (!normalizedCurrent.ok) return normalizedCurrent;
  const targetKeys = Object.keys(target);
  if (
    targetKeys.length !== TARGET_KEYS.length ||
    targetKeys.some(
      (key) =>
        key !== "registryId" &&
        key !== "registryVersion" &&
        key !== "entryId",
    ) ||
    TARGET_KEYS.some(
      (key) =>
        typeof target[key] !== "string" ||
        target[key].length < 1 ||
        target[key].length > 200,
    )
  ) {
    return { ok: false, reasonCode: "invalid-user-override" };
  }
  return finalizeOverrideSources(
    normalizedCurrent.overrides.filter(
      (override) => !sameTarget(override.target, target),
    ),
  );
}

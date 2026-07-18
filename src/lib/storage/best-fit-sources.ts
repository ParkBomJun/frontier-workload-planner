import { z } from "zod";

import { MAX_STANDARD_TEXT_RATE_USD_PER_MILLION } from "@/lib/calculation/micro-usd";
import { PLANNING_QUALITY_TIERS, WORK_SURFACES } from "@/types/offerings";
import type { ApiCatalogOverride } from "@/types/pricing";
import type {
  AvailableAiResourceDraft,
  AvailableAiResourceEvidenceObservedAt,
} from "@/types/resource-drafts";
import {
  SUBSCRIPTION_AVAILABILITY_STATUSES,
  SUBSCRIPTION_CONSUMPTION_BASES,
  SUBSCRIPTION_OWNERSHIPS,
} from "@/types/subscriptions";

export const BEST_FIT_SOURCE_STATE_VERSION = "best-fit-source-state-v1" as const;
export const AVAILABLE_AI_RESOURCE_SOURCE_VERSION =
  "available-ai-resource-sources-v1" as const;
export const API_CATALOG_OVERRIDE_SOURCE_VERSION =
  "api-catalog-override-sources-v1" as const;

const MAX_RESOURCE_DRAFTS = 4;
const MAX_API_OVERRIDES = 9;
const MAX_SOURCE_STRING_LENGTH = 2_000;
const UI_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,63}$/;
const boundedSourceString = z.string().max(MAX_SOURCE_STRING_LENGTH);
const observedAtSchema = z.iso.datetime();

const observedConsumptionDraftSchema = z.strictObject({
  basis: z.enum(SUBSCRIPTION_CONSUMPTION_BASES),
  low: boundedSourceString,
  expected: boundedSourceString,
  high: boundedSourceString,
  sampleSize: boundedSourceString,
});

const quotaDraftSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("opaque"),
    description: boundedSourceString,
  }),
  z.strictObject({
    kind: z.literal("metered"),
    unit: z.enum(["request", "credit"]),
    included: boundedSourceString,
    remaining: boundedSourceString,
    consumption: observedConsumptionDraftSchema,
  }),
  z.strictObject({
    kind: z.literal("calibrated"),
    remainingPercent: boundedSourceString,
    consumption: observedConsumptionDraftSchema,
  }),
]);

const resetDraftSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none") }),
  z.strictObject({ kind: z.literal("unknown") }),
  z.strictObject({
    kind: z.literal("fixed"),
    cadenceDays: boundedSourceString,
    nextResetAt: boundedSourceString,
  }),
  z.strictObject({
    kind: z.literal("rolling"),
    windowHours: boundedSourceString,
  }),
]);

export const availableAiResourceDraftSourceSchema = z.strictObject({
  uiId: z.string().regex(UI_ID_PATTERN),
  preset: z.strictObject({
    id: z.string().min(1).max(200),
    version: z.string().min(1).max(200),
  }),
  displayName: z.string().max(200),
  ownership: z.enum(SUBSCRIPTION_OWNERSHIPS),
  availability: z.enum(SUBSCRIPTION_AVAILABILITY_STATUSES),
  surface: z.union([z.enum(WORK_SURFACES), z.literal("")]),
  feeUsd: boundedSourceString,
  quota: quotaDraftSchema,
  reset: resetDraftSchema,
});

export const availableAiResourceEvidenceObservedAtSchema = z.strictObject({
  availability: observedAtSchema,
  commitment: observedAtSchema,
  quota: observedAtSchema,
  reset: observedAtSchema,
  offering: observedAtSchema,
});

const resourceEvidenceByIdSchema = z.record(
  z.string().regex(UI_ID_PATTERN),
  availableAiResourceEvidenceObservedAtSchema,
);

export const availableAiResourceSourcesSchema = z
  .strictObject({
    contractVersion: z.literal(AVAILABLE_AI_RESOURCE_SOURCE_VERSION),
    drafts: z.array(availableAiResourceDraftSourceSchema).max(MAX_RESOURCE_DRAFTS),
    evidenceObservedAtById: resourceEvidenceByIdSchema,
  })
  .superRefine(({ drafts, evidenceObservedAtById }, context) => {
    const uiIds = drafts.map(({ uiId }) => uiId);
    if (new Set(uiIds).size !== uiIds.length) {
      context.addIssue({
        code: "custom",
        path: ["drafts"],
        message: "Available AI resource source IDs must be unique.",
      });
    }

    const presetIds = drafts.map(({ preset }) => preset.id);
    if (new Set(presetIds).size !== presetIds.length) {
      context.addIssue({
        code: "custom",
        path: ["drafts"],
        message: "Available AI resource presets must be unique.",
      });
    }

    const evidenceIds = Object.keys(evidenceObservedAtById).sort();
    const sortedUiIds = [...uiIds].sort();
    if (
      evidenceIds.length !== sortedUiIds.length ||
      evidenceIds.some((uiId, index) => uiId !== sortedUiIds[index])
    ) {
      context.addIssue({
        code: "custom",
        path: ["evidenceObservedAtById"],
        message: "Every resource draft must have exactly one evidence timestamp group.",
      });
    }
  });

const exactMicroUsdRateSchema = z
  .number()
  .finite()
  .min(0)
  .max(MAX_STANDARD_TEXT_RATE_USD_PER_MILLION)
  .refine((value) => {
    const scaled = Math.round(value * 1_000_000);
    return (
      Number.isSafeInteger(scaled) &&
      Math.abs(value - scaled / 1_000_000) <= 1e-12
    );
  });

export const apiCatalogOverrideSourceSchema = z
  .strictObject({
    kind: z.literal("api-catalog-override"),
    provenance: z.literal("user-supplied"),
    target: z.strictObject({
      registryId: z.string().min(1).max(200),
      registryVersion: z.string().min(1).max(200),
      entryId: z.string().min(1).max(200),
    }),
    effectiveFrom: z.iso.date(),
    recordedAt: z.iso.datetime(),
    planningTier: z.enum(PLANNING_QUALITY_TIERS).optional(),
    standardTextPrice: z
      .strictObject({
        inputUsdPerMillion: exactMicroUsdRateSchema,
        outputUsdPerMillion: exactMicroUsdRateSchema,
      })
      .optional(),
  })
  .refine(
    ({ planningTier, standardTextPrice }) =>
      planningTier !== undefined || standardTextPrice !== undefined,
    { message: "An API catalog override must change a planning tier or standard text price." },
  )
  .refine(
    ({ effectiveFrom, recordedAt }) =>
      effectiveFrom <= recordedAt.slice(0, 10),
    {
      path: ["effectiveFrom"],
      message: "Future-scheduled API catalog overrides are not supported.",
    },
  );

export const apiCatalogOverrideSourcesSchema = z
  .strictObject({
    contractVersion: z.literal(API_CATALOG_OVERRIDE_SOURCE_VERSION),
    overrides: z.array(apiCatalogOverrideSourceSchema).max(MAX_API_OVERRIDES),
  })
  .superRefine(({ overrides }, context) => {
    const targets = overrides.map(({ target }) =>
      JSON.stringify([target.registryId, target.registryVersion, target.entryId]),
    );
    if (new Set(targets).size !== targets.length) {
      context.addIssue({
        code: "custom",
        path: ["overrides"],
        message: "API catalog override targets must be unique.",
      });
    }
  });

export const bestFitSourceStateSchema = z.strictObject({
  contractVersion: z.literal(BEST_FIT_SOURCE_STATE_VERSION),
  availableAiResources: availableAiResourceSourcesSchema,
  apiCatalogOverrides: apiCatalogOverrideSourcesSchema,
});

export type BestFitSourceState = z.infer<typeof bestFitSourceStateSchema>;

export interface BestFitSourceStateInput {
  resourceDrafts: readonly AvailableAiResourceDraft[];
  resourceEvidenceObservedAtById: Readonly<
    Record<string, AvailableAiResourceEvidenceObservedAt>
  >;
  apiOverrides: readonly ApiCatalogOverride[];
}

export function createEmptyBestFitSourceState(): BestFitSourceState {
  return {
    contractVersion: BEST_FIT_SOURCE_STATE_VERSION,
    availableAiResources: {
      contractVersion: AVAILABLE_AI_RESOURCE_SOURCE_VERSION,
      drafts: [],
      evidenceObservedAtById: {},
    },
    apiCatalogOverrides: {
      contractVersion: API_CATALOG_OVERRIDE_SOURCE_VERSION,
      overrides: [],
    },
  };
}

export function createBestFitSourceState(
  input: BestFitSourceStateInput,
): BestFitSourceState | null {
  const parsed = bestFitSourceStateSchema.safeParse({
    contractVersion: BEST_FIT_SOURCE_STATE_VERSION,
    availableAiResources: {
      contractVersion: AVAILABLE_AI_RESOURCE_SOURCE_VERSION,
      drafts: input.resourceDrafts,
      evidenceObservedAtById: input.resourceEvidenceObservedAtById,
    },
    apiCatalogOverrides: {
      contractVersion: API_CATALOG_OVERRIDE_SOURCE_VERSION,
      overrides: input.apiOverrides,
    },
  });
  return parsed.success ? parsed.data : null;
}

import {
  COST_SCENARIOS,
  invocationTokensForScenario,
} from "@/lib/calculation/invocation-feasibility";
import { toMicroUsd } from "@/lib/calculation/micro-usd";
import { resolveOfferingEligibility } from "@/lib/offerings/eligibility";
import {
  isApiCatalogOverrideEffectiveAt,
  validateApiCatalogOverride,
} from "@/lib/offerings/catalog-overrides";
import { allocateResolvedBestFitPlan } from "@/lib/planning/best-fit-allocator";
import {
  resolveBestFitTaskCandidates,
  type BestFitSubscriptionCandidateInput,
  type ResolvedBestFitTaskCandidateSet,
} from "@/lib/planning/best-fit-candidates";
import {
  adaptAvailableAiResourceDraft,
  recoverableAvailableAiResourcePresetReason,
} from "@/lib/planning/resource-drafts";
import { toOfferingEligibilityRequirement } from "@/lib/planning/workload-requirements";
import { resolveStoredSubscriptionResource } from "@/lib/subscriptions/resource-resolver";
import type { BestFitAllocationPlan } from "@/types/best-fit";
import type {
  PlanningSettings,
  PlanningStrategy,
  TaskAnalysis,
  TaskInput,
} from "@/types/domain";
import type { RouteIdentity } from "@/types/offerings";
import type {
  AvailableAiResourceDraft,
  AvailableAiResourceDraftFieldErrors,
  AvailableAiResourceEvidenceObservedAt,
} from "@/types/resource-drafts";
import type { ConditionalReasonCode } from "@/types/offerings";
import type { ApiCatalogOverride } from "@/types/pricing";

export type BestFitResourceDiagnostic =
  | {
      uiId: string;
      displayName: string;
      status: "invalid";
      routeIdentity: null;
      fieldErrors: AvailableAiResourceDraftFieldErrors;
      reasonCodes: readonly [];
    }
  | {
      uiId: string;
      displayName: string;
      status: "conditional";
      routeIdentity: RouteIdentity | null;
      fieldErrors: AvailableAiResourceDraftFieldErrors;
      reasonCodes: readonly ConditionalReasonCode[];
    }
  | {
      uiId: string;
      displayName: string;
      status: "resolved";
      routeIdentity: RouteIdentity;
      fieldErrors: Readonly<Record<string, never>>;
      reasonCodes: readonly ConditionalReasonCode[];
    };

export interface BestFitUiPlan {
  plan: BestFitAllocationPlan;
  candidateSets: readonly ResolvedBestFitTaskCandidateSet[];
  resourceDiagnostics: readonly BestFitResourceDiagnostic[];
}

export interface BuildBestFitUiPlanInput {
  tasks: readonly TaskInput[];
  analyses: readonly TaskAnalysis[];
  strategy: PlanningStrategy;
  incrementalCashBudgetUsd: number;
  planningAsOf: string;
  pricingAsOf: string;
  resourceEvidenceObservedAtById: Readonly<
    Record<string, AvailableAiResourceEvidenceObservedAt>
  >;
  resourceDrafts: readonly AvailableAiResourceDraft[];
  apiOverrides: readonly ApiCatalogOverride[];
}

interface ResolvedDraftForPlanning {
  uiId: string;
  displayName: string;
  offering: ReturnType<typeof adaptAvailableAiResourceDraft> extends infer Result
    ? Result extends { success: true; offering: infer Offering }
      ? Offering
      : never
    : never;
  resourceInput: ReturnType<typeof adaptAvailableAiResourceDraft> extends infer Result
    ? Result extends { success: true; resourceInput: infer Resource }
      ? Resource
      : never
    : never;
  resolution: Exclude<
    ReturnType<typeof resolveStoredSubscriptionResource>,
    { status: "invalid" }
  >;
}

export type BestFitRelevantSettings = Pick<
  PlanningSettings,
  "budgetUsd" | "strategy"
>;

export interface BestFitRelevantSettingsTransition {
  changed: boolean;
  lastValid: BestFitRelevantSettings;
}

export function hasBestFitRelevantSettingsChange(
  previous: BestFitRelevantSettings | null,
  next: PlanningSettings,
): boolean {
  return (
    previous === null ||
    previous.budgetUsd !== next.budgetUsd ||
    previous.strategy !== next.strategy
  );
}

export function reconcileBestFitRelevantSettings(
  lastValid: BestFitRelevantSettings,
  next: PlanningSettings | null,
): BestFitRelevantSettingsTransition {
  if (next === null) return { changed: false, lastValid };
  return {
    changed: hasBestFitRelevantSettingsChange(lastValid, next),
    lastValid: {
      budgetUsd: next.budgetUsd,
      strategy: next.strategy,
    },
  };
}

function resourceRouteIdentity(
  resource: ResolvedDraftForPlanning["resourceInput"],
): RouteIdentity {
  return {
    providerId: resource.offeringRef.providerId,
    offeringId: resource.offeringRef.offeringId,
    resourceId: resource.id,
  } as RouteIdentity;
}

function resolveResourceDrafts(
  drafts: readonly AvailableAiResourceDraft[],
  resourceEvidenceObservedAtById: Readonly<
    Record<string, AvailableAiResourceEvidenceObservedAt>
  >,
  planningAsOf: string,
): {
  diagnostics: BestFitResourceDiagnostic[];
  resolved: ResolvedDraftForPlanning[];
} {
  const diagnostics: BestFitResourceDiagnostic[] = [];
  const resolved: ResolvedDraftForPlanning[] = [];

  for (const draft of drafts) {
    const evidenceObservedAt = resourceEvidenceObservedAtById[draft.uiId];
    if (evidenceObservedAt === undefined) {
      diagnostics.push({
        uiId: draft.uiId,
        displayName: draft.displayName,
        status: "invalid",
        routeIdentity: null,
        fieldErrors: { observedAt: "required" },
        reasonCodes: [],
      });
      continue;
    }
    const adapted = adaptAvailableAiResourceDraft(draft, {
      evidenceObservedAt,
    });
    if (!adapted.success) {
      const presetReason = recoverableAvailableAiResourcePresetReason(draft);
      if (presetReason !== null) {
        diagnostics.push({
          uiId: draft.uiId,
          displayName: draft.displayName,
          status: "conditional",
          routeIdentity: null,
          fieldErrors: adapted.fieldErrors,
          reasonCodes: [presetReason],
        });
      } else {
        diagnostics.push({
          uiId: draft.uiId,
          displayName: draft.displayName,
          status: "invalid",
          routeIdentity: null,
          fieldErrors: adapted.fieldErrors,
          reasonCodes: [],
        });
      }
      continue;
    }

    const resolution = resolveStoredSubscriptionResource(
      adapted.resourceInput,
      planningAsOf,
    );
    if (resolution.status === "invalid") {
      diagnostics.push({
        uiId: draft.uiId,
        displayName: draft.displayName,
        status: "invalid",
        routeIdentity: null,
        fieldErrors: { draft: "strict-resource-invalid" },
        reasonCodes: [],
      });
      continue;
    }

    diagnostics.push({
      uiId: draft.uiId,
      displayName: draft.displayName,
      status: resolution.status,
      routeIdentity: resourceRouteIdentity(adapted.resourceInput),
      fieldErrors: {},
      reasonCodes: [...resolution.reasonCodes],
    });
    resolved.push({
      uiId: draft.uiId,
      displayName: draft.displayName,
      offering: adapted.offering,
      resourceInput: adapted.resourceInput,
      resolution,
    });
  }

  return { diagnostics, resolved };
}

function subscriptionInputsForTask(
  resources: readonly ResolvedDraftForPlanning[],
  analysis: TaskAnalysis,
): BestFitSubscriptionCandidateInput[] {
  const requirement = toOfferingEligibilityRequirement(
    analysis,
    COST_SCENARIOS.map((scenario) => ({
      scenario,
      ...invocationTokensForScenario(analysis, scenario),
    })),
  );

  return resources.flatMap(({ offering, resolution }) => {
    if (resolution.resource === null) return [];
    const eligibility = resolveOfferingEligibility(
      offering,
      new Map(),
      requirement,
    );
    return [{ resource: resolution.resource, resolution, eligibility }];
  });
}

export function buildBestFitUiPlan(
  input: BuildBestFitUiPlanInput,
): BestFitUiPlan {
  if (
    input.tasks.length !== input.analyses.length ||
    input.tasks.some((task, index) => task.id !== input.analyses[index]?.taskId)
  ) {
    throw new Error("Best-fit UI planning requires ordered task and analysis identities.");
  }
  if (new Set(input.resourceDrafts.map(({ uiId }) => uiId)).size !== input.resourceDrafts.length) {
    throw new Error("Best-fit UI planning requires unique resource draft identities.");
  }
  if (
    !Number.isFinite(input.incrementalCashBudgetUsd) ||
    input.incrementalCashBudgetUsd < 0.01 ||
    input.incrementalCashBudgetUsd > 10_000
  ) {
    throw new Error("Best-fit UI planning requires a valid incremental-cash budget.");
  }

  const budgetMicroUsd = toMicroUsd(input.incrementalCashBudgetUsd);
  if (!Number.isSafeInteger(budgetMicroUsd) || budgetMicroUsd < 0) {
    throw new Error("Best-fit UI planning budget exceeds the safe micro-USD range.");
  }

  const applicableApiOverrides: ApiCatalogOverride[] = [];
  for (const override of input.apiOverrides) {
    const validated = validateApiCatalogOverride(override);
    if (!validated.ok) {
      if (validated.reasonCode === "override-target-unresolved") continue;
      throw new Error(
        `Best-fit API catalog override is invalid: ${validated.reasonCode}.`,
      );
    }
    if (!isApiCatalogOverrideEffectiveAt(validated.override, input.pricingAsOf)) {
      throw new Error("Best-fit API catalog override cannot be scheduled for the future.");
    }
    applicableApiOverrides.push(validated.override);
  }

  const resources = resolveResourceDrafts(
    input.resourceDrafts,
    input.resourceEvidenceObservedAtById,
    input.planningAsOf,
  );
  const candidateSets = input.tasks.map((task, originalIndex) => {
    const analysis = input.analyses[originalIndex];
    if (!analysis) throw new Error("Best-fit analysis is missing.");
    return resolveBestFitTaskCandidates({
      task,
      analysis,
      originalIndex,
      planningAsOf: input.planningAsOf,
      pricingAsOf: input.pricingAsOf,
      subscriptions: subscriptionInputsForTask(resources.resolved, analysis),
      apiOverrides: applicableApiOverrides,
    });
  });

  const plan = allocateResolvedBestFitPlan({
    tasks: candidateSets,
    strategy: input.strategy,
    planningAsOf: input.planningAsOf,
    pricingAsOf: input.pricingAsOf,
    incrementalCashBudgetMicroUsd: budgetMicroUsd,
    apiOverrides: applicableApiOverrides,
  });

  return {
    plan,
    candidateSets,
    resourceDiagnostics: resources.diagnostics,
  };
}

import { z } from "zod";

import { resolveAllApiCatalogEntries } from "@/lib/offerings/provider-catalog-adapter";
import {
  compareRouteIdentities,
  normalizeConditionalReasonCodes,
  routeIdentityToCanonicalKey,
  sortConditionalAlternatives,
} from "@/lib/offerings/route-identity";
import {
  BEST_FIT_EXCLUSION_REASON_CODES,
  type BestFitExclusionReasonCode,
  type ResolvedBestFitTaskCandidateSet,
} from "@/lib/planning/best-fit-candidates";
import {
  adaptAvailableAiResourceDraft,
  recoverableAvailableAiResourcePresetReason,
} from "@/lib/planning/resource-drafts";
import type {
  BestFitResourceDiagnostic,
  BestFitUiPlan,
} from "@/lib/planning/best-fit-ui-plan";
import {
  bestFitSourceStateSchema,
  type BestFitSourceState,
} from "@/lib/storage/best-fit-sources";
import { resolveStoredSubscriptionResource } from "@/lib/subscriptions/resource-resolver";
import type {
  BestFitConfirmedRouteCandidate,
  BestFitTaskResult,
} from "@/types/best-fit";
import type { AnalysisMode, TaskAnalysis, TaskInput } from "@/types/domain";
import type {
  ConditionalAlternative,
  ConditionalReasonCode,
  EvidenceRef,
  InvocationLimits,
  ModelDefinition,
  Offering,
  OfferingCapabilityPolicy,
  OfferingLimitPolicy,
  RouteIdentity,
  SourcedCapabilityProfile,
  SourcedInvocationLimits,
} from "@/types/offerings";
import type {
  ConsumptionRule,
  OveragePolicy,
  ResetPolicy,
  ResolvedSubscriptionResource,
  SubscriptionQuota,
} from "@/types/subscriptions";

export const BEST_FIT_PLAN_JSON_SCHEMA_VERSION = 5 as const;
export const BEST_FIT_PLAN_RESULT_KIND = "best-fit-route-plan" as const;

export interface BestFitPlanExportContext {
  sourceTasks: readonly TaskInput[];
  uiPlan: BestFitUiPlan;
  sourceState: BestFitSourceState;
  analysisMode: AnalysisMode;
  analysisModel: string;
  generatedAt: string;
}

export interface BestFitExportRouteIdentity {
  providerId: string;
  offeringId: string;
  resourceId: string | null;
}

export type BestFitExportRouteKey = readonly [string, string, string | null];

export interface BestFitExportRouteProjection {
  routeIdentity: BestFitExportRouteIdentity;
  routeKey: BestFitExportRouteKey;
}

type JsonPrimitive = string | number | boolean | null;
export type BestFitExportJsonValue =
  | JsonPrimitive
  | readonly BestFitExportJsonValue[]
  | { readonly [key: string]: BestFitExportJsonValue };

export interface BestFitAuditSnapshot {
  purpose: "audit-only";
  importAuthority: false;
  value: BestFitExportJsonValue;
}

const exclusionReasonRank = new Map<string, number>(
  BEST_FIT_EXCLUSION_REASON_CODES.map((reason, index) => [reason, index]),
);

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function auditSnapshot(value: BestFitExportJsonValue): BestFitAuditSnapshot {
  return {
    purpose: "audit-only",
    importAuthority: false,
    value: jsonClone(value) as BestFitExportJsonValue,
  };
}

function projectEvidence(evidence: EvidenceRef): BestFitExportJsonValue {
  if (evidence.kind === "user-observed") {
    return {
      kind: evidence.kind,
      observedAt: evidence.observedAt,
      note: evidence.note,
    };
  }
  if (evidence.kind === "verified-connector-snapshot") {
    return {
      kind: evidence.kind,
      authority: evidence.authority,
      adapterId: evidence.adapterId,
      adapterVersion: evidence.adapterVersion,
      bindingId: evidence.bindingId,
      snapshotId: evidence.snapshotId,
      capturedAt: evidence.capturedAt,
    };
  }
  return {
    kind: evidence.kind,
    authority: evidence.authority,
    registryId: evidence.registryId,
    registryVersion: evidence.registryVersion,
    entryId: evidence.entryId,
    claimId: evidence.claimId,
    providerId: evidence.providerId,
    subjectId: evidence.subjectId,
    fieldPath: evidence.fieldPath,
    sourceUrl: evidence.sourceUrl,
    verifiedAt: evidence.verifiedAt,
  };
}

function projectInvocationLimits(
  limits: InvocationLimits,
): BestFitExportJsonValue {
  return {
    ...(limits.maxInputTokens === undefined
      ? {}
      : { maxInputTokens: limits.maxInputTokens }),
    ...(limits.maxOutputTokens === undefined
      ? {}
      : { maxOutputTokens: limits.maxOutputTokens }),
    ...(limits.maxCombinedTokens === undefined
      ? {}
      : { maxCombinedTokens: limits.maxCombinedTokens }),
  };
}

function projectSourcedInvocationLimits(
  value: SourcedInvocationLimits,
): BestFitExportJsonValue {
  if (value.knowledge === "unknown") {
    return {
      knowledge: value.knowledge,
      reason: value.reason,
      ...(value.evidence === undefined
        ? {}
        : { evidence: projectEvidence(value.evidence) }),
    };
  }
  return {
    knowledge: value.knowledge,
    limits: projectInvocationLimits(value.limits),
    ...(value.knowledge === "partial" ? { reason: value.reason } : {}),
    evidence: projectEvidence(value.evidence),
  };
}

function projectSourcedCapabilityProfile(
  value: SourcedCapabilityProfile,
): BestFitExportJsonValue {
  if (value.knowledge === "unknown") {
    return {
      knowledge: value.knowledge,
      reason: value.reason,
      ...(value.evidence === undefined
        ? {}
        : { evidence: projectEvidence(value.evidence) }),
    };
  }
  return {
    knowledge: value.knowledge,
    capabilityIds: [...value.capabilityIds],
    ...(value.knowledge === "partial" ? { reason: value.reason } : {}),
    evidence: projectEvidence(value.evidence),
  };
}

function projectOfferingLimitPolicy(
  policy: OfferingLimitPolicy,
): BestFitExportJsonValue {
  if (policy.kind === "same-as-model") {
    return { kind: policy.kind, evidence: projectEvidence(policy.evidence) };
  }
  if (policy.kind === "bounded") {
    return {
      kind: policy.kind,
      invocationLimits: projectSourcedInvocationLimits(policy.invocationLimits),
    };
  }
  return {
    kind: policy.kind,
    ...(policy.evidence === undefined
      ? {}
      : { evidence: projectEvidence(policy.evidence) }),
  };
}

function projectOfferingCapabilityPolicy(
  policy: OfferingCapabilityPolicy,
): BestFitExportJsonValue {
  if (policy.kind === "same-as-model") {
    return { kind: policy.kind, evidence: projectEvidence(policy.evidence) };
  }
  if (policy.kind === "bounded") {
    return {
      kind: policy.kind,
      capabilityProfile: projectSourcedCapabilityProfile(
        policy.capabilityProfile,
      ),
    };
  }
  return {
    kind: policy.kind,
    ...(policy.evidence === undefined
      ? {}
      : { evidence: projectEvidence(policy.evidence) }),
  };
}

function projectRegistryReference(
  reference: ModelDefinition["registryReference"],
): BestFitExportJsonValue {
  return {
    registryId: reference.registryId,
    registryVersion: reference.registryVersion,
    entryId: reference.entryId,
  };
}

function projectModel(model: ModelDefinition): BestFitExportJsonValue {
  return {
    id: model.id,
    modelProviderId: model.modelProviderId,
    family: model.family,
    displayName: model.displayName,
    qualityTier: model.qualityTier,
    capabilityProfile: projectSourcedCapabilityProfile(model.capabilityProfile),
    invocationLimits: projectSourcedInvocationLimits(model.invocationLimits),
    evidence: projectEvidence(model.evidence),
    registryReference: projectRegistryReference(model.registryReference),
  };
}

function projectOffering(offering: Offering): BestFitExportJsonValue {
  const common = {
    kind: offering.kind,
    id: offering.id,
    providerId: offering.providerId,
    mode: offering.mode,
    supportedSurfaces: [...offering.supportedSurfaces],
    evidence: projectEvidence(offering.evidence),
    ...(offering.registryReference === undefined
      ? {}
      : { registryReference: projectRegistryReference(offering.registryReference) }),
  };
  if (offering.kind === "model-bound") {
    return {
      ...common,
      modelId: offering.modelId,
      limitPolicy: projectOfferingLimitPolicy(offering.limitPolicy),
      capabilityPolicy: projectOfferingCapabilityPolicy(
        offering.capabilityPolicy,
      ),
    };
  }
  return {
    ...common,
    eligibility:
      offering.eligibility.kind === "profiled"
        ? {
            kind: offering.eligibility.kind,
            profile: {
              qualityTier: offering.eligibility.profile.qualityTier,
              capabilityProfile: projectSourcedCapabilityProfile(
                offering.eligibility.profile.capabilityProfile,
              ),
              invocationLimits: projectSourcedInvocationLimits(
                offering.eligibility.profile.invocationLimits,
              ),
            },
            evidence: projectEvidence(offering.eligibility.evidence),
          }
        : {
            kind: offering.eligibility.kind,
            reason: offering.eligibility.reason,
            ...(offering.eligibility.evidence === undefined
              ? {}
              : { evidence: projectEvidence(offering.eligibility.evidence) }),
          },
  };
}

function projectConsumptionRule(
  rule: ConsumptionRule,
): BestFitExportJsonValue {
  return rule.kind === "fixed-per-basis"
    ? {
        kind: rule.kind,
        unit: rule.unit,
        basis: rule.basis,
        units: rule.units,
        evidence: projectEvidence(rule.evidence),
      }
    : {
        kind: rule.kind,
        unit: rule.unit,
        basis: rule.basis,
        low: rule.low,
        expected: rule.expected,
        high: rule.high,
        sampleSize: rule.sampleSize,
        evidence: projectEvidence(rule.evidence),
      };
}

function projectSubscriptionQuota(
  quota: SubscriptionQuota,
): BestFitExportJsonValue {
  if (quota.kind === "opaque") {
    return { kind: quota.kind, description: quota.description };
  }
  if (quota.kind === "metered") {
    return {
      kind: quota.kind,
      unit: quota.unit,
      included: {
        value: quota.included.value,
        evidence: projectEvidence(quota.included.evidence),
      },
      remaining: {
        value: quota.remaining.value,
        evidence: projectEvidence(quota.remaining.evidence),
      },
      consumptionRule: projectConsumptionRule(quota.consumptionRule),
    };
  }
  if (quota.kind === "calibrated") {
    return {
      kind: quota.kind,
      unit: quota.unit,
      remainingPercent: {
        value: quota.remainingPercent.value,
        evidence: projectEvidence(quota.remainingPercent.evidence),
      },
      consumptionRule: projectConsumptionRule(quota.consumptionRule),
    };
  }
  return {
    kind: quota.kind,
    unit: quota.unit,
    included: {
      value: quota.included.value,
      evidence: projectEvidence(quota.included.evidence),
    },
    availableOnActivation: {
      value: quota.availableOnActivation.value,
      evidence: projectEvidence(quota.availableOnActivation.evidence),
    },
    appliesFor: quota.appliesFor,
    consumptionRule: projectConsumptionRule(quota.consumptionRule),
  };
}

function projectResetPolicy(reset: ResetPolicy): BestFitExportJsonValue {
  if (reset.kind === "none" || reset.kind === "unknown") {
    return { kind: reset.kind };
  }
  return reset.kind === "fixed"
    ? {
        kind: reset.kind,
        cadenceDays: reset.cadenceDays,
        nextResetAt: reset.nextResetAt,
        evidence: projectEvidence(reset.evidence),
      }
    : {
        kind: reset.kind,
        windowHours: reset.windowHours,
        evidence: projectEvidence(reset.evidence),
      };
}

function projectOveragePolicy(overage: OveragePolicy): BestFitExportJsonValue {
  if (overage.kind === "none" || overage.kind === "unknown") {
    return { kind: overage.kind };
  }
  return {
    kind: overage.kind,
    unit: overage.unit,
    usdPerUnit: overage.usdPerUnit,
    appliesTo:
      overage.appliesTo.kind === "whole-resource"
        ? { kind: overage.appliesTo.kind }
        : {
            kind: overage.appliesTo.kind,
            offeringRefs: overage.appliesTo.offeringRefs.map((reference) => ({
              providerId: reference.providerId,
              offeringId: reference.offeringId,
            })),
          },
    effectiveFrom: overage.effectiveFrom,
    ...(overage.effectiveThrough === undefined
      ? {}
      : { effectiveThrough: overage.effectiveThrough }),
    ...(overage.maxOverageUnits === undefined
      ? {}
      : { maxOverageUnits: overage.maxOverageUnits }),
    evidence: projectEvidence(overage.evidence),
  };
}

function projectSubscriptionResource(
  resource: ResolvedSubscriptionResource,
): BestFitExportJsonValue {
  const common = {
    contractVersion: resource.contractVersion,
    id: resource.id,
    offeringRef: {
      providerId: resource.offeringRef.providerId,
      offeringId: resource.offeringRef.offeringId,
    },
    availability: {
      status: resource.availability.status,
      evidence: projectEvidence(resource.availability.evidence),
    },
    reset: projectResetPolicy(resource.reset),
    overage: projectOveragePolicy(resource.overage),
    ownership: resource.ownership,
    quota: projectSubscriptionQuota(resource.quota),
  };
  return resource.ownership === "owned"
    ? {
        ...common,
        commitment: {
          kind: resource.commitment.kind,
          currentFeeUsd: resource.commitment.currentFeeUsd,
          currency: resource.commitment.currency,
          billingBasis: resource.commitment.billingBasis,
          evidence: projectEvidence(resource.commitment.evidence),
        },
      }
    : {
        ...common,
        commitment: {
          kind: resource.commitment.kind,
          feeUsd: resource.commitment.feeUsd,
          currency: resource.commitment.currency,
          billingBasis: resource.commitment.billingBasis,
          evidence: projectEvidence(resource.commitment.evidence),
        },
      };
}

function assertIsoDateTime(value: string, name: string): void {
  if (!z.iso.datetime().safeParse(value).success) {
    throw new Error(`${name} must be an ISO UTC date-time.`);
  }
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function projectBestFitExportRoute(
  identity: RouteIdentity,
): BestFitExportRouteProjection {
  const [providerId, offeringId, resourceId] =
    routeIdentityToCanonicalKey(identity);
  return {
    routeIdentity: { providerId, offeringId, resourceId },
    routeKey: [providerId, offeringId, resourceId],
  };
}

function projectOptionalRoute(identity: RouteIdentity | null): {
  routeIdentity: BestFitExportRouteIdentity | null;
  routeKey: BestFitExportRouteKey | null;
} {
  if (identity === null) return { routeIdentity: null, routeKey: null };
  return projectBestFitExportRoute(identity);
}

function projectConditionalAlternative(alternative: ConditionalAlternative) {
  const route = projectBestFitExportRoute(alternative.routeIdentity);
  const fallback = projectBestFitExportRoute(alternative.fallbackRouteIdentity);
  return {
    ...route,
    confidence: "conditional" as const,
    reasonCodes: [...normalizeConditionalReasonCodes(alternative.reasonCodes)],
    fallbackRouteIdentity: fallback.routeIdentity,
    fallbackRouteKey: fallback.routeKey,
  };
}

function projectConditionalAlternatives(
  alternatives: readonly ConditionalAlternative[],
) {
  return sortConditionalAlternatives(alternatives).map(
    projectConditionalAlternative,
  );
}

function projectScenario(values: {
  low: number;
  expected: number;
  high: number;
}) {
  return {
    low: values.low,
    expected: values.expected,
    high: values.high,
  };
}

function projectSourceTask(task: TaskInput): TaskInput {
  return {
    id: task.id,
    name: task.name,
    description: task.description,
    priority: task.priority,
    deadlineDate: task.deadlineDate,
    failureImpact: task.failureImpact,
  };
}

function projectTaskAnalysis(analysis: TaskAnalysis): TaskAnalysis {
  return {
    taskId: analysis.taskId,
    taskType: analysis.taskType,
    complexity: analysis.complexity,
    reasoningDepth: analysis.reasoningDepth,
    expectedIterations: analysis.expectedIterations,
    estimatedInputSize: analysis.estimatedInputSize,
    estimatedOutputSize: analysis.estimatedOutputSize,
    uncertainty: analysis.uncertainty,
    recommendedModelTier: analysis.recommendedModelTier,
    riskFactors: [...analysis.riskFactors],
    rationale: analysis.rationale,
    workMode: analysis.workMode,
    requiredQualityTier: analysis.requiredQualityTier,
    requiredCapabilities: [...analysis.requiredCapabilities],
    upgradeConditions: [...analysis.upgradeConditions],
    failureRisk: analysis.failureRisk,
  };
}

function canonicalizeSourceState(sourceState: BestFitSourceState): BestFitSourceState {
  const parsed = bestFitSourceStateSchema.parse(sourceState);
  const drafts = [...parsed.availableAiResources.drafts].sort((left, right) =>
    compareStrings(left.uiId, right.uiId),
  );
  const evidenceObservedAtById = Object.fromEntries(
    drafts.map(({ uiId }) => [
      uiId,
      jsonClone(parsed.availableAiResources.evidenceObservedAtById[uiId]),
    ]),
  );
  const overrides = [...parsed.apiCatalogOverrides.overrides].sort(
    (left, right) =>
      compareStrings(
        JSON.stringify([
          left.target.registryId,
          left.target.registryVersion,
          left.target.entryId,
        ]),
        JSON.stringify([
          right.target.registryId,
          right.target.registryVersion,
          right.target.entryId,
        ]),
      ),
  );

  return jsonClone({
    contractVersion: parsed.contractVersion,
    availableAiResources: {
      contractVersion: parsed.availableAiResources.contractVersion,
      drafts,
      evidenceObservedAtById,
    },
    apiCatalogOverrides: {
      contractVersion: parsed.apiCatalogOverrides.contractVersion,
      overrides,
    },
  });
}

function normalizeExclusionReasonCodes(
  reasonCodes: readonly BestFitExclusionReasonCode[],
): BestFitExclusionReasonCode[] {
  return [...new Set(reasonCodes)].sort(
    (left, right) =>
      (exclusionReasonRank.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (exclusionReasonRank.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

function projectConfirmedRoute(candidate: BestFitConfirmedRouteCandidate) {
  const route = projectBestFitExportRoute(candidate.routeIdentity);
  if (candidate.mode === "api") {
    return {
      mode: candidate.mode,
      ...route,
      confidence: "confirmed" as const,
      qualityTier: candidate.qualityTier,
      modelId: candidate.modelId,
      variableCashMicroUsd: projectScenario(candidate.variableCashMicroUsd),
      resource: null,
      demandMicrounits: null,
    };
  }

  return {
    mode: candidate.mode,
    ...route,
    confidence: "confirmed" as const,
    qualityTier: candidate.qualityTier,
    modelId: candidate.modelId,
    variableCashMicroUsd: null,
    resource: {
      ...projectBestFitExportRoute(candidate.resource.routeIdentity),
      ownership: candidate.resource.ownership,
      quotaUnit: candidate.resource.quotaUnit,
      availableMicrounits: candidate.resource.availableMicrounits,
      fullPlanPeriodFeeMicroUsd:
        candidate.resource.fullPlanPeriodFeeMicroUsd,
      overage:
        candidate.resource.overage === null
          ? null
          : {
              rateUsdPerUnit: { ...candidate.resource.overage.rateUsdPerUnit },
              maxOverageMicrounits:
                candidate.resource.overage.maxOverageMicrounits,
            },
    },
    demandMicrounits: {
      unit: candidate.demandMicrounits.unit,
      ...projectScenario(candidate.demandMicrounits),
    },
  };
}

function projectCandidateSet(candidateSet: ResolvedBestFitTaskCandidateSet) {
  const confirmedRoutes = [...candidateSet.confirmedRoutes]
    .sort((left, right) =>
      compareRouteIdentities(left.routeIdentity, right.routeIdentity),
    )
    .map(projectConfirmedRoute);
  const excludedRoutes = [...candidateSet.excludedRoutes]
    .sort((left, right) => {
      const routeDifference = compareRouteIdentities(
        left.routeIdentity,
        right.routeIdentity,
      );
      if (routeDifference !== 0) return routeDifference;
      const statusDifference = compareStrings(left.status, right.status);
      if (statusDifference !== 0) return statusDifference;
      return compareStrings(
        JSON.stringify(normalizeExclusionReasonCodes(left.reasonCodes)),
        JSON.stringify(normalizeExclusionReasonCodes(right.reasonCodes)),
      );
    })
    .map((route) => ({
      ...projectBestFitExportRoute(route.routeIdentity),
      status: route.status,
      reasonCodes: normalizeExclusionReasonCodes(route.reasonCodes),
    }));

  return {
    taskId: candidateSet.task.id,
    originalIndex: candidateSet.originalIndex,
    analysis: projectTaskAnalysis(candidateSet.analysis),
    confirmedRoutes,
    conditionalAlternatives: projectConditionalAlternatives(
      candidateSet.conditionalAlternatives,
    ),
    excludedRoutes,
  };
}

function projectResultTask(task: BestFitTaskResult) {
  const base = {
    taskId: task.taskId,
    originalIndex: task.originalIndex,
    strategyTargetTier: task.strategyTargetTier,
    appliedUpgradeTriggers: [...task.appliedUpgradeTriggers],
    conditionalAlternatives: projectConditionalAlternatives(
      task.conditionalAlternatives,
    ),
  };

  if (task.status === "active") {
    const route = projectBestFitExportRoute(task.routeIdentity);
    const alternative = projectOptionalRoute(task.alternativeRouteIdentity);
    return {
      ...base,
      status: task.status,
      ...route,
      confidence: "confirmed" as const,
      modelId: task.modelId,
      routeKind: task.routeKind,
      qualityTier: task.qualityTier,
      variableCashMicroUsd: projectScenario(task.variableCashMicroUsd),
      whyEnough: task.whyEnough,
      whyNotPremium: task.whyNotPremium,
      alternativeRouteIdentity: alternative.routeIdentity,
      alternativeRouteKey: alternative.routeKey,
      holdReason: null,
      infeasibleReason: null,
    };
  }

  return {
    ...base,
    status: task.status,
    routeIdentity: null,
    routeKey: null,
    confidence: null,
    modelId: null,
    routeKind: null,
    qualityTier: null,
    variableCashMicroUsd: null,
    whyEnough: null,
    whyNotPremium: null,
    alternativeRouteIdentity: null,
    alternativeRouteKey: null,
    holdReason: task.status === "held" ? task.holdReason : null,
    infeasibleReason:
      task.status === "infeasible" ? task.infeasibleReason : null,
  };
}

function assertPlanArithmetic(context: BestFitPlanExportContext): void {
  const { plan } = context.uiPlan;
  const maximumSafeMicroUsd = BigInt(Number.MAX_SAFE_INTEGER);
  const scenarioTotals = {
    low: plan.cash.lowMicroUsd,
    expected: plan.cash.expectedMicroUsd,
    high: plan.cash.highMicroUsd,
  } as const;
  for (const scenario of ["low", "expected", "high"] as const) {
    const components = [
      plan.cash.apiMicroUsd[scenario],
      plan.cash.subscriptionFeeMicroUsd,
      plan.cash.paidOverageMicroUsd[scenario],
    ];
    if (
      !Number.isSafeInteger(scenarioTotals[scenario]) ||
      scenarioTotals[scenario] < 0 ||
      components.some((value) => !Number.isSafeInteger(value) || value < 0)
    ) {
      throw new Error(`Best-fit ${scenario} cash values must be safe non-negative integers.`);
    }
    const componentSum = components.reduce(
      (sum, value) => sum + BigInt(value),
      BigInt(0),
    );
    const overflow = plan.cash.scenarioOverflow[scenario];
    const total = BigInt(scenarioTotals[scenario]);
    const valid = overflow
      ? total === maximumSafeMicroUsd && componentSum >= maximumSafeMicroUsd
      : total === componentSum;
    if (!valid) {
      throw new Error(`Best-fit ${scenario} cash components do not equal the total.`);
    }
  }

  const statusCounts = plan.tasks.reduce(
    (counts, task) => ({
      ...counts,
      [task.status]: counts[task.status] + 1,
    }),
    { active: 0, held: 0, infeasible: 0 },
  );
  if (
    statusCounts.active !== plan.activeTaskCount ||
    statusCounts.held !== plan.heldTaskCount ||
    statusCounts.infeasible !== plan.infeasibleTaskCount
  ) {
    throw new Error("Best-fit task status counts are inconsistent.");
  }

  if (plan.spendComparison !== null) {
    const comparison = plan.spendComparison;
    const difference =
      comparison.premiumBaselineExpectedMicroUsd -
      comparison.selectedExpectedIncrementalCashMicroUsd;
    if (
      comparison.differenceMicroUsd !== difference ||
      comparison.avoidedSpendMicroUsd !== Math.max(0, difference) ||
      comparison.additionalSpendMicroUsd !== Math.max(0, -difference)
    ) {
      throw new Error("Best-fit signed spend comparison is inconsistent.");
    }
  }
}

function assertContextIdentity(context: BestFitPlanExportContext): void {
  const { sourceTasks, uiPlan } = context;
  if (
    sourceTasks.length !== uiPlan.candidateSets.length ||
    sourceTasks.length !== uiPlan.plan.tasks.length
  ) {
    throw new Error("Best-fit export requires one result per source task.");
  }
  const taskIds = new Set<string>();
  sourceTasks.forEach((task, index) => {
    const candidateSet = uiPlan.candidateSets[index];
    if (
      taskIds.has(task.id) ||
      candidateSet?.task.id !== task.id ||
      candidateSet.analysis.taskId !== task.id ||
      candidateSet.originalIndex !== index ||
      JSON.stringify(projectSourceTask(candidateSet.task)) !==
        JSON.stringify(projectSourceTask(task))
    ) {
      throw new Error("Best-fit export task, analysis, and candidate identities differ.");
    }
    taskIds.add(task.id);
  });
  for (const task of uiPlan.plan.tasks) {
    if (sourceTasks[task.originalIndex]?.id !== task.taskId) {
      throw new Error("Best-fit result original indexes do not match source tasks.");
    }
  }
}

function normalizedDiagnosticReasons(
  diagnostic: BestFitResourceDiagnostic,
): readonly ConditionalReasonCode[] {
  if (diagnostic.reasonCodes.length === 0) return [];
  return normalizeConditionalReasonCodes(diagnostic.reasonCodes);
}

function sortedFieldErrors(errors: Readonly<Record<string, string>>) {
  return Object.fromEntries(
    Object.entries(errors).sort(([left], [right]) =>
      compareStrings(left, right),
    ),
  );
}

function assertDiagnosticParity(
  expected: BestFitResourceDiagnostic,
  actual: {
    status: "invalid" | "conditional" | "resolved";
    routeIdentity: RouteIdentity | null;
    reasonCodes: readonly ConditionalReasonCode[];
    fieldErrors: Readonly<Record<string, string>>;
  },
): void {
  const expectedKey =
    expected.routeIdentity === null
      ? null
      : routeIdentityToCanonicalKey(expected.routeIdentity);
  const actualKey =
    actual.routeIdentity === null
      ? null
      : routeIdentityToCanonicalKey(actual.routeIdentity);
  if (
    expected.status !== actual.status ||
    JSON.stringify(expectedKey) !== JSON.stringify(actualKey) ||
    JSON.stringify(normalizedDiagnosticReasons(expected)) !==
      JSON.stringify(actual.reasonCodes) ||
    JSON.stringify(sortedFieldErrors(expected.fieldErrors)) !==
      JSON.stringify(sortedFieldErrors(actual.fieldErrors))
  ) {
    throw new Error("Best-fit resource audit differs from the exported UI plan.");
  }
}

function projectResourceAudits(
  sourceState: BestFitSourceState,
  planningAsOf: string,
  diagnostics: readonly BestFitResourceDiagnostic[],
) {
  const diagnosticById = new Map(
    diagnostics.map((diagnostic) => [diagnostic.uiId, diagnostic]),
  );
  if (
    diagnosticById.size !== diagnostics.length ||
    diagnostics.length !== sourceState.availableAiResources.drafts.length
  ) {
    throw new Error("Best-fit resource sources and diagnostics must be one-to-one.");
  }

  return sourceState.availableAiResources.drafts.map((draft) => {
    const diagnostic = diagnosticById.get(draft.uiId);
    const observedAt =
      sourceState.availableAiResources.evidenceObservedAtById[draft.uiId];
    if (diagnostic === undefined || observedAt === undefined) {
      throw new Error("Best-fit resource audit source is missing.");
    }
    const adapted = adaptAvailableAiResourceDraft(draft, {
      evidenceObservedAt: observedAt,
    });
    if (!adapted.success) {
      const presetReason = recoverableAvailableAiResourcePresetReason(draft);
      const actual = {
        status: presetReason === null ? ("invalid" as const) : ("conditional" as const),
        routeIdentity: null,
        reasonCodes: presetReason === null ? [] : [presetReason],
        fieldErrors: sortedFieldErrors(adapted.fieldErrors),
      };
      assertDiagnosticParity(diagnostic, actual);
      return {
        uiId: draft.uiId,
        displayName: draft.displayName,
        ...actual,
        resolvedOffering: null,
        resolvedResource: null,
      };
    }

    const routeIdentity = {
      providerId: adapted.resourceInput.offeringRef.providerId,
      offeringId: adapted.resourceInput.offeringRef.offeringId,
      resourceId: adapted.resourceInput.id,
    } as RouteIdentity;
    const resolution = resolveStoredSubscriptionResource(
      adapted.resourceInput,
      planningAsOf,
    );
    if (resolution.status === "invalid") {
      const actual = {
        status: "invalid" as const,
        routeIdentity: null,
        reasonCodes: [] as const,
        fieldErrors: { draft: "strict-resource-invalid" },
      };
      assertDiagnosticParity(diagnostic, actual);
      return {
        uiId: draft.uiId,
        displayName: draft.displayName,
        ...actual,
        resolvedOffering: auditSnapshot(projectOffering(adapted.offering)),
        resolvedResource: null,
      };
    }

    const reasonCodes =
      resolution.status === "conditional"
        ? [...normalizeConditionalReasonCodes(resolution.reasonCodes)]
        : [];
    const actual = {
      status: resolution.status,
      routeIdentity,
      reasonCodes,
      fieldErrors: {},
    };
    assertDiagnosticParity(diagnostic, actual);
    return {
      uiId: draft.uiId,
      displayName: draft.displayName,
      status: resolution.status,
      ...projectBestFitExportRoute(routeIdentity),
      reasonCodes,
      fieldErrors: {},
      resolvedOffering: auditSnapshot(projectOffering(adapted.offering)),
      resolvedResource:
        resolution.resource === null
          ? null
          : auditSnapshot(projectSubscriptionResource(resolution.resource)),
    };
  });
}

function projectApiCatalogAudit() {
  return [...resolveAllApiCatalogEntries()]
    .sort((left, right) =>
      compareRouteIdentities(left.routeIdentity, right.routeIdentity),
    )
    .map((entry) => {
      const { evidence, ...officialPrice } = entry.standardTextPrice;
      return {
        ...projectBestFitExportRoute(entry.routeIdentity),
        legacyReference: {
          providerId: entry.legacyReference.providerId,
          tier: entry.legacyReference.tier,
        },
        planningTier: entry.planningTier,
        providerDisplayName: entry.providerDisplayName,
        productFamily: entry.productFamily,
        pricingSource: entry.pricingSource,
        modelsSource: entry.modelsSource,
        verifiedAt: entry.verifiedAt,
        resolvedModel: auditSnapshot(projectModel(entry.model)),
        resolvedOffering: auditSnapshot(projectOffering(entry.offering)),
        officialStandardTextPrice: {
          inputUsdPerMillion: officialPrice.inputUsdPerMillion,
          outputUsdPerMillion: officialPrice.outputUsdPerMillion,
          ...(officialPrice.preview === undefined
            ? {}
            : { preview: officialPrice.preview }),
          ...(officialPrice.effectiveThrough === undefined
            ? {}
            : { effectiveThrough: officialPrice.effectiveThrough }),
          ...(officialPrice.priceAfterEffectiveThrough === undefined
            ? {}
            : {
                priceAfterEffectiveThrough: {
                  inputUsdPerMillion:
                    officialPrice.priceAfterEffectiveThrough
                      .inputUsdPerMillion,
                  outputUsdPerMillion:
                    officialPrice.priceAfterEffectiveThrough
                      .outputUsdPerMillion,
                  effectiveFrom:
                    officialPrice.priceAfterEffectiveThrough.effectiveFrom,
                },
              }),
          ...(officialPrice.standardPriceInputLimitTokens === undefined
            ? {}
            : {
                standardPriceInputLimitTokens:
                  officialPrice.standardPriceInputLimitTokens,
              }),
          ...(officialPrice.excludedLongContextPrice === undefined
            ? {}
            : {
                excludedLongContextPrice: {
                  inputUsdPerMillion:
                    officialPrice.excludedLongContextPrice.inputUsdPerMillion,
                  outputUsdPerMillion:
                    officialPrice.excludedLongContextPrice.outputUsdPerMillion,
                },
              }),
          basis: officialPrice.basis,
          exclusions: [...officialPrice.exclusions],
          evidence: auditSnapshot(projectEvidence(evidence)),
        },
      };
    });
}

function projectResult(context: BestFitPlanExportContext) {
  const { plan } = context.uiPlan;
  return {
    expectedWithinBudget: plan.expectedWithinBudget,
    highExceedsBudget: plan.highExceedsBudget,
    activeTaskCount: plan.activeTaskCount,
    heldTaskCount: plan.heldTaskCount,
    infeasibleTaskCount: plan.infeasibleTaskCount,
    reservationOrderTaskIds: [...plan.reservationOrderTaskIds],
    reliefOrderTaskIds: [...plan.reliefOrderTaskIds],
    cash: {
      lowMicroUsd: plan.cash.lowMicroUsd,
      expectedMicroUsd: plan.cash.expectedMicroUsd,
      highMicroUsd: plan.cash.highMicroUsd,
      apiMicroUsd: projectScenario(plan.cash.apiMicroUsd),
      subscriptionFeeMicroUsd: plan.cash.subscriptionFeeMicroUsd,
      paidOverageMicroUsd: projectScenario(plan.cash.paidOverageMicroUsd),
      scenarioOverflow: {
        low: plan.cash.scenarioOverflow.low,
        expected: plan.cash.scenarioOverflow.expected,
        high: plan.cash.scenarioOverflow.high,
      },
    },
    tasks: plan.tasks.map(projectResultTask),
    activatedSubscriptionRoutes: [...plan.activatedSubscriptionRoutes]
      .sort(compareRouteIdentities)
      .map(projectBestFitExportRoute),
    subscriptionUsageLedgers: [...plan.subscriptionUsageLedgers]
      .sort((left, right) =>
        compareRouteIdentities(left.routeIdentity, right.routeIdentity),
      )
      .map((ledger) => ({
        ...projectBestFitExportRoute(ledger.routeIdentity),
        ownership: ledger.ownership,
        quotaUnit: ledger.quotaUnit,
        taskIds: [...ledger.taskIds],
        availableMicrounits: ledger.availableMicrounits,
        scenarios: {
          low: { ...ledger.scenarios.low },
          expected: { ...ledger.scenarios.expected },
          high: { ...ledger.scenarios.high },
        },
      })),
    premiumBaseline:
      plan.premiumBaseline === null
        ? null
        : plan.premiumBaseline.map((task) => ({
            taskId: task.taskId,
            ...projectBestFitExportRoute(task.routeIdentity),
            expectedCashMicroUsd: task.expectedCashMicroUsd,
          })),
    spendComparison:
      plan.spendComparison === null ? null : { ...plan.spendComparison },
  };
}

export function createBestFitPlanExportDocument(
  context: BestFitPlanExportContext,
  exportedAt = new Date().toISOString(),
) {
  assertIsoDateTime(exportedAt, "Best-fit exportedAt");
  assertIsoDateTime(context.generatedAt, "Best-fit generatedAt");
  assertContextIdentity(context);
  assertPlanArithmetic(context);
  const sourceState = canonicalizeSourceState(context.sourceState);
  const candidateSets = context.uiPlan.candidateSets.map(projectCandidateSet);

  return {
    schemaVersion: BEST_FIT_PLAN_JSON_SCHEMA_VERSION,
    resultKind: BEST_FIT_PLAN_RESULT_KIND,
    exportedAt,
    product: "Frontier Workload Planner",
    claim:
      "Deterministic Best-fit route plan; derived results are not import authority.",
    analysis: {
      contractVersion: "best-fit-analysis-v2" as const,
      compatibility: "best-fit" as const,
      mode: context.analysisMode,
      model: context.analysisModel,
      generatedAt: context.generatedAt,
    },
    calculation: {
      contractVersion: context.uiPlan.plan.contractVersion,
      strategy: context.uiPlan.plan.strategy,
      planningAsOf: context.uiPlan.plan.planningAsOf,
      pricingAsOf: context.uiPlan.plan.pricingAsOf,
      allocationMethod: context.uiPlan.plan.allocationMethod,
    },
    input: {
      tasks: context.sourceTasks.map(projectSourceTask),
      strategy: context.uiPlan.plan.strategy,
      incrementalCashBudgetMicroUsd:
        context.uiPlan.plan.incrementalCashBudgetMicroUsd,
      sourceState,
    },
    result: projectResult(context),
    audit: {
      purpose: "audit-only" as const,
      importAuthority: false as const,
      importRule: "re-resolve-from-input-source-state" as const,
      taskCandidateResolutions: candidateSets,
      resourceResolutions: projectResourceAudits(
        sourceState,
        context.uiPlan.plan.planningAsOf,
        context.uiPlan.resourceDiagnostics,
      ),
      apiCatalogResolutions: projectApiCatalogAudit(),
    },
  };
}

export type BestFitPlanExportDocument = ReturnType<
  typeof createBestFitPlanExportDocument
>;

export function createBestFitPlanJson(
  context: BestFitPlanExportContext,
  exportedAt = new Date().toISOString(),
): string {
  return JSON.stringify(
    createBestFitPlanExportDocument(context, exportedAt),
    null,
    2,
  );
}

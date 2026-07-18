import { describe, expect, it } from "vitest";

import { API_CATALOG_REGISTRY_VERSION } from "@/config/versioned-provider-registry";
import {
  createMockAnalysis,
  MOCK_BATCH_TASK_ANALYSIS_FIXTURE,
} from "@/lib/ai/mock-response";
import { evaluateApiOfferingCost } from "@/lib/calculation/evaluate-api-offering";
import {
  BEST_FIT_PLAN_JSON_SCHEMA_VERSION,
  createBestFitPlanExportDocument,
  createBestFitPlanJson,
  projectBestFitExportRoute,
  type BestFitPlanExportContext,
  type BestFitPlanExportDocument,
} from "@/lib/export/best-fit";
import {
  createBestFitPlanMarkdown,
  createBestFitPlanMarkdownFromDocument,
} from "@/lib/export/best-fit-markdown";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import {
  LEGACY_PLAN_JSON_SCHEMA_VERSION,
  PLAN_JSON_SCHEMA_VERSION,
} from "@/lib/export/json";
import { catalogOverrideTargetFor } from "@/lib/offerings/catalog-overrides";
import {
  catalogClaimExpectation,
  isResolverIssuedEvidence,
  parseStoredEvidenceInput,
  resolveStoredEvidence,
} from "@/lib/offerings/evidence-resolver";
import { registeredAccessProviderId } from "@/lib/offerings/route-identity";
import { resolveAllApiCatalogEntries } from "@/lib/offerings/provider-catalog-adapter";
import { allocateNormalizedBestFitPlan } from "@/lib/planning/best-fit-allocator";
import {
  buildBestFitUiPlan,
  type BestFitUiPlan,
} from "@/lib/planning/best-fit-ui-plan";
import {
  adaptAvailableAiResourceDraft,
  createAvailableAiResourceEvidenceObservedAt,
  createDefaultAvailableAiResourceDraft,
} from "@/lib/planning/resource-drafts";
import {
  requiredSurfaceForWorkMode,
  supportsRequiredWorkSurface,
} from "@/lib/planning/workload-requirements";
import {
  bestFitSourceStateSchema,
  createEmptyBestFitSourceState,
  createBestFitSourceState,
  type BestFitSourceState,
} from "@/lib/storage/best-fit-sources";
import type {
  BestFitApiRouteCandidate,
  BestFitConfirmedRouteCandidate,
  BestFitScenarioMicroUsd,
  BestFitSubscriptionResourceProfile,
  BestFitSubscriptionRouteCandidate,
} from "@/types/best-fit";
import type { TaskAnalysis, TaskInput } from "@/types/domain";
import type {
  ConditionalAlternative,
  SubscriptionRouteIdentity,
} from "@/types/offerings";
import type { ApiCatalogOverride } from "@/types/pricing";

const EXPORTED_AT = "2026-07-18T13:00:00.000Z";
const PLANNING_AS_OF = "2026-07-18T12:00:00.000Z";
const PRICING_AS_OF = "2026-07-18";
const openai = registeredAccessProviderId("openai");

function scenario(
  low: number,
  expected = low,
  high = expected,
): BestFitScenarioMicroUsd {
  return { low, expected, high };
}

function apiRoute(
  offeringId: string,
  qualityTier: "economy" | "balanced" | "premium",
  cash: BestFitScenarioMicroUsd,
): BestFitApiRouteCandidate {
  return {
    mode: "api",
    routeIdentity: { providerId: openai, offeringId, resourceId: null },
    qualityTier,
    modelId: `model.${offeringId}`,
    variableCashMicroUsd: cash,
  };
}

function subscriptionRoute(
  resource: BestFitSubscriptionResourceProfile,
  demand: BestFitScenarioMicroUsd,
): BestFitSubscriptionRouteCandidate {
  return {
    mode: "subscription",
    routeIdentity: resource.routeIdentity,
    qualityTier: "economy",
    modelId: "model.subscription.fixture",
    resource,
    demandMicrounits: { unit: resource.quotaUnit, ...demand },
  };
}

function task(
  id: string,
  name: string,
  patch: Partial<TaskInput> = {},
): TaskInput {
  return {
    id,
    name,
    description: `Source description for ${id}`,
    priority: "medium",
    deadlineDate: null,
    failureImpact: "medium",
    ...patch,
  };
}

function analysis(
  source: TaskInput,
  patch: Partial<TaskAnalysis> = {},
): TaskAnalysis {
  return {
    ...createMockAnalysis([source]).tasks[0],
    taskId: source.id,
    requiredQualityTier: "economy",
    upgradeConditions: [],
    ...patch,
  };
}

function buildFixtureContext(): BestFitPlanExportContext {
  const sourceTasks = [
    task("task-api", "API | 설계\\검토", {
      description: "설명 | path\\name\nsecond line",
      priority: "high",
      deadlineDate: "2026-07-21",
      failureImpact: "high",
    }),
    task("task-subscription", "구독 한도 작업"),
  ];
  const analyses = sourceTasks.map((source) => analysis(source));
  const draft = {
    ...createDefaultAvailableAiResourceDraft({
      uiId: "resource-1",
      presetId: "chatgpt-like-variable",
    }),
    displayName: "Chat 구독 | 개인",
    ownership: "candidate-new" as const,
    surface: "chat" as const,
    feeUsd: "0",
    quota: {
      kind: "opaque" as const,
      description: "Usage-dependent private limit",
    },
  };
  const evidenceObservedAt = createAvailableAiResourceEvidenceObservedAt(
    PLANNING_AS_OF,
  );
  const adapted = adaptAvailableAiResourceDraft(draft, {
    evidenceObservedAt,
  });
  if (!adapted.success) throw new Error("Best-fit export fixture draft is invalid.");
  const subscriptionIdentity: SubscriptionRouteIdentity = {
    providerId: openai,
    offeringId: adapted.resourceInput.offeringRef.offeringId,
    resourceId: adapted.resourceInput.id,
  };

  const economyApi = apiRoute(
    "api.openai.a-economy.standard-text",
    "economy",
    scenario(2_000_000, 3_000_000, 4_000_000),
  );
  const premiumApiOne = apiRoute(
    "api.openai.z-premium-one.standard-text",
    "premium",
    scenario(10_000_000, 12_000_000, 15_000_000),
  );
  const premiumApiTwo = apiRoute(
    "api.openai.z-premium-two.standard-text",
    "premium",
    scenario(12_000_000, 15_000_000, 18_000_000),
  );
  const subscriptionResource: BestFitSubscriptionResourceProfile = {
    routeIdentity: subscriptionIdentity,
    ownership: "candidate-new",
    quotaUnit: "credit",
    availableMicrounits: 1_000_000,
    fullPlanPeriodFeeMicroUsd: 0,
    overage: {
      rateUsdPerUnit: { coefficient: "1", decimalScale: 0 },
      maxOverageMicrounits: null,
    },
  };
  const ownedSubscription = subscriptionRoute(
    subscriptionResource,
    scenario(1_000_000, 2_000_000, 3_000_000),
  );
  const fallbackIdentity = economyApi.routeIdentity;
  const rawConditionalAlternative: ConditionalAlternative = {
    routeIdentity: subscriptionIdentity,
    reasonCodes: [
      "quota-opaque",
      "catalog-reference-unresolved",
      "quota-opaque",
    ],
    fallbackRouteIdentity: fallbackIdentity,
  };
  const auditOnlyConditionalAlternative: ConditionalAlternative = {
    routeIdentity: {
      providerId: openai,
      offeringId: "subscription.openai.zzzz-audit-only-conditional",
      resourceId: "resource.openai.zzzz-audit-only-conditional",
    },
    reasonCodes: ["profile-unverified"],
    fallbackRouteIdentity: fallbackIdentity,
  };

  const candidateSets = [
    {
      task: sourceTasks[0],
      analysis: analyses[0],
      originalIndex: 0,
      confirmedRoutes: [premiumApiOne, economyApi] as readonly BestFitConfirmedRouteCandidate[],
      conditionalAlternatives: [
        rawConditionalAlternative,
        auditOnlyConditionalAlternative,
      ],
      excludedRoutes: [
        {
          routeIdentity: subscriptionIdentity,
          status: "conditional" as const,
          reasonCodes: [
            "quota-opaque" as const,
            "catalog-reference-unresolved" as const,
            "quota-opaque" as const,
          ],
        },
      ],
    },
    {
      task: sourceTasks[1],
      analysis: analyses[1],
      originalIndex: 1,
      confirmedRoutes: [premiumApiTwo, ownedSubscription] as readonly BestFitConfirmedRouteCandidate[],
      conditionalAlternatives: [],
      excludedRoutes: [],
    },
  ];
  const allocated = allocateNormalizedBestFitPlan({
    tasks: candidateSets,
    strategy: "cost-saver",
    planningAsOf: PLANNING_AS_OF,
    pricingAsOf: PRICING_AS_OF,
    incrementalCashBudgetMicroUsd: 50_000_000,
  });
  const plan = {
    ...allocated,
    tasks: allocated.tasks.map((result, index) =>
      index === 0
        ? { ...result, conditionalAlternatives: [rawConditionalAlternative] }
        : result,
    ),
  };

  const apiOverrides: ApiCatalogOverride[] = [
    {
      kind: "api-catalog-override",
      provenance: "user-supplied",
      target: catalogOverrideTargetFor("google", "balanced"),
      effectiveFrom: PRICING_AS_OF,
      recordedAt: PLANNING_AS_OF,
      standardTextPrice: {
        inputUsdPerMillion: 3,
        outputUsdPerMillion: 18,
      },
    },
    {
      kind: "api-catalog-override",
      provenance: "user-supplied",
      target: catalogOverrideTargetFor("openai", "economy"),
      effectiveFrom: PRICING_AS_OF,
      recordedAt: PLANNING_AS_OF,
      planningTier: "premium",
    },
  ];
  const sourceState = createBestFitSourceState({
    resourceDrafts: [draft],
    resourceEvidenceObservedAtById: { "resource-1": evidenceObservedAt },
    apiOverrides,
  });
  if (sourceState === null) throw new Error("Best-fit export fixture source is invalid.");
  const diagnosticPlan = buildBestFitUiPlan({
    tasks: sourceTasks,
    analyses,
    strategy: "cost-saver",
    incrementalCashBudgetUsd: 50,
    planningAsOf: PLANNING_AS_OF,
    pricingAsOf: PRICING_AS_OF,
    resourceDrafts: [draft],
    resourceEvidenceObservedAtById: { "resource-1": evidenceObservedAt },
    apiOverrides,
  });
  const uiPlan: BestFitUiPlan = {
    plan,
    candidateSets,
    resourceDiagnostics: diagnosticPlan.resourceDiagnostics,
  };

  return {
    sourceTasks,
    uiPlan,
    sourceState,
    analysisMode: "mock",
    analysisModel: "mock-fixture-v2",
    generatedAt: PLANNING_AS_OF,
  };
}

function buildOverflowContext(): BestFitPlanExportContext {
  const sourceTasks = [
    task("task-overflow-subscription", "Overflow subscription"),
    task("task-overflow-api", "Overflow API"),
  ];
  const analyses = sourceTasks.map((source) => analysis(source));
  const routeIdentity: SubscriptionRouteIdentity = {
    providerId: openai,
    offeringId: "subscription.openai.overflow",
    resourceId: "resource.openai.overflow-0001",
  };
  const candidateSubscription = subscriptionRoute(
    {
      routeIdentity,
      ownership: "candidate-new",
      quotaUnit: "credit",
      availableMicrounits: 1_000_000,
      fullPlanPeriodFeeMicroUsd: 1,
      overage: null,
    },
    scenario(1),
  );
  const saturatedApi = apiRoute(
    "api.openai.overflow.standard-text",
    "economy",
    scenario(1, 1, Number.MAX_SAFE_INTEGER),
  );
  const candidateSets: BestFitUiPlan["candidateSets"] = [
    {
      task: sourceTasks[0],
      analysis: analyses[0],
      originalIndex: 0,
      confirmedRoutes: [candidateSubscription],
      conditionalAlternatives: [],
      excludedRoutes: [],
    },
    {
      task: sourceTasks[1],
      analysis: analyses[1],
      originalIndex: 1,
      confirmedRoutes: [saturatedApi],
      conditionalAlternatives: [],
      excludedRoutes: [],
    },
  ];
  const plan = allocateNormalizedBestFitPlan({
    tasks: candidateSets,
    strategy: "cost-saver",
    planningAsOf: PLANNING_AS_OF,
    pricingAsOf: PRICING_AS_OF,
    incrementalCashBudgetMicroUsd: 100,
  });

  return {
    sourceTasks,
    uiPlan: { plan, candidateSets, resourceDiagnostics: [] },
    sourceState: createEmptyBestFitSourceState(),
    analysisMode: "mock",
    analysisModel: "mock-fixture-v2",
    generatedAt: PLANNING_AS_OF,
  };
}

function expectRouteProjection(
  routeIdentity: {
    providerId: string;
    offeringId: string;
    resourceId: string | null;
  },
  routeKey: readonly [string, string, string | null],
): void {
  expect(routeKey).toEqual([
    routeIdentity.providerId,
    routeIdentity.offeringId,
    routeIdentity.resourceId,
  ]);
}

function collectRouteKeys(document: BestFitPlanExportDocument): Array<
  readonly [string, string, string | null]
> {
  const keys: Array<readonly [string, string, string | null]> = [];
  const add = (
    identity: {
      providerId: string;
      offeringId: string;
      resourceId: string | null;
    },
    key: readonly [string, string, string | null],
  ) => {
    expectRouteProjection(identity, key);
    keys.push(key);
  };

  document.result.tasks.forEach((taskResult) => {
    if (taskResult.routeIdentity !== null && taskResult.routeKey !== null) {
      add(taskResult.routeIdentity, taskResult.routeKey);
    }
    if (
      taskResult.alternativeRouteIdentity !== null &&
      taskResult.alternativeRouteKey !== null
    ) {
      add(taskResult.alternativeRouteIdentity, taskResult.alternativeRouteKey);
    }
    taskResult.conditionalAlternatives.forEach((alternative) => {
      add(alternative.routeIdentity, alternative.routeKey);
      add(alternative.fallbackRouteIdentity, alternative.fallbackRouteKey);
    });
  });
  document.result.activatedSubscriptionRoutes.forEach((route) =>
    add(route.routeIdentity, route.routeKey),
  );
  document.result.subscriptionUsageLedgers.forEach((ledger) =>
    add(ledger.routeIdentity, ledger.routeKey),
  );
  document.result.premiumBaseline?.forEach((baseline) =>
    add(baseline.routeIdentity, baseline.routeKey),
  );
  document.audit.taskCandidateResolutions.forEach((candidateSet) => {
    candidateSet.confirmedRoutes.forEach((route) => {
      add(route.routeIdentity, route.routeKey);
      if (route.resource !== null) {
        add(route.resource.routeIdentity, route.resource.routeKey);
      }
    });
    candidateSet.conditionalAlternatives.forEach((alternative) => {
      add(alternative.routeIdentity, alternative.routeKey);
      add(alternative.fallbackRouteIdentity, alternative.fallbackRouteKey);
    });
    candidateSet.excludedRoutes.forEach((route) =>
      add(route.routeIdentity, route.routeKey),
    );
  });
  document.audit.resourceResolutions.forEach((resource) => {
    if (
      "routeKey" in resource &&
      resource.routeIdentity !== null &&
      resource.routeKey !== null
    ) {
      add(resource.routeIdentity, resource.routeKey);
    }
  });
  document.audit.apiCatalogResolutions.forEach((route) =>
    add(route.routeIdentity, route.routeKey),
  );
  return keys;
}

describe("Checkpoint 8 Best-fit v5 export", () => {
  it("adds a separate v5 result contract without changing historical v3/v4 versions", () => {
    const context = buildFixtureContext();
    const document = createBestFitPlanExportDocument(context, EXPORTED_AT);
    const parsed = JSON.parse(createBestFitPlanJson(context, EXPORTED_AT));

    expect(LEGACY_PLAN_JSON_SCHEMA_VERSION).toBe(3);
    expect(PLAN_JSON_SCHEMA_VERSION).toBe(4);
    expect(BEST_FIT_PLAN_JSON_SCHEMA_VERSION).toBe(5);
    expect(document).toMatchObject({
      schemaVersion: 5,
      resultKind: "best-fit-route-plan",
      exportedAt: EXPORTED_AT,
      analysis: {
        contractVersion: "best-fit-analysis-v2",
        compatibility: "best-fit",
        mode: "mock",
        model: "mock-fixture-v2",
      },
      calculation: {
        contractVersion: "best-fit-plan-v1",
        planningAsOf: PLANNING_AS_OF,
        pricingAsOf: PRICING_AS_OF,
      },
    });
    expect(parsed).toEqual(document);
  });

  it("uses one canonical projector for task, fallback, resource, ledger, and baseline routes", () => {
    const document = createBestFitPlanExportDocument(
      buildFixtureContext(),
      EXPORTED_AT,
    );
    const markdown = createBestFitPlanMarkdownFromDocument(document, "en");
    const keys = collectRouteKeys(document);

    expect(keys.length).toBeGreaterThan(20);
    keys.forEach((key) => expect(markdown).toContain(JSON.stringify(key)));
    expect(document.result.activatedSubscriptionRoutes).toHaveLength(1);
    const subscription = document.result.activatedSubscriptionRoutes[0];
    expect(subscription).toBeDefined();
    if (subscription === undefined) return;
    expect(subscription.routeIdentity.resourceId).not.toBeNull();
    expect(markdown).toContain(JSON.stringify(subscription.routeKey));
    const api = document.result.tasks.find(({ taskId }) => taskId === "task-api");
    expect(api?.routeIdentity?.resourceId).toBeNull();
    expect(
      projectBestFitExportRoute({
        providerId: openai,
        offeringId: "api.openai.unit-test",
        resourceId: null,
      }),
    ).toEqual({
      routeIdentity: {
        providerId: "openai",
        offeringId: "api.openai.unit-test",
        resourceId: null,
      },
      routeKey: ["openai", "api.openai.unit-test", null],
    });
  });

  it("normalizes conditional reasons and alternatives identically in result, audit, JSON, and Markdown", () => {
    const context = buildFixtureContext();
    const document = createBestFitPlanExportDocument(context, EXPORTED_AT);
    const json = createBestFitPlanJson(context, EXPORTED_AT);
    const markdown = createBestFitPlanMarkdownFromDocument(document, "ko");
    const expectedReasons = [
      "catalog-reference-unresolved",
      "quota-opaque",
    ];
    const taskAlternative = document.result.tasks[0]?.conditionalAlternatives[0];
    const auditAlternatives =
      document.audit.taskCandidateResolutions[0]?.conditionalAlternatives ?? [];
    const auditAlternative = auditAlternatives[0];
    const excluded =
      document.audit.taskCandidateResolutions[0]?.excludedRoutes[0];

    expect(taskAlternative?.reasonCodes).toEqual(expectedReasons);
    expect(auditAlternative?.reasonCodes).toEqual(expectedReasons);
    expect(document.result.tasks[0]?.conditionalAlternatives).toHaveLength(1);
    expect(auditAlternatives).toHaveLength(2);
    expect(auditAlternatives[1]?.reasonCodes).toEqual(["profile-unverified"]);
    expect(excluded?.reasonCodes).toEqual(expectedReasons);
    expect(JSON.parse(json).result.tasks[0].conditionalAlternatives[0].reasonCodes).toEqual(
      expectedReasons,
    );
    expect(markdown).toContain(
      "`catalog-reference-unresolved` → `quota-opaque`",
    );
    const auditHeading = markdown.indexOf("### 작업 후보 해결");
    const firstAuditKey = JSON.stringify(auditAlternatives[0]?.routeKey);
    const secondAuditKey = JSON.stringify(auditAlternatives[1]?.routeKey);
    expect(auditHeading).toBeGreaterThan(-1);
    expect(markdown.indexOf(firstAuditKey, auditHeading)).toBeGreaterThan(
      auditHeading,
    );
    expect(markdown.indexOf(secondAuditKey, auditHeading)).toBeGreaterThan(
      markdown.indexOf(firstAuditKey, auditHeading),
    );
  });

  it("exports exact scenario cash, paid overage, ledgers, and a signed Premium comparison", () => {
    const document = createBestFitPlanExportDocument(
      buildFixtureContext(),
      EXPORTED_AT,
    );

    expect(document.result.cash).toMatchObject({
      lowMicroUsd: 2_000_000,
      expectedMicroUsd: 4_000_000,
      highMicroUsd: 6_000_000,
      apiMicroUsd: scenario(2_000_000, 3_000_000, 4_000_000),
      subscriptionFeeMicroUsd: 0,
      paidOverageMicroUsd: scenario(0, 1_000_000, 2_000_000),
    });
    expect(document.result.subscriptionUsageLedgers[0]).toMatchObject({
      quotaUnit: "credit",
      availableMicrounits: 1_000_000,
      scenarios: {
        expected: {
          includedUsedMicrounits: 1_000_000,
          overageUsedMicrounits: 1_000_000,
          totalDemandMicrounits: 2_000_000,
        },
      },
    });
    const spend = document.result.spendComparison;
    expect(spend).not.toBeNull();
    if (spend === null) return;
    expect(spend.differenceMicroUsd).toBe(
      spend.premiumBaselineExpectedMicroUsd -
        spend.selectedExpectedIncrementalCashMicroUsd,
    );
    expect(spend.avoidedSpendMicroUsd).toBe(spend.differenceMicroUsd);
    expect(spend.additionalSpendMicroUsd).toBe(0);
    expect(createBestFitPlanMarkdownFromDocument(document, "en")).toContain(
      `+$${spend.differenceMicroUsd / 1_000_000} USD`,
    );
  });

  it("exports allocator-supported saturated scenarios and discloses them in Markdown", () => {
    const context = buildOverflowContext();
    expect(context.uiPlan.plan.cash).toMatchObject({
      highMicroUsd: Number.MAX_SAFE_INTEGER,
      apiMicroUsd: { high: Number.MAX_SAFE_INTEGER },
      subscriptionFeeMicroUsd: 1,
      scenarioOverflow: { low: false, expected: false, high: true },
    });

    const document = createBestFitPlanExportDocument(context, EXPORTED_AT);
    expect(JSON.parse(createBestFitPlanJson(context, EXPORTED_AT))).toEqual(
      document,
    );
    expect(createBestFitPlanMarkdownFromDocument(document, "en")).toContain(
      "Display-saturated scenarios: `high`",
    );

    expect(() =>
      createBestFitPlanExportDocument(
        {
          ...context,
          uiPlan: {
            ...context.uiPlan,
            plan: {
              ...context.uiPlan.plan,
              cash: {
                ...context.uiPlan.plan.cash,
                scenarioOverflow: { low: false, expected: false, high: false },
              },
            },
          },
        },
        EXPORTED_AT,
      ),
    ).toThrow(/cash components/);
  });

  it("keeps only strict raw source state in input and resolver output under audit-only", () => {
    const document = createBestFitPlanExportDocument(
      buildFixtureContext(),
      EXPORTED_AT,
    );
    const sourceJson = JSON.stringify(document.input.sourceState);
    const resourceAudit = document.audit.resourceResolutions[0];

    expect(bestFitSourceStateSchema.safeParse(document.input.sourceState).success).toBe(
      true,
    );
    expect(sourceJson).not.toContain("provider-published");
    expect(sourceJson).not.toContain("resolvedResource");
    expect(sourceJson).not.toContain("importAuthority");
    expect(document.input.sourceState.apiCatalogOverrides.overrides).toHaveLength(2);
    expect(document.audit).toMatchObject({
      purpose: "audit-only",
      importAuthority: false,
      importRule: "re-resolve-from-input-source-state",
    });
    expect(resourceAudit).toMatchObject({
      uiId: "resource-1",
      status: "conditional",
      resolvedOffering: { purpose: "audit-only", importAuthority: false },
      resolvedResource: { purpose: "audit-only", importAuthority: false },
    });
    expect(JSON.stringify(resourceAudit)).toContain("commitment");
    expect(JSON.stringify(resourceAudit)).toContain("quota");
    expect(JSON.stringify(resourceAudit)).toContain("reset");
    expect(JSON.stringify(resourceAudit)).toContain("overage");

    const resourceValue = resourceAudit?.resolvedResource?.value;
    const offeringValue = resourceAudit?.resolvedOffering?.value;
    const catalogAudit = document.audit.apiCatalogResolutions[0];
    if (
      typeof resourceValue !== "object" ||
      resourceValue === null ||
      Array.isArray(resourceValue) ||
      typeof offeringValue !== "object" ||
      offeringValue === null ||
      Array.isArray(offeringValue) ||
      catalogAudit === undefined ||
      typeof catalogAudit.resolvedModel.value !== "object" ||
      catalogAudit.resolvedModel.value === null ||
      Array.isArray(catalogAudit.resolvedModel.value)
    ) {
      throw new Error("Audit allowlist fixtures must project objects.");
    }
    expect(Object.keys(resourceValue).sort()).toEqual([
      "availability",
      "commitment",
      "contractVersion",
      "id",
      "offeringRef",
      "overage",
      "ownership",
      "quota",
      "reset",
    ]);
    expect(Object.keys(offeringValue).sort()).toEqual([
      "eligibility",
      "evidence",
      "id",
      "kind",
      "mode",
      "providerId",
      "supportedSurfaces",
    ]);
    expect(Object.keys(catalogAudit.resolvedModel.value).sort()).toEqual([
      "capabilityProfile",
      "displayName",
      "evidence",
      "family",
      "id",
      "invocationLimits",
      "modelProviderId",
      "qualityTier",
      "registryReference",
    ]);
    expect(JSON.stringify(document.audit)).not.toContain("connectorReceipt");
    expect(JSON.stringify(document.audit)).not.toContain("futureSecret");
  });

  it("exports an unresolved preset as a recoverable conditional source without stale snapshots", () => {
    const context = buildFixtureContext();
    const sourceState = structuredClone(context.sourceState);
    const draft = sourceState.availableAiResources.drafts[0];
    if (!draft) throw new Error("Preset recovery export fixture is missing.");
    draft.preset.id = "retired-preset";
    draft.preset.version = "subscription-presets-v0";

    const diagnostics = buildBestFitUiPlan({
      tasks: context.sourceTasks,
      analyses: context.uiPlan.candidateSets.map(({ analysis }) => analysis),
      strategy: context.uiPlan.plan.strategy,
      incrementalCashBudgetUsd:
        context.uiPlan.plan.incrementalCashBudgetMicroUsd / 1_000_000,
      planningAsOf: context.uiPlan.plan.planningAsOf,
      pricingAsOf: context.uiPlan.plan.pricingAsOf,
      resourceDrafts: sourceState.availableAiResources.drafts,
      resourceEvidenceObservedAtById:
        sourceState.availableAiResources.evidenceObservedAtById,
      apiOverrides: sourceState.apiCatalogOverrides.overrides,
    }).resourceDiagnostics;
    const document = createBestFitPlanExportDocument(
      {
        ...context,
        sourceState,
        uiPlan: { ...context.uiPlan, resourceDiagnostics: diagnostics },
      },
      EXPORTED_AT,
    );

    expect(document.audit.resourceResolutions[0]).toMatchObject({
      status: "conditional",
      routeIdentity: null,
      reasonCodes: ["preset-reference-unresolved"],
      fieldErrors: { "preset.id": "unknown-preset" },
      resolvedOffering: null,
      resolvedResource: null,
    });
  });

  it("cannot restore authority from exported official evidence or the audit section", () => {
    const context = buildFixtureContext();
    const document = createBestFitPlanExportDocument(context, EXPORTED_AT);
    const catalog = document.audit.apiCatalogResolutions[0];
    if (catalog === undefined) throw new Error("Missing API catalog audit fixture.");
    const evidence = catalog.officialStandardTextPrice.evidence.value;
    const expectation = catalogClaimExpectation(
      catalog.legacyReference.providerId,
      catalog.legacyReference.tier,
      "standard-text-pricing",
      API_CATALOG_REGISTRY_VERSION,
    );

    expect(document.audit.importAuthority).toBe(false);
    expect(isResolverIssuedEvidence(evidence)).toBe(false);
    expect(parseStoredEvidenceInput(evidence)).toEqual({
      success: false,
      reason: "invalid-evidence-input",
    });
    expect(resolveStoredEvidence(evidence, expectation)).toEqual({
      status: "conditional",
      reasonCode: "evidence-authority-invalid",
    });
    expect(bestFitSourceStateSchema.safeParse(document.audit).success).toBe(false);

    const forgedSource = {
      ...context.sourceState,
      resolvedEvidence: evidence,
    } as unknown as BestFitSourceState;
    expect(() =>
      createBestFitPlanExportDocument(
        { ...context, sourceState: forgedSource },
        EXPORTED_AT,
      ),
    ).toThrow();
  });

  it("is byte-deterministic across equivalent source and candidate insertion orders", () => {
    const context = buildFixtureContext();
    const reversed: BestFitPlanExportContext = {
      ...context,
      sourceState: {
        ...context.sourceState,
        apiCatalogOverrides: {
          ...context.sourceState.apiCatalogOverrides,
          overrides: [...context.sourceState.apiCatalogOverrides.overrides].reverse(),
        },
      },
      uiPlan: {
        ...context.uiPlan,
        candidateSets: context.uiPlan.candidateSets.map((candidateSet) => ({
          ...candidateSet,
          confirmedRoutes: [...candidateSet.confirmedRoutes].reverse(),
          excludedRoutes: [...candidateSet.excludedRoutes].reverse(),
        })),
      },
    };

    expect(createBestFitPlanJson(reversed, EXPORTED_AT)).toBe(
      createBestFitPlanJson(context, EXPORTED_AT),
    );
    expect(createBestFitPlanMarkdown(reversed, "ja", EXPORTED_AT)).toBe(
      createBestFitPlanMarkdown(context, "ja", EXPORTED_AT),
    );
  });

  it("localizes Korean, English, and Japanese labels without changing route keys or user text", () => {
    const context = buildFixtureContext();
    const document = createBestFitPlanExportDocument(context, EXPORTED_AT);
    const routeKey = JSON.stringify(document.result.tasks[0]?.routeKey);
    const ko = createBestFitPlanMarkdownFromDocument(document, "ko");
    const en = createBestFitPlanMarkdownFromDocument(document, "en");
    const ja = createBestFitPlanMarkdownFromDocument(document, "ja");

    expect(ko).toContain("## 작업별 경로");
    expect(en).toContain("## Task routes");
    expect(ja).toContain("## タスク別ルート");
    [ko, en, ja].forEach((markdown) => {
      expect(markdown).toContain(routeKey);
      expect(markdown).toContain("API \\| 설계\\\\검토");
      expect(markdown).toContain("설명 \\| path\\\\name<br>second line");
      expect(markdown).toContain(PLANNING_AS_OF);
      expect(markdown).toContain(PRICING_AS_OF);
      expect(markdown).toContain("importAuthority: false");
    });
  });

  it("distinguishes API prices from subscription marginal attribution and localizes decision reasons", () => {
    const document = createBestFitPlanExportDocument(
      buildFixtureContext(),
      EXPORTED_AT,
    );
    const apiTask = document.result.tasks[0];
    const subscriptionTask = document.result.tasks[1];
    if (
      apiTask?.status !== "active" ||
      apiTask.routeKind !== "api" ||
      subscriptionTask?.status !== "active" ||
      subscriptionTask.routeKind === "api"
    ) {
      throw new Error("Markdown semantics fixture requires API and subscription routes.");
    }

    const cases = [
      {
        locale: "ko" as const,
        apiLabel: "API 작업 가격",
        subscriptionLabel: "구독 한계 현금 귀속액",
        marginalNotice: "독립적인 작업 가격이 아니며 계획 총계가 권위값입니다.",
        upgradeLabel: "상향 조건",
        premiumChoiceLabel: "Premium 선택",
      },
      {
        locale: "en" as const,
        apiLabel: "API task price",
        subscriptionLabel: "Subscription marginal cash attribution",
        marginalNotice: "It is not a standalone task price; plan totals are authoritative.",
        upgradeLabel: "Upgrade triggers",
        premiumChoiceLabel: "Premium choice",
      },
      {
        locale: "ja" as const,
        apiLabel: "API作業価格",
        subscriptionLabel: "サブスクリプション限界支出の帰属額",
        marginalNotice: "独立した作業価格ではなく、計画全体の合計が正式な値です。",
        upgradeLabel: "アップグレード条件",
        premiumChoiceLabel: "Premiumの選択",
      },
    ];

    cases.forEach(
      ({
        locale,
        apiLabel,
        subscriptionLabel,
        marginalNotice,
        upgradeLabel,
        premiumChoiceLabel,
      }) => {
        const markdown = createBestFitPlanMarkdownFromDocument(document, locale);
        const firstStart = markdown.indexOf("### 1.");
        const secondStart = markdown.indexOf("### 2.", firstStart);
        const taskSectionEnd = markdown.indexOf("\n## ", secondStart);
        const apiSection = markdown.slice(firstStart, secondStart);
        const subscriptionSection = markdown.slice(secondStart, taskSectionEnd);
        const uiCopy = BEST_FIT_UI_COPY[locale];

        expect(apiSection).toContain(`- ${apiLabel}:`);
        expect(apiSection).toContain(
          uiCopy.enums.whyEnough[apiTask.whyEnough],
        );
        expect(apiSection).toContain(
          uiCopy.enums.whyNotPremium[apiTask.whyNotPremium],
        );
        expect(apiSection).toContain(`- ${premiumChoiceLabel}:`);
        expect(apiSection).not.toContain(`\`${apiTask.whyEnough}\``);
        expect(apiSection).not.toContain(`\`${apiTask.whyNotPremium}\``);
        expect(apiSection).toContain(`- ${upgradeLabel}:`);
        apiTask.appliedUpgradeTriggers.forEach((trigger) => {
          expect(apiSection).toContain(uiCopy.enums.upgradeTrigger[trigger]);
        });

        expect(subscriptionSection).toContain(`- ${subscriptionLabel}:`);
        expect(subscriptionSection).toContain(marginalNotice);
        expect(subscriptionSection).not.toContain(`- ${apiLabel}:`);
      },
    );
  });

  it("executes a real Batch-work-mode fixture through a compatible standard API route", () => {
    const sourceTask = task(
      "task-batch-api",
      "Batch customer inquiry classification",
      {
        description:
          "Classify a CSV of customer inquiries as an unattended batch with structured output.",
        priority: "low",
        failureImpact: "low",
      },
    );
    const batchAnalysis: TaskAnalysis = {
      ...MOCK_BATCH_TASK_ANALYSIS_FIXTURE,
      taskId: sourceTask.id,
    };
    const entry = resolveAllApiCatalogEntries().find(
      ({ legacyReference }) =>
        legacyReference.providerId === "openai" &&
        legacyReference.tier === "economy",
    );
    if (entry === undefined) throw new Error("Batch fixture API entry is missing.");

    const evaluated = evaluateApiOfferingCost({
      providerId: entry.legacyReference.providerId,
      tier: entry.legacyReference.tier,
      analysis: batchAnalysis,
      pricingAsOf: PRICING_AS_OF,
    });
    expect(evaluated.status).toBe("priced");
    if (evaluated.status !== "priced") return;

    expect(requiredSurfaceForWorkMode(batchAnalysis.workMode)).toBe("batch");
    expect(
      supportsRequiredWorkSurface(
        batchAnalysis.workMode,
        entry.offering.supportedSurfaces,
      ),
    ).toBe(true);
    expect(evaluated.pricing).toMatchObject({
      status: "resolved",
      effectiveValue: {
        standardTextPriceSource: "verified-default",
      },
    });

    const candidateSets: BestFitUiPlan["candidateSets"] = [
      {
        task: sourceTask,
        analysis: batchAnalysis,
        originalIndex: 0,
        confirmedRoutes: [
          {
            mode: "api",
            routeIdentity: entry.routeIdentity,
            qualityTier: entry.planningTier,
            modelId: entry.model.id,
            variableCashMicroUsd: { ...evaluated.scenarioCostMicroUsd },
          },
        ],
        conditionalAlternatives: [],
        excludedRoutes: [],
      },
    ];
    const plan = allocateNormalizedBestFitPlan({
      tasks: candidateSets,
      strategy: "cost-saver",
      planningAsOf: PLANNING_AS_OF,
      pricingAsOf: PRICING_AS_OF,
      incrementalCashBudgetMicroUsd: 100_000_000,
    });
    const context: BestFitPlanExportContext = {
      sourceTasks: [sourceTask],
      uiPlan: { plan, candidateSets, resourceDiagnostics: [] },
      sourceState: createEmptyBestFitSourceState(),
      analysisMode: "mock",
      analysisModel: "mock-batch-fixture-v1",
      generatedAt: PLANNING_AS_OF,
    };

    expect(plan.tasks[0]).toMatchObject({
      status: "active",
      routeKind: "api",
      routeIdentity: entry.routeIdentity,
      variableCashMicroUsd: evaluated.scenarioCostMicroUsd,
    });

    const document = createBestFitPlanExportDocument(context, EXPORTED_AT);
    expect(document.audit.taskCandidateResolutions[0]?.analysis).toMatchObject({
      taskId: sourceTask.id,
      workMode: "batch",
      requiredCapabilities: ["structured-output"],
    });
    expect(document.result.tasks[0]).toMatchObject({
      status: "active",
      routeKind: "api",
      routeKey: projectBestFitExportRoute(entry.routeIdentity).routeKey,
    });
    const markdown = createBestFitPlanMarkdownFromDocument(document, "en");
    expect(markdown).toContain("- API task price:");
    expect(markdown).toContain("unattended batch");
    expect(markdown).not.toContain("discounted Batch");
  });

  it("rejects stale or arithmetically inconsistent result metadata", () => {
    const context = buildFixtureContext();
    const spend = context.uiPlan.plan.spendComparison;
    if (spend === null) throw new Error("Missing spend comparison fixture.");
    const inconsistent: BestFitPlanExportContext = {
      ...context,
      uiPlan: {
        ...context.uiPlan,
        plan: {
          ...context.uiPlan.plan,
          spendComparison: {
            ...spend,
            differenceMicroUsd: spend.differenceMicroUsd + 1,
          },
        },
      },
    };
    expect(() =>
      createBestFitPlanExportDocument(inconsistent, EXPORTED_AT),
    ).toThrow(/signed spend comparison/);

    expect(() =>
      createBestFitPlanExportDocument(
        { ...context, sourceTasks: [...context.sourceTasks].reverse() },
        EXPORTED_AT,
      ),
    ).toThrow(/identities differ/);
  });
});

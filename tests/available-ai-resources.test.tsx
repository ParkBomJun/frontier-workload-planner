import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AvailableAiResources } from "@/components/available-ai-resources";
import { LanguageProvider } from "@/components/language-provider";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import {
  createAvailableAiResourceEvidenceObservedAt,
  createDefaultAvailableAiResourceDraft,
} from "@/lib/planning/resource-drafts";
import { serializeSubscriptionUsageDescription } from "@/lib/subscriptions/usage-snapshot";
import type { AvailableAiResourceDraft } from "@/types/resource-drafts";

const retiredDraft: AvailableAiResourceDraft = {
  uiId: "resource-1",
  preset: { id: "retired-preset", version: "subscription-presets-v0" },
  displayName: "Saved legacy plan",
  ownership: "owned",
  availability: "uncertain",
  surface: "chat",
  feeUsd: "20",
  quota: { kind: "opaque", description: "Private capacity" },
  reset: { kind: "unknown" },
};

describe("Checkpoint 8 resource preset recovery", () => {
  it("renders an empty resource step as a compact optional selector", () => {
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(AvailableAiResources, {
          drafts: [],
          evidenceObservedAtById: {},
          disabled: false,
          onAdd: () => undefined,
          onChange: () => undefined,
          onRemove: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('id="add-resource-select"');
    expect(markup).toContain(
      BEST_FIT_UI_COPY.en.resources.presetSelectPlaceholder,
    );
    expect(markup).not.toContain("border-dashed");
  });

  it("renders a conditional relink path with current allowlisted presets", () => {
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(AvailableAiResources, {
          drafts: [retiredDraft],
          evidenceObservedAtById: {
            "resource-1": createAvailableAiResourceEvidenceObservedAt(
              "2026-07-18T12:00:00.000Z",
            ),
          },
          disabled: false,
          onAdd: () => undefined,
          onChange: () => undefined,
          onRemove: () => undefined,
        }),
      ),
    );

    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.conditionalStatus);
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.relinkTitle);
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.relinkPlaceholder);
    expect(markup).toContain("github-copilot-like-credits");
    expect(markup).toContain("claude-subscription");
    expect(markup).toContain("gemini-subscription");
    expect(markup).toContain("google-antigravity");
    expect(markup).toContain("gemini-code-assist");
    expect(markup).not.toContain("rolling-window-coding-plan");
    expect(markup).toContain("min-h-11");
  });

  it("keeps unknown quota valid in the compact single-card flow", () => {
    const draft = {
      ...createDefaultAvailableAiResourceDraft({
        uiId: "resource-2",
        presetId: "github-copilot-like-credits",
      }),
      surface: "ide-cli" as const,
      feeUsd: "10",
    };
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(AvailableAiResources, {
          drafts: [draft],
          evidenceObservedAtById: {
            "resource-2": createAvailableAiResourceEvidenceObservedAt(
              "2026-07-18T12:00:00.000Z",
            ),
          },
          disabled: false,
          onAdd: () => undefined,
          onChange: () => undefined,
          onRemove: () => undefined,
        }),
      ),
    );

    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.description);
    expect(markup).toContain(
      BEST_FIT_UI_COPY.en.resources.presetSelectPlaceholder,
    );
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.conditionalStatus);
    expect(markup).toContain(
      BEST_FIT_UI_COPY.en.resources.usageSnapshot.metricLabels
        .creditRemainingPercent,
    );
    expect(markup).not.toContain('id="resource-quota-kind-resource-2"');
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.opaqueDescriptionLabel);
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-controls="subscription-quota-guide"');
    expect(markup).toContain('id="subscription-quota-guide"');
    expect(markup).toContain(
      'aria-labelledby="subscription-quota-guide-title"',
    );
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.quotaGuide.open);
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.quotaGuide.title);
    expect(markup).toContain('href="https://github.com/settings/billing"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
    expect(markup).not.toContain("quota.included");
  });

  it("shows a separate official guide for Gemini coding tools", () => {
    const draft = createDefaultAvailableAiResourceDraft({
      uiId: "resource-4",
      presetId: "gemini-code-assist",
    });
    const guide =
      BEST_FIT_UI_COPY.en.resources.quotaGuide.presets[
        "gemini-code-assist"
      ];
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(AvailableAiResources, {
          drafts: [draft],
          evidenceObservedAtById: {
            "resource-4": createAvailableAiResourceEvidenceObservedAt(
              "2026-07-18T12:00:00.000Z",
            ),
          },
          disabled: false,
          onAdd: () => undefined,
          onChange: () => undefined,
          onRemove: () => undefined,
        }),
      ),
    );

    expect(markup).toContain(guide.title);
    guide.steps.forEach((step) => expect(markup).toContain(step));
    expect(markup).toContain(
      'href="https://developers.google.com/gemini-code-assist/resources/quotas"',
    );
    expect(markup).toContain('target="_blank"');
  });

  it("separates personal Antigravity from organization Code Assist", () => {
    const antigravity = createDefaultAvailableAiResourceDraft({
      uiId: "resource-6",
      presetId: "google-antigravity",
    });
    const codeAssist = createDefaultAvailableAiResourceDraft({
      uiId: "resource-7",
      presetId: "gemini-code-assist",
    });

    expect(antigravity).toMatchObject({
      provisionedBy: "personal",
      feeUsd: "",
    });
    expect(codeAssist).toMatchObject({
      provisionedBy: "organization",
      feeUsd: "0",
    });
    expect(
      BEST_FIT_UI_COPY.ko.resources.quotaGuide.presets["google-antigravity"]
        .title,
    ).toContain("Antigravity");
    expect(
      BEST_FIT_UI_COPY.ko.resources.quotaGuide.presets["gemini-code-assist"]
        .title,
    ).toContain("Standard / Enterprise");
  });

  it("warns when Gemini Apps and Antigravity may duplicate one new plan fee", () => {
    const gemini = {
      ...createDefaultAvailableAiResourceDraft({
        uiId: "resource-google-chat",
        presetId: "gemini-subscription",
      }),
      ownership: "candidate-new" as const,
    };
    const antigravity = {
      ...createDefaultAvailableAiResourceDraft({
        uiId: "resource-google-cli",
        presetId: "google-antigravity",
      }),
      ownership: "candidate-new" as const,
    };
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(AvailableAiResources, {
          drafts: [gemini, antigravity],
          evidenceObservedAtById: {
            "resource-google-chat":
              createAvailableAiResourceEvidenceObservedAt(
                "2026-07-19T00:00:00.000Z",
              ),
            "resource-google-cli":
              createAvailableAiResourceEvidenceObservedAt(
                "2026-07-19T00:00:00.000Z",
              ),
          },
          disabled: false,
          onAdd: () => undefined,
          onChange: () => undefined,
          onRemove: () => undefined,
        }),
      ),
    );

    expect(markup).toContain(
      BEST_FIT_UI_COPY.en.resources.sharedGooglePlanWarningTitle,
    );
    expect(markup).toContain('role="alert"');
  });

  it("keeps company availability and surface controls while hiding personal fee input", () => {
    const draft: AvailableAiResourceDraft = {
      ...createDefaultAvailableAiResourceDraft({
        uiId: "resource-5",
        presetId: "claude-subscription",
      }),
      provisionedBy: "organization",
      availability: "uncertain",
      surface: "ide-cli",
      feeUsd: "0",
    };
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(AvailableAiResources, {
          drafts: [draft],
          evidenceObservedAtById: {
            "resource-5": createAvailableAiResourceEvidenceObservedAt(
              "2026-07-18T12:00:00.000Z",
            ),
          },
          disabled: false,
          onAdd: () => undefined,
          onChange: () => undefined,
          onRemove: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('id="resource-availability-resource-5"');
    expect(markup).toContain('id="resource-surface-resource-5"');
    expect(markup).not.toContain('id="resource-fee-resource-5"');
    expect(markup).toContain(
      BEST_FIT_UI_COPY.en.resources.organizationCostTitle,
    );
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.usageSnapshot.title);
  });

  it("makes a malformed restored organization fee recoverable instead of hiding it", () => {
    const draft: AvailableAiResourceDraft = {
      ...createDefaultAvailableAiResourceDraft({
        uiId: "resource-malformed-organization",
        presetId: "claude-subscription",
      }),
      provisionedBy: "organization",
      feeUsd: "20",
    };
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(AvailableAiResources, {
          drafts: [draft],
          evidenceObservedAtById: {
            "resource-malformed-organization":
              createAvailableAiResourceEvidenceObservedAt(
                "2026-07-19T00:00:00.000Z",
              ),
          },
          disabled: false,
          onAdd: () => undefined,
          onChange: () => undefined,
          onRemove: () => undefined,
        }),
      ),
    );

    expect(markup).toContain(
      'id="resource-access-arrangement-resource-malformed-organization"',
    );
    expect(markup).toContain('<option value="" disabled="" selected="">');
    expect(markup).toContain(
      'id="resource-fee-resource-malformed-organization"',
    );
    expect(markup).not.toContain(
      BEST_FIT_UI_COPY.en.resources.organizationCostTitle,
    );
  });

  it("names the exact unfinished fields on a newly added subscription", () => {
    const draft = createDefaultAvailableAiResourceDraft({
      uiId: "resource-3",
      presetId: "chatgpt-like-variable",
    });
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(AvailableAiResources, {
          drafts: [draft],
          evidenceObservedAtById: {
            "resource-3": createAvailableAiResourceEvidenceObservedAt(
              "2026-07-18T12:00:00.000Z",
            ),
          },
          disabled: false,
          onAdd: () => undefined,
          onChange: () => undefined,
          onRemove: () => undefined,
        }),
      ),
    );

    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.fieldsToCheck);
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.surfaceLabel);
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.currentFeeLabel);
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.requirementHelp);
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.availabilityHelp);
    expect(markup).toContain(
      BEST_FIT_UI_COPY.en.enums.availability.unavailable,
    );
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.requiredField);
    expect(markup).toContain(BEST_FIT_UI_COPY.en.resources.optionalField);
    expect(markup).toContain('id="resource-card-resource-3"');
    expect(markup).toContain('id="resource-surface-resource-3" required=""');
    expect(markup).toContain('id="resource-fee-resource-3" required=""');
    expect(markup).toContain(
      BEST_FIT_UI_COPY.en.resources.usageSnapshot.metricLabels
        .fiveHourRemainingPercent,
    );
    expect(markup).not.toContain('id="resource-reset-kind-resource-3"');
    expect(markup).toContain('id="resource-quota-description-resource-3"');
  });

  it("renders independent remaining-limit sliders and their bottleneck", () => {
    const draft: AvailableAiResourceDraft = {
      ...createDefaultAvailableAiResourceDraft({
        uiId: "resource-8",
        presetId: "claude-subscription",
      }),
      surface: "chat",
      feeUsd: "20",
      quota: {
        kind: "opaque",
        description: serializeSubscriptionUsageDescription(
          {
            fiveHourRemainingPercent: 65,
            weeklyRemainingPercent: 42,
            modelWeeklyRemainingPercent: 18,
            modelLabel: "Model shown in Usage",
          },
          "Checked now.",
        ),
      },
    };
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(AvailableAiResources, {
          drafts: [draft],
          evidenceObservedAtById: {
            "resource-8": createAvailableAiResourceEvidenceObservedAt(
              "2026-07-19T00:00:00.000Z",
            ),
          },
          disabled: false,
          onAdd: () => undefined,
          onChange: () => undefined,
          onRemove: () => undefined,
        }),
      ),
    );

    expect(markup).toMatch(
      /id="resource-usage-fiveHourRemainingPercent-resource-8"[^>]*value="65"/,
    );
    expect(markup).toMatch(
      /id="resource-usage-weeklyRemainingPercent-resource-8"[^>]*value="42"/,
    );
    expect(markup).toMatch(
      /id="resource-usage-modelWeeklyRemainingPercent-resource-8"[^>]*value="18"/,
    );
    expect(markup).toContain(
      BEST_FIT_UI_COPY.en.resources.usageSnapshot.bottleneck(18),
    );
    expect(markup).toContain(
      `aria-label="${BEST_FIT_UI_COPY.en.resources.usageSnapshot.metricLabels.fiveHourRemainingPercent}: ${BEST_FIT_UI_COPY.en.resources.usageSnapshot.clear}"`,
    );
    expect(markup).toContain('value="Model shown in Usage"');
    expect(markup).toContain('value="Checked now."');
    expect(markup).not.toContain("FWP_USAGE_SNAPSHOT_V1");
  });

  it("keeps Gemini chat on the chat surface instead of claiming CLI access", () => {
    const draft = createDefaultAvailableAiResourceDraft({
      uiId: "resource-9",
      presetId: "gemini-subscription",
    });
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(AvailableAiResources, {
          drafts: [draft],
          evidenceObservedAtById: {
            "resource-9": createAvailableAiResourceEvidenceObservedAt(
              "2026-07-19T00:00:00.000Z",
            ),
          },
          disabled: false,
          onAdd: () => undefined,
          onChange: () => undefined,
          onRemove: () => undefined,
        }),
      ),
    );
    const surfaceSelect = markup.match(
      /<select id="resource-surface-resource-9"[\s\S]*?<\/select>/,
    )?.[0];

    expect(surfaceSelect).toContain('option value="chat"');
    expect(surfaceSelect).not.toContain('option value="ide-cli"');
    expect(markup).toContain(
      BEST_FIT_UI_COPY.en.resources.presets["gemini-subscription"].description,
    );
  });
});

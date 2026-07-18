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
      BEST_FIT_UI_COPY.ko.resources.presetSelectPlaceholder,
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

    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.conditionalStatus);
    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.relinkTitle);
    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.relinkPlaceholder);
    expect(markup).toContain("github-copilot-like-credits");
    expect(markup).toContain("glm-like-rolling");
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

    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.description);
    expect(markup).toContain(
      BEST_FIT_UI_COPY.ko.resources.presetSelectPlaceholder,
    );
    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.conditionalStatus);
    expect(markup).toContain('option value="opaque" selected=""');
    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.opaqueDescriptionLabel);
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-controls="subscription-quota-guide"');
    expect(markup).toContain('id="subscription-quota-guide"');
    expect(markup).toContain(
      'aria-labelledby="subscription-quota-guide-title"',
    );
    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.quotaGuide.open);
    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.quotaGuide.title);
    expect(markup).toContain('href="https://github.com/settings/billing"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
    expect(markup).not.toContain("quota.included");
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

    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.fieldsToCheck);
    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.surfaceLabel);
    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.feeLabel);
    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.requirementHelp);
    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.requiredField);
    expect(markup).toContain(BEST_FIT_UI_COPY.ko.resources.optionalField);
    expect(markup).toContain('id="resource-card-resource-3"');
    expect(markup).toContain('id="resource-surface-resource-3" required=""');
    expect(markup).toContain('id="resource-fee-resource-3" required=""');
    expect(markup).toContain('id="resource-reset-kind-resource-3" required=""');
    expect(markup).toContain('id="resource-quota-description-resource-3"');
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AvailableAiResources } from "@/components/available-ai-resources";
import { LanguageProvider } from "@/components/language-provider";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import { createAvailableAiResourceEvidenceObservedAt } from "@/lib/planning/resource-drafts";
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
});

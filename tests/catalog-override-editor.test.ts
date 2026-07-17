import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CatalogOverrideEditor,
  isImmediateOverrideDateAllowed,
  resolveCatalogOverrideEditorValues,
} from "@/components/catalog-override-editor";
import { LanguageProvider } from "@/components/language-provider";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import {
  catalogOverrideTargetFor,
  removeApiCatalogOverrideSource,
  restoreApiCatalogDefaults,
  upsertApiCatalogOverride,
} from "@/lib/offerings/catalog-overrides";
import type { ApiCatalogOverride } from "@/types/pricing";

const PRICING_AS_OF = "2026-07-18";

function unresolvedOverride(): ApiCatalogOverride {
  return {
    kind: "api-catalog-override",
    provenance: "user-supplied",
    target: {
      ...catalogOverrideTargetFor("anthropic", "balanced"),
      registryVersion: "retired-provider-registry-v0",
    },
    effectiveFrom: PRICING_AS_OF,
    recordedAt: "2026-07-18T12:00:00.000Z",
    planningTier: "premium",
  };
}

function currentOverride(): ApiCatalogOverride {
  return {
    kind: "api-catalog-override",
    provenance: "user-supplied",
    target: catalogOverrideTargetFor("openai", "economy"),
    effectiveFrom: PRICING_AS_OF,
    recordedAt: "2026-07-18T12:05:00.000Z",
    planningTier: "balanced",
    standardTextPrice: {
      inputUsdPerMillion: 1.25,
      outputUsdPerMillion: 7.5,
    },
  };
}

describe("Checkpoint 8 catalog override editor policy", () => {
  it("accepts current or historical dates and rejects future activation", () => {
    expect(isImmediateOverrideDateAllowed("2026-07-17", "2026-07-18")).toBe(
      true,
    );
    expect(isImmediateOverrideDateAllowed("2026-07-18", "2026-07-18")).toBe(
      true,
    );
    expect(isImmediateOverrideDateAllowed("2026-07-19", "2026-07-18")).toBe(
      false,
    );
    expect(isImmediateOverrideDateAllowed("", "2026-07-18")).toBe(false);
  });

  it("preserves unresolved source while editing or restoring current targets", () => {
    const unresolved = unresolvedOverride();
    const inserted = upsertApiCatalogOverride([unresolved], currentOverride());
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;
    expect(inserted.overrides).toHaveLength(2);
    expect(inserted.overrides).toContainEqual(unresolved);

    const restored = restoreApiCatalogDefaults(
      inserted.overrides,
      currentOverride().target,
    );
    expect(restored).toEqual({ ok: true, overrides: [unresolved] });
  });

  it("rejects a tenth source instead of diverging UI state from the v6 limit", () => {
    const unresolved = Array.from({ length: 9 }, (_, index) => ({
      ...unresolvedOverride(),
      target: {
        ...unresolvedOverride().target,
        registryVersion: `retired-provider-registry-v${index}`,
      },
    }));

    expect(upsertApiCatalogOverride(unresolved, currentOverride())).toEqual({
      ok: false,
      reasonCode: "invalid-user-override",
    });
  });

  it("removes an exact unresolved source without promoting or deleting other overrides", () => {
    const unresolved = unresolvedOverride();
    const current = currentOverride();
    expect(
      removeApiCatalogOverrideSource(
        [unresolved, current],
        unresolved.target,
      ),
    ).toEqual({ ok: true, overrides: [current] });
  });

  it("derives restored editor fields from the latest props without dropping sibling values", () => {
    expect(
      resolveCatalogOverrideEditorValues(
        [],
        "openai",
        "economy",
        PRICING_AS_OF,
      ),
    ).toEqual({
      planningTier: "",
      inputPrice: "",
      outputPrice: "",
      effectiveFrom: PRICING_AS_OF,
    });
    expect(
      resolveCatalogOverrideEditorValues(
        [currentOverride()],
        "openai",
        "economy",
        "2026-07-19",
      ),
    ).toEqual({
      planningTier: "balanced",
      inputPrice: "1.25",
      outputPrice: "7.5",
      effectiveFrom: PRICING_AS_OF,
    });
  });

  it("labels unresolved source as unapplied and provides a touch-sized removal action", () => {
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(CatalogOverrideEditor, {
          overrides: [unresolvedOverride()],
          pricingAsOf: PRICING_AS_OF,
          disabled: false,
          onChange: () => undefined,
        }),
      ),
    );

    expect(markup).toContain(BEST_FIT_UI_COPY.ko.overrides.unresolvedSource);
    expect(markup).toContain(BEST_FIT_UI_COPY.ko.overrides.removeUnresolved);
    expect(markup).toContain("min-h-11");
  });
});

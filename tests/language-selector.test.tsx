import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/components/language-provider";
import { LanguageSelector } from "@/components/language-selector";

describe("Language selector placement", () => {
  it("renders as an inline header control instead of covering page actions", () => {
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(LanguageSelector),
      ),
    );

    expect(markup).toContain('id="global-language-selector"');
    expect(markup).toContain(
      '<option value="en" lang="en" selected="">English</option>',
    );
    expect(markup).toContain("min-h-11");
    expect(markup).not.toContain("fixed");
    expect(markup).not.toContain("bottom-");
  });
});

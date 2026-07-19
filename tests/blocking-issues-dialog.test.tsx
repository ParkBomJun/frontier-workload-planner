import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BlockingIssuesDialog } from "@/components/blocking-issues-dialog";

describe("Blocking issues dialog", () => {
  it("renders labelled, described, actionable issue details", () => {
    const markup = renderToStaticMarkup(
      createElement(BlockingIssuesDialog, {
        open: false,
        title: "Finish inputs",
        description: "These fields block the action.",
        issues: ["Task 1: name", "Budget"],
        closeLabel: "Return to inputs",
        onClose: () => undefined,
      }),
    );

    expect(markup).toContain("<dialog");
    expect(markup).toMatch(/aria-labelledby="[^"]+-title"/);
    expect(markup).toMatch(/aria-describedby="[^"]+-description"/);
    expect(markup).toContain("Task 1: name");
    expect(markup).toContain("Budget");
    expect(markup).toContain("Return to inputs");
    expect(markup.match(/min-h-11/g)).toHaveLength(1);
  });
});

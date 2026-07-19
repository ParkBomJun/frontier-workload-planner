import { describe, expect, it } from "vitest";

import { shouldPreventImplicitFormSubmit } from "@/lib/form-submit";

describe("explicit plan submission", () => {
  it("blocks Enter from single-line fields without blocking composition or buttons", () => {
    expect(shouldPreventImplicitFormSubmit("Enter", "text", false)).toBe(true);
    expect(shouldPreventImplicitFormSubmit("Enter", "number", false)).toBe(true);
    expect(shouldPreventImplicitFormSubmit("Enter", "date", false)).toBe(true);
    expect(shouldPreventImplicitFormSubmit("Enter", "text", true)).toBe(false);
    expect(shouldPreventImplicitFormSubmit(" ", "text", false)).toBe(false);
    expect(shouldPreventImplicitFormSubmit("Enter", "submit", false)).toBe(false);
  });
});

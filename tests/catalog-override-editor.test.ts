import { describe, expect, it } from "vitest";

import { isImmediateOverrideDateAllowed } from "@/components/catalog-override-editor";

describe("Checkpoint 7 catalog override editor policy", () => {
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
});

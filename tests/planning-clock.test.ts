import { describe, expect, it } from "vitest";

import {
  latestIsoDateTime,
  resolveRestoredPlanningRevisionAt,
} from "@/lib/planning/planning-clock";

describe("Best-fit planning clock", () => {
  it.each([
    {
      name: "restore instant",
      input: {
        restoredAt: "2026-09-01T00:05:00.000Z",
        generatedAt: "2026-08-31T23:55:00.000Z",
        confirmedAt: "2026-08-31T23:56:00.000Z",
      },
      expected: "2026-09-01T00:05:00.000Z",
    },
    {
      name: "future analysis instant",
      input: {
        restoredAt: "2026-09-01T00:05:00.000Z",
        generatedAt: "2026-09-02T00:00:00.000Z",
        confirmedAt: "2026-08-31T23:56:00.000Z",
      },
      expected: "2026-09-02T00:00:00.000Z",
    },
    {
      name: "future confirmation instant",
      input: {
        restoredAt: "2026-09-01T00:05:00.000Z",
        generatedAt: "2026-08-31T23:55:00.000Z",
        confirmedAt: "2026-09-03T00:00:00.000Z",
      },
      expected: "2026-09-03T00:00:00.000Z",
    },
    {
      name: "unconfirmed budget",
      input: {
        restoredAt: "2026-09-01T00:05:00.000Z",
        generatedAt: "2026-08-31T23:55:00.000Z",
        confirmedAt: null,
      },
      expected: "2026-09-01T00:05:00.000Z",
    },
  ])("uses the latest authorized $name", ({ input, expected }) => {
    expect(resolveRestoredPlanningRevisionAt(input)).toBe(expected);
  });

  it("does not treat storage savedAt as calculation authority", () => {
    const sourceWithStorageMetadata = {
      restoredAt: "2026-09-01T00:05:00.000Z",
      generatedAt: "2026-08-31T23:55:00.000Z",
      confirmedAt: null,
      savedAt: "2026-10-01T00:00:00.000Z",
    };

    expect(resolveRestoredPlanningRevisionAt(sourceWithStorageMetadata)).toBe(
      sourceWithStorageMetadata.restoredAt,
    );
  });

  it("compares valid timestamps by instant instead of fractional string order", () => {
    expect(
      latestIsoDateTime(
        "2026-09-01T00:00:00.001Z",
        "2026-09-01T00:00:00Z",
      ),
    ).toBe("2026-09-01T00:00:00.001Z");
    expect(
      latestIsoDateTime(
        "2026-09-01T00:00:00.0001Z",
        "2026-09-01T00:00:00.000Z",
      ),
    ).toBe("2026-09-01T00:00:00.0001Z");
  });

  it("rejects invalid timestamp inputs instead of masking corrupt source state", () => {
    expect(() =>
      latestIsoDateTime(
        "2026-09-01T00:00:00.000Z",
        "2026-02-30T00:00:00.000Z",
      ),
    ).toThrow(/valid ISO UTC date-times/);
  });
});

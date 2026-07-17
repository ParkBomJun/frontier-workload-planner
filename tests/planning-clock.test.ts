import { describe, expect, it } from "vitest";

import {
  advancePlanningRevisionAt,
  latestIsoDateTime,
  resolveBestFitPlanningAsOf,
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

  it("never replaces a newer revision with an older event timestamp", () => {
    expect(
      advancePlanningRevisionAt(null, "2026-09-01T00:00:00.000Z"),
    ).toBe("2026-09-01T00:00:00.000Z");
    expect(
      advancePlanningRevisionAt(
        "2026-09-02T00:00:00.000Z",
        "2026-09-01T00:00:00.000Z",
      ),
    ).toBe("2026-09-02T00:00:00.000Z");
    expect(
      advancePlanningRevisionAt(
        "2026-09-01T00:00:00.000Z",
        "2026-09-02T00:00:00.000Z",
      ),
    ).toBe("2026-09-02T00:00:00.000Z");
  });

  it("folds restore, older mutation, and older analysis into one high-water mark", () => {
    const restored = resolveRestoredPlanningRevisionAt({
      restoredAt: "2026-09-01T00:05:00.000Z",
      generatedAt: "2026-08-31T23:50:00.000Z",
      confirmedAt: "2026-09-03T00:00:00.000Z",
    });
    const afterManualRestore = advancePlanningRevisionAt(
      "2026-09-04T00:00:00.000Z",
      restored,
    );
    const afterMutation = advancePlanningRevisionAt(
      afterManualRestore,
      "2026-09-01T00:10:00.000Z",
    );
    const afterAnalysis = advancePlanningRevisionAt(
      afterMutation,
      "2026-08-31T23:58:00.000Z",
    );

    expect(restored).toBe("2026-09-03T00:00:00.000Z");
    expect(afterManualRestore).toBe("2026-09-04T00:00:00.000Z");
    expect(afterMutation).toBe(afterManualRestore);
    expect(afterAnalysis).toBe(afterManualRestore);
  });

  it("retains a removed source candidate in the revision high-water", () => {
    const withResource = resolveBestFitPlanningAsOf({
      revisionAt: "2026-09-01T00:00:00.000Z",
      resourceEvidenceObservedAt: ["2026-09-03T00:00:00.000Z"],
      overrideRecordedAt: [],
      generatedAt: "2026-08-31T23:50:00.000Z",
      confirmedAt: null,
    });
    if (withResource === null) throw new Error("Resource clock candidate is required.");
    const afterRemoval = advancePlanningRevisionAt(
      withResource,
      "2026-09-01T01:00:00.000Z",
    );

    expect(
      resolveBestFitPlanningAsOf({
        revisionAt: afterRemoval,
        resourceEvidenceObservedAt: [],
        overrideRecordedAt: [],
        generatedAt: "2026-08-31T23:50:00.000Z",
        confirmedAt: null,
      }),
    ).toBe("2026-09-03T00:00:00.000Z");
  });

  it("keeps confirmedAt as an independent planningAsOf candidate", () => {
    expect(
      resolveBestFitPlanningAsOf({
        revisionAt: "2026-09-01T00:00:00.000Z",
        resourceEvidenceObservedAt: ["2026-09-01T01:00:00.000Z"],
        overrideRecordedAt: ["2026-09-01T02:00:00.000Z"],
        generatedAt: "2026-09-01T03:00:00.000Z",
        confirmedAt: "2026-09-02T00:00:00.000Z",
      }),
    ).toBe("2026-09-02T00:00:00.000Z");
  });

  it("keeps planningAsOf monotonic when a delayed analysis is older", () => {
    const revisionAt = advancePlanningRevisionAt(
      "2026-09-02T00:00:00.000Z",
      "2026-08-31T23:50:00.000Z",
    );

    expect(
      resolveBestFitPlanningAsOf({
        revisionAt,
        resourceEvidenceObservedAt: [],
        overrideRecordedAt: [],
        generatedAt: "2026-08-31T23:50:00.000Z",
        confirmedAt: "2026-09-01T00:00:00.000Z",
      }),
    ).toBe("2026-09-02T00:00:00.000Z");
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

import { describe, expect, it } from "vitest";

import {
  humanizeSubscriptionUsageDescription,
  parseSubscriptionUsageDescription,
  parseSubscriptionUsagePercentInput,
  serializeSubscriptionUsageDescription,
  subscriptionUsageBottleneckPercent,
} from "@/lib/subscriptions/usage-snapshot";

describe("subscription usage snapshots", () => {
  it("accepts only complete integer percentages without turning an empty edit into zero", () => {
    expect(parseSubscriptionUsagePercentInput("")).toBeNull();
    expect(parseSubscriptionUsagePercentInput("   ")).toBeNull();
    expect(parseSubscriptionUsagePercentInput("0")).toBe(0);
    expect(parseSubscriptionUsagePercentInput("100")).toBe(100);
    expect(parseSubscriptionUsagePercentInput("-1")).toBeNull();
    expect(parseSubscriptionUsagePercentInput("101")).toBeNull();
    expect(parseSubscriptionUsagePercentInput("1.5")).toBeNull();
  });
  it("round-trips independent limit windows without merging them", () => {
    const description = serializeSubscriptionUsageDescription(
      {
        fiveHourRemainingPercent: 72,
        weeklyRemainingPercent: 41,
        modelWeeklyRemainingPercent: 18,
        modelLabel: "Model shown in Usage",
      },
      "Checked immediately before planning.",
    );

    expect(parseSubscriptionUsageDescription(description)).toEqual({
      snapshot: {
        fiveHourRemainingPercent: 72,
        weeklyRemainingPercent: 41,
        modelWeeklyRemainingPercent: 18,
        modelLabel: "Model shown in Usage",
      },
      note: "Checked immediately before planning.",
    });
    expect(subscriptionUsageBottleneckPercent(
      parseSubscriptionUsageDescription(description).snapshot,
    )).toBe(18);
  });

  it("preserves legacy free-form notes and malformed markers as notes", () => {
    expect(parseSubscriptionUsageDescription("Provider does not show a number."))
      .toEqual({ snapshot: {}, note: "Provider does not show a number." });
    expect(parseSubscriptionUsageDescription(
      'FWP_USAGE_SNAPSHOT_V1 {"weeklyRemainingPercent":101}',
    )).toEqual({
      snapshot: {},
      note: 'FWP_USAGE_SNAPSHOT_V1 {"weeklyRemainingPercent":101}',
    });
  });

  it("humanizes slider values for the strict opaque-quota boundary", () => {
    const description = serializeSubscriptionUsageDescription(
      {
        fiveHourRemainingPercent: 80,
        weeklyRemainingPercent: 55,
        dailyRemainingPercent: 25,
        creditRemainingPercent: 10,
      },
      "User-observed only.",
    );

    expect(humanizeSubscriptionUsageDescription(description)).toBe(
      "User-observed limit snapshot: 5-hour remaining 80%, weekly remaining 55%, daily remaining 25%, included credits remaining 10%. Note: User-observed only.",
    );
  });

  it("does not claim a bottleneck when no percentage was recorded", () => {
    expect(subscriptionUsageBottleneckPercent({})).toBeNull();
    expect(serializeSubscriptionUsageDescription({}, "plain note")).toBe(
      "plain note",
    );
  });
});

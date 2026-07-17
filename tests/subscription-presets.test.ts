import { describe, expect, it } from "vitest";

import {
  ACCESS_PROVIDER_REGISTRY,
  getAccessProviderRegistryEntry,
  REGISTERED_ACCESS_PROVIDER_IDS,
} from "@/config/access-provider-registry";
import {
  getSubscriptionPreset,
  SUBSCRIPTION_PRESET_IDS,
  SUBSCRIPTION_PRESETS,
  SUBSCRIPTION_PRESET_VERSION,
} from "@/config/subscription-presets";
import {
  createCustomAccessProviderId,
  parseAccessProviderId,
} from "@/lib/offerings/route-identity";

describe("access-provider registry", () => {
  it("keeps existing API identities and adds only the subscription access providers", () => {
    expect(REGISTERED_ACCESS_PROVIDER_IDS).toEqual([
      "openai",
      "anthropic",
      "google",
      "github",
      "z-ai",
    ]);
    expect(Object.keys(ACCESS_PROVIDER_REGISTRY)).toEqual([
      "openai",
      "anthropic",
      "google",
      "github",
      "z-ai",
    ]);
    for (const providerId of REGISTERED_ACCESS_PROVIDER_IDS) {
      expect(parseAccessProviderId(providerId)).toBe(providerId);
      expect(getAccessProviderRegistryEntry(providerId)).toMatchObject({
        id: providerId,
      });
    }
  });

  it("rejects unknown and inherited-property keys", () => {
    for (const providerId of ["unknown", "__proto__", "constructor", "toString"]) {
      expect(getAccessProviderRegistryEntry(providerId)).toBeUndefined();
      expect(() => parseAccessProviderId(providerId)).toThrow(/not registered/);
    }
  });

  it("keeps the registry and entries immutable", () => {
    expect(Object.isFrozen(REGISTERED_ACCESS_PROVIDER_IDS)).toBe(true);
    expect(Object.isFrozen(ACCESS_PROVIDER_REGISTRY)).toBe(true);
    for (const providerId of REGISTERED_ACCESS_PROVIDER_IDS) {
      expect(Object.isFrozen(ACCESS_PROVIDER_REGISTRY[providerId])).toBe(true);
    }
  });
});

describe("illustrative subscription presets", () => {
  it("provides the four bounded preset shapes in stable order", () => {
    expect(SUBSCRIPTION_PRESETS.map(({ id }) => id)).toEqual([
      ...SUBSCRIPTION_PRESET_IDS,
    ]);
    expect(SUBSCRIPTION_PRESETS.every(({ version }) => version === SUBSCRIPTION_PRESET_VERSION)).toBe(
      true,
    );
    expect(getSubscriptionPreset("chatgpt-like-variable")).toMatchObject({
      providerId: "openai",
      quotaInput: { kind: "opaque" },
      suggestedSurfaces: ["chat"],
    });
    expect(getSubscriptionPreset("github-copilot-like-credits")).toMatchObject({
      providerId: "github",
      quotaInput: {
        kind: "user-supplied-metered",
        unit: "credit",
        reset: "user-supplied",
      },
      suggestedSurfaces: ["ide-cli"],
    });
    expect(getSubscriptionPreset("glm-like-rolling")).toMatchObject({
      providerId: "z-ai",
      quotaInput: { kind: "user-supplied-rolling" },
      suggestedSurfaces: ["ide-cli"],
    });
  });

  it("keeps Custom provider identity user-specific and planner-generated", () => {
    const custom = getSubscriptionPreset("custom-subscription");
    expect(custom).toMatchObject({
      providerId: null,
      providerInput: "planner-generated-custom",
      quotaInput: { kind: "user-configured" },
      suggestedSurfaces: [],
    });
    expect(createCustomAccessProviderId("account-0001")).toBe(
      "custom.account-0001",
    );
  });

  it("contains no numeric quota, fee, reset interval, or evidence claim", () => {
    for (const preset of SUBSCRIPTION_PRESETS) {
      expect(preset).toMatchObject({
        requiresUserConfirmation: true,
        evidenceAuthority: "none",
      });
      const serialized = JSON.stringify(preset);
      for (const forbiddenField of [
        "included",
        "remaining",
        "feeUsd",
        "currentFeeUsd",
        "cadenceDays",
        "windowHours",
        "evidence",
        "sourceUrl",
        "verifiedAt",
      ]) {
        expect(serialized).not.toContain(`\"${forbiddenField}\"`);
      }
    }
  });

  it("is recursively immutable and rejects unknown or inherited IDs", () => {
    expect(Object.isFrozen(SUBSCRIPTION_PRESET_IDS)).toBe(true);
    expect(Object.isFrozen(SUBSCRIPTION_PRESETS)).toBe(true);
    for (const preset of SUBSCRIPTION_PRESETS) {
      expect(Object.isFrozen(preset)).toBe(true);
      expect(Object.isFrozen(preset.quotaInput)).toBe(true);
      expect(Object.isFrozen(preset.suggestedSurfaces)).toBe(true);
    }
    for (const presetId of ["unknown", "__proto__", "constructor", "toString"]) {
      expect(getSubscriptionPreset(presetId)).toBeUndefined();
    }
  });
});

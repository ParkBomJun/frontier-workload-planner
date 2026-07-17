import {
  getAccessProviderRegistryEntry,
  type RegisteredAccessProviderId,
} from "./access-provider-registry";
import type { WorkSurface } from "@/types/workload";

export const SUBSCRIPTION_PRESET_VERSION = "subscription-presets-v1" as const;

const subscriptionPresetIds = [
  "chatgpt-like-variable",
  "github-copilot-like-credits",
  "glm-like-rolling",
  "custom-subscription",
] as const;

export type SubscriptionPresetId = (typeof subscriptionPresetIds)[number];

export const SUBSCRIPTION_PRESET_IDS = Object.freeze(subscriptionPresetIds);

type SubscriptionPresetQuotaInput =
  | {
      kind: "opaque";
    }
  | {
      kind: "user-supplied-metered";
      unit: "credit";
      reset: "user-supplied";
    }
  | {
      kind: "user-supplied-rolling";
    }
  | {
      kind: "user-configured";
    };

export interface SubscriptionPreset {
  id: SubscriptionPresetId;
  version: typeof SUBSCRIPTION_PRESET_VERSION;
  displayName: string;
  providerId: RegisteredAccessProviderId | null;
  providerInput: "registered" | "planner-generated-custom";
  quotaInput: SubscriptionPresetQuotaInput;
  suggestedSurfaces: readonly WorkSurface[];
  requiresUserConfirmation: true;
  evidenceAuthority: "none";
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

const presets = [
  {
    id: "chatgpt-like-variable",
    version: SUBSCRIPTION_PRESET_VERSION,
    displayName: "ChatGPT-like variable plan",
    providerId: "openai",
    providerInput: "registered",
    quotaInput: { kind: "opaque" },
    suggestedSurfaces: ["chat"],
    requiresUserConfirmation: true,
    evidenceAuthority: "none",
  },
  {
    id: "github-copilot-like-credits",
    version: SUBSCRIPTION_PRESET_VERSION,
    displayName: "GitHub Copilot-like credit plan",
    providerId: "github",
    providerInput: "registered",
    quotaInput: {
      kind: "user-supplied-metered",
      unit: "credit",
      reset: "user-supplied",
    },
    suggestedSurfaces: ["ide-cli"],
    requiresUserConfirmation: true,
    evidenceAuthority: "none",
  },
  {
    id: "glm-like-rolling",
    version: SUBSCRIPTION_PRESET_VERSION,
    displayName: "GLM-like rolling plan",
    providerId: "z-ai",
    providerInput: "registered",
    quotaInput: { kind: "user-supplied-rolling" },
    suggestedSurfaces: ["ide-cli"],
    requiresUserConfirmation: true,
    evidenceAuthority: "none",
  },
  {
    id: "custom-subscription",
    version: SUBSCRIPTION_PRESET_VERSION,
    displayName: "Custom subscription",
    providerId: null,
    providerInput: "planner-generated-custom",
    quotaInput: { kind: "user-configured" },
    suggestedSurfaces: [],
    requiresUserConfirmation: true,
    evidenceAuthority: "none",
  },
] as const satisfies readonly SubscriptionPreset[];

presets.forEach((preset) => {
  if (
    preset.providerId !== null &&
    getAccessProviderRegistryEntry(preset.providerId) === undefined
  ) {
    throw new Error("Subscription preset references an unregistered access provider.");
  }
});

export const SUBSCRIPTION_PRESETS = deepFreeze(
  [...presets],
) as readonly SubscriptionPreset[];

const presetById = Object.freeze(
  Object.fromEntries(SUBSCRIPTION_PRESETS.map((preset) => [preset.id, preset])),
) as Readonly<Record<SubscriptionPresetId, SubscriptionPreset>>;

export function getSubscriptionPreset(
  presetId: string,
): SubscriptionPreset | undefined {
  if (!Object.hasOwn(presetById, presetId)) return undefined;
  return presetById[presetId as SubscriptionPresetId];
}

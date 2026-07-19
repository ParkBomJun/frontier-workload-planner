import {
  getAccessProviderRegistryEntry,
  type RegisteredAccessProviderId,
} from "./access-provider-registry";
import type { WorkSurface } from "@/types/workload";

export const SUBSCRIPTION_PRESET_VERSION = "subscription-presets-v2" as const;
export const MAX_AVAILABLE_AI_RESOURCES = 8;

const subscriptionPresetIds = [
  "chatgpt-like-variable",
  "claude-subscription",
  "gemini-subscription",
  "google-antigravity",
  "gemini-code-assist",
  "github-copilot-like-credits",
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
      kind: "user-configured";
    };

export interface SubscriptionPreset {
  id: SubscriptionPresetId;
  version: typeof SUBSCRIPTION_PRESET_VERSION;
  displayName: string;
  providerId: RegisteredAccessProviderId | null;
  providerInput: "registered" | "planner-generated-custom";
  defaultProvisioning: "personal" | "organization";
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
    displayName: "ChatGPT / Codex subscription",
    providerId: "openai",
    providerInput: "registered",
    defaultProvisioning: "personal",
    quotaInput: { kind: "opaque" },
    suggestedSurfaces: ["chat", "ide-cli"],
    requiresUserConfirmation: true,
    evidenceAuthority: "none",
  },
  {
    id: "claude-subscription",
    version: SUBSCRIPTION_PRESET_VERSION,
    displayName: "Claude subscription",
    providerId: "anthropic",
    providerInput: "registered",
    defaultProvisioning: "personal",
    quotaInput: { kind: "opaque" },
    suggestedSurfaces: ["chat", "ide-cli"],
    requiresUserConfirmation: true,
    evidenceAuthority: "none",
  },
  {
    id: "gemini-subscription",
    version: SUBSCRIPTION_PRESET_VERSION,
    displayName: "Gemini chat subscription",
    providerId: "google",
    providerInput: "registered",
    defaultProvisioning: "personal",
    quotaInput: { kind: "opaque" },
    suggestedSurfaces: ["chat"],
    requiresUserConfirmation: true,
    evidenceAuthority: "none",
  },
  {
    id: "google-antigravity",
    version: SUBSCRIPTION_PRESET_VERSION,
    displayName: "Google Antigravity coding tool",
    providerId: "google",
    providerInput: "registered",
    defaultProvisioning: "personal",
    quotaInput: { kind: "opaque" },
    suggestedSurfaces: ["ide-cli"],
    requiresUserConfirmation: true,
    evidenceAuthority: "none",
  },
  {
    id: "gemini-code-assist",
    version: SUBSCRIPTION_PRESET_VERSION,
    displayName: "Gemini Code Assist",
    providerId: "google",
    providerInput: "registered",
    defaultProvisioning: "organization",
    quotaInput: { kind: "opaque" },
    suggestedSurfaces: ["ide-cli"],
    requiresUserConfirmation: true,
    evidenceAuthority: "none",
  },
  {
    id: "github-copilot-like-credits",
    version: SUBSCRIPTION_PRESET_VERSION,
    displayName: "GitHub Copilot coding tool",
    providerId: "github",
    providerInput: "registered",
    defaultProvisioning: "personal",
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
    id: "custom-subscription",
    version: SUBSCRIPTION_PRESET_VERSION,
    displayName: "Other AI subscription",
    providerId: null,
    providerInput: "planner-generated-custom",
    defaultProvisioning: "personal",
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

const registeredAccessProviderIds = [
  "openai",
  "anthropic",
  "google",
  "github",
] as const;

export type RegisteredAccessProviderId =
  (typeof registeredAccessProviderIds)[number];

export const REGISTERED_ACCESS_PROVIDER_IDS = Object.freeze(
  registeredAccessProviderIds,
);

export interface AccessProviderRegistryEntry {
  id: RegisteredAccessProviderId;
  displayName: string;
}

const entries = [
  { id: "openai", displayName: "OpenAI" },
  { id: "anthropic", displayName: "Anthropic" },
  { id: "google", displayName: "Google" },
  { id: "github", displayName: "GitHub" },
] as const satisfies readonly AccessProviderRegistryEntry[];

export const ACCESS_PROVIDER_REGISTRY = Object.freeze(
  Object.fromEntries(
    entries.map((entry) => [entry.id, Object.freeze({ ...entry })]),
  ),
) as Readonly<Record<RegisteredAccessProviderId, AccessProviderRegistryEntry>>;

const registeredAccessProviderIdSet = new Set<string>(
  REGISTERED_ACCESS_PROVIDER_IDS,
);

export function isRegisteredAccessProviderId(
  value: string,
): value is RegisteredAccessProviderId {
  return registeredAccessProviderIdSet.has(value);
}

export function getAccessProviderRegistryEntry(
  value: string,
): AccessProviderRegistryEntry | undefined {
  if (!isRegisteredAccessProviderId(value)) return undefined;
  return ACCESS_PROVIDER_REGISTRY[value];
}

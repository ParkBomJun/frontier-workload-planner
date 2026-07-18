import type { WorkSurface } from "@/types/offerings";

/**
 * Provider documentation names API endpoints, not the planner's chat/IDE/Batch
 * surfaces. This versioned adapter is the explicit, planner-authored boundary
 * between those two vocabularies.
 */
export const PLANNER_API_ROUTE_ADAPTER_VERSION =
  "provider-endpoint-to-planner-surface-v1" as const;

export const PROVIDER_API_ENDPOINT_IDS = [
  "responses",
  "chat-completions",
  "openai-batch",
  "messages",
  "message-batches",
  "generate-content",
  "batch-generate-content",
] as const;

export type ProviderApiEndpointId =
  (typeof PROVIDER_API_ENDPOINT_IDS)[number];

const SYNCHRONOUS_ENDPOINTS = new Set<ProviderApiEndpointId>([
  "responses",
  "chat-completions",
  "messages",
  "generate-content",
]);

const BATCH_ENDPOINTS = new Set<ProviderApiEndpointId>([
  "openai-batch",
  "message-batches",
  "batch-generate-content",
]);

export function derivePlannerApiSurfaces(
  endpointIds: readonly ProviderApiEndpointId[],
): readonly WorkSurface[] {
  const hasSynchronousEndpoint = endpointIds.some((endpointId) =>
    SYNCHRONOUS_ENDPOINTS.has(endpointId),
  );
  const hasBatchEndpoint = endpointIds.some((endpointId) =>
    BATCH_ENDPOINTS.has(endpointId),
  );
  return Object.freeze([
    ...(hasSynchronousEndpoint ? (["chat", "ide-cli"] as const) : []),
    ...(hasBatchEndpoint ? (["batch"] as const) : []),
  ]);
}

export function derivePlannerApiOfferingId(
  providerId: string,
  modelId: string,
): string {
  return `api.${providerId}.${modelId}.standard-text`;
}

import type { ModelTier, ProviderId } from "@/types/domain";
import type { CapabilityId } from "@/types/offerings";
import type { ProviderApiEndpointId } from "./planner-api-route-adapter";

export interface ProviderModelPrice {
  tier: ModelTier;
  catalogId: string;
  displayName: string;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  preview?: true;
  effectiveThrough?: string;
  priceAfterEffectiveThrough?: {
    inputUsdPerMillion: number;
    outputUsdPerMillion: number;
    effectiveFrom: string;
  };
  standardPriceInputLimitTokens?: number;
  excludedLongContextPrice?: {
    inputUsdPerMillion: number;
    outputUsdPerMillion: number;
  };
  verifiedApiClaims?: {
    modelCapabilities: {
      capabilityIds: readonly CapabilityId[];
      sourceUrl: string;
    };
    offeringIdentity: {
      endpointIds: readonly ProviderApiEndpointId[];
      sourceUrl: string;
    };
    accessLimits: {
      kind: "same-as-model";
      sourceUrl: string;
    };
    accessCapabilities: {
      kind: "same-as-model";
      sourceUrl: string;
    };
  };
  limits: {
    maxInputTokens?: number;
    maxOutputTokens?: number;
    maxCombinedTokens?: number;
    sourceUrl: string;
    verifiedAt: "2026-07-17" | "2026-07-18";
  };
}

export interface ProviderCatalog {
  id: ProviderId;
  displayName: string;
  productFamily: string;
  pricingSource: string;
  modelsSource: string;
  verifiedAt: "2026-07-17" | "2026-07-18";
  models: Record<ModelTier, ProviderModelPrice>;
}

export const PROVIDER_PRICING_BASIS = "standard-uncached-text" as const;
export const PROVIDER_PRICING_EXCLUSIONS = [
  "cache-discounts-and-writes",
  "batch-pricing",
  "tool-call-fees",
  "long-context-surcharges",
] as const;

export const PROVIDER_CATALOG: Record<ProviderId, ProviderCatalog> = {
  openai: {
    id: "openai",
    displayName: "OpenAI",
    productFamily: "GPT-5.6",
    pricingSource: "https://developers.openai.com/api/docs/pricing",
    modelsSource: "https://developers.openai.com/api/docs/guides/latest-model",
    verifiedAt: "2026-07-18",
    models: {
      economy: {
        tier: "economy",
        catalogId: "gpt-5.6-luna",
        displayName: "GPT-5.6 Luna",
        inputUsdPerMillion: 1,
        outputUsdPerMillion: 6,
        standardPriceInputLimitTokens: 272_000,
        excludedLongContextPrice: {
          inputUsdPerMillion: 2,
          outputUsdPerMillion: 9,
        },
        verifiedApiClaims: {
          modelCapabilities: {
            capabilityIds: [
              "vision-input",
              "file-input",
              "code-editing",
              "structured-output",
              "tool-use",
            ],
            sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
          },
          offeringIdentity: {
            endpointIds: ["responses", "chat-completions", "openai-batch"],
            sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
          },
          accessLimits: {
            kind: "same-as-model",
            sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
          },
          accessCapabilities: {
            kind: "same-as-model",
            sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
          },
        },
        limits: {
          maxInputTokens: 922_000,
          maxOutputTokens: 128_000,
          maxCombinedTokens: 1_050_000,
          sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
          verifiedAt: "2026-07-18",
        },
      },
      balanced: {
        tier: "balanced",
        catalogId: "gpt-5.6-terra",
        displayName: "GPT-5.6 Terra",
        inputUsdPerMillion: 2.5,
        outputUsdPerMillion: 15,
        standardPriceInputLimitTokens: 272_000,
        excludedLongContextPrice: {
          inputUsdPerMillion: 5,
          outputUsdPerMillion: 22.5,
        },
        verifiedApiClaims: {
          modelCapabilities: {
            capabilityIds: [
              "vision-input",
              "file-input",
              "code-editing",
              "structured-output",
              "tool-use",
            ],
            sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
          },
          offeringIdentity: {
            endpointIds: ["responses", "chat-completions", "openai-batch"],
            sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
          },
          accessLimits: {
            kind: "same-as-model",
            sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
          },
          accessCapabilities: {
            kind: "same-as-model",
            sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
          },
        },
        limits: {
          maxInputTokens: 922_000,
          maxOutputTokens: 128_000,
          maxCombinedTokens: 1_050_000,
          sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
          verifiedAt: "2026-07-18",
        },
      },
      frontier: {
        tier: "frontier",
        catalogId: "gpt-5.6-sol",
        displayName: "GPT-5.6 Sol",
        inputUsdPerMillion: 5,
        outputUsdPerMillion: 30,
        standardPriceInputLimitTokens: 272_000,
        excludedLongContextPrice: {
          inputUsdPerMillion: 10,
          outputUsdPerMillion: 45,
        },
        verifiedApiClaims: {
          modelCapabilities: {
            capabilityIds: [
              "vision-input",
              "file-input",
              "code-editing",
              "structured-output",
              "tool-use",
            ],
            sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
          },
          offeringIdentity: {
            endpointIds: ["responses", "chat-completions", "openai-batch"],
            sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
          },
          accessLimits: {
            kind: "same-as-model",
            sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
          },
          accessCapabilities: {
            kind: "same-as-model",
            sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
          },
        },
        limits: {
          maxInputTokens: 922_000,
          maxOutputTokens: 128_000,
          maxCombinedTokens: 1_050_000,
          sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
          verifiedAt: "2026-07-18",
        },
      },
    },
  },
  anthropic: {
    id: "anthropic",
    displayName: "Anthropic",
    productFamily: "Claude",
    pricingSource: "https://platform.claude.com/docs/en/about-claude/pricing",
    modelsSource: "https://platform.claude.com/docs/en/about-claude/models/overview",
    verifiedAt: "2026-07-18",
    models: {
      economy: {
        tier: "economy",
        catalogId: "claude-haiku-4-5",
        displayName: "Claude Haiku 4.5",
        inputUsdPerMillion: 1,
        outputUsdPerMillion: 5,
        verifiedApiClaims: {
          modelCapabilities: {
            capabilityIds: [
              "vision-input",
              "file-input",
              "structured-output",
              "tool-use",
            ],
            sourceUrl: "https://platform.claude.com/docs/en/api/models",
          },
          offeringIdentity: {
            endpointIds: ["messages", "message-batches"],
            sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
          },
          accessLimits: {
            kind: "same-as-model",
            sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
          },
          accessCapabilities: {
            kind: "same-as-model",
            sourceUrl: "https://platform.claude.com/docs/en/api/models",
          },
        },
        limits: {
          maxOutputTokens: 64_000,
          maxCombinedTokens: 200_000,
          sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
          verifiedAt: "2026-07-18",
        },
      },
      balanced: {
        tier: "balanced",
        catalogId: "claude-sonnet-5",
        displayName: "Claude Sonnet 5",
        inputUsdPerMillion: 2,
        outputUsdPerMillion: 10,
        effectiveThrough: "2026-08-31",
        priceAfterEffectiveThrough: {
          inputUsdPerMillion: 3,
          outputUsdPerMillion: 15,
          effectiveFrom: "2026-09-01",
        },
        verifiedApiClaims: {
          modelCapabilities: {
            capabilityIds: [
              "vision-input",
              "file-input",
              "structured-output",
              "tool-use",
            ],
            sourceUrl: "https://platform.claude.com/docs/en/api/models",
          },
          offeringIdentity: {
            endpointIds: ["messages", "message-batches"],
            sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
          },
          accessLimits: {
            kind: "same-as-model",
            sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
          },
          accessCapabilities: {
            kind: "same-as-model",
            sourceUrl: "https://platform.claude.com/docs/en/api/models",
          },
        },
        limits: {
          maxOutputTokens: 128_000,
          maxCombinedTokens: 1_000_000,
          sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
          verifiedAt: "2026-07-18",
        },
      },
      frontier: {
        tier: "frontier",
        catalogId: "claude-fable-5",
        displayName: "Claude Fable 5",
        inputUsdPerMillion: 10,
        outputUsdPerMillion: 50,
        verifiedApiClaims: {
          modelCapabilities: {
            capabilityIds: [
              "vision-input",
              "file-input",
              "structured-output",
              "tool-use",
            ],
            sourceUrl: "https://platform.claude.com/docs/en/api/models",
          },
          offeringIdentity: {
            endpointIds: ["messages", "message-batches"],
            sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
          },
          accessLimits: {
            kind: "same-as-model",
            sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
          },
          accessCapabilities: {
            kind: "same-as-model",
            sourceUrl: "https://platform.claude.com/docs/en/api/models",
          },
        },
        limits: {
          maxOutputTokens: 128_000,
          maxCombinedTokens: 1_000_000,
          sourceUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
          verifiedAt: "2026-07-18",
        },
      },
    },
  },
  google: {
    id: "google",
    displayName: "Google",
    productFamily: "Gemini 3",
    pricingSource: "https://ai.google.dev/gemini-api/docs/pricing",
    modelsSource: "https://ai.google.dev/gemini-api/docs/models",
    verifiedAt: "2026-07-18",
    models: {
      economy: {
        tier: "economy",
        catalogId: "gemini-3.1-flash-lite",
        displayName: "Gemini 3.1 Flash-Lite",
        inputUsdPerMillion: 0.25,
        outputUsdPerMillion: 1.5,
        verifiedApiClaims: {
          modelCapabilities: {
            capabilityIds: [
              "vision-input",
              "file-input",
              "structured-output",
              "tool-use",
            ],
            sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite",
          },
          offeringIdentity: {
            endpointIds: ["generate-content", "batch-generate-content"],
            sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite",
          },
          accessLimits: {
            kind: "same-as-model",
            sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite",
          },
          accessCapabilities: {
            kind: "same-as-model",
            sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite",
          },
        },
        limits: {
          maxInputTokens: 1_048_576,
          maxOutputTokens: 65_536,
          sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite",
          verifiedAt: "2026-07-18",
        },
      },
      balanced: {
        tier: "balanced",
        catalogId: "gemini-3-flash-preview",
        displayName: "Gemini 3 Flash",
        inputUsdPerMillion: 0.5,
        outputUsdPerMillion: 3,
        preview: true,
        verifiedApiClaims: {
          modelCapabilities: {
            capabilityIds: [
              "vision-input",
              "file-input",
              "structured-output",
              "tool-use",
            ],
            sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview",
          },
          offeringIdentity: {
            endpointIds: ["generate-content", "batch-generate-content"],
            sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview",
          },
          accessLimits: {
            kind: "same-as-model",
            sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview",
          },
          accessCapabilities: {
            kind: "same-as-model",
            sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview",
          },
        },
        limits: {
          maxInputTokens: 1_048_576,
          maxOutputTokens: 65_536,
          sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview",
          verifiedAt: "2026-07-18",
        },
      },
      frontier: {
        tier: "frontier",
        catalogId: "gemini-3.1-pro-preview",
        displayName: "Gemini 3.1 Pro",
        inputUsdPerMillion: 2,
        outputUsdPerMillion: 12,
        preview: true,
        standardPriceInputLimitTokens: 200_000,
        excludedLongContextPrice: {
          inputUsdPerMillion: 4,
          outputUsdPerMillion: 18,
        },
        verifiedApiClaims: {
          modelCapabilities: {
            capabilityIds: [
              "vision-input",
              "file-input",
              "structured-output",
              "tool-use",
            ],
            sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview",
          },
          offeringIdentity: {
            endpointIds: ["generate-content", "batch-generate-content"],
            sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview",
          },
          accessLimits: {
            kind: "same-as-model",
            sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview",
          },
          accessCapabilities: {
            kind: "same-as-model",
            sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview",
          },
        },
        limits: {
          maxInputTokens: 1_048_576,
          maxOutputTokens: 65_536,
          sourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview",
          verifiedAt: "2026-07-18",
        },
      },
    },
  },
};

export function providerDisplayName(providerId: ProviderId): string {
  const provider = PROVIDER_CATALOG[providerId];
  return `${provider.displayName} · ${provider.productFamily}`;
}

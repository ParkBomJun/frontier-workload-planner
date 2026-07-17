import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { resolveApiCatalogEntry } from "@/lib/offerings/provider-catalog-adapter";
import {
  assertUniqueRouteIdentities,
  compareCanonicalRouteKeys,
  createApiRouteIdentity,
  createCustomAccessProviderId,
  createSubscriptionRouteIdentity,
  normalizeConditionalReasonCodes,
  parseAccessProviderId,
  routeIdentityToCanonicalKey,
  sortConditionalAlternatives,
  sortRouteIdentities,
} from "@/lib/offerings/route-identity";
import type {
  ConditionalAlternative,
  ModelBoundOffering,
  ModelOpaqueSubscriptionOffering,
  Offering,
  SubscriptionResourceReference,
} from "@/types/offerings";
import { CONDITIONAL_REASON_CODES } from "@/types/offerings";

function subscriptionFixture(): ModelBoundOffering & { mode: "subscription" } {
  const apiEntry = resolveApiCatalogEntry("openai", "economy");
  return {
    ...apiEntry.offering,
    id: "subscription.openai.team-plan",
    mode: "subscription",
  };
}

function resource(
  offering: Offering,
  id: string,
): SubscriptionResourceReference {
  return {
    id,
    offeringRef: {
      providerId: offering.providerId,
      offeringId: offering.id,
    },
  };
}

describe("canonical route identity", () => {
  it("keeps the documented conditional reason-code order identical to runtime", () => {
    const spec = readFileSync(`${process.cwd()}/SPEC.md`, "utf8");
    const contract = spec.match(
      /type ConditionalReasonCode =([\s\S]*?);/,
    )?.[1];
    expect(contract).toBeDefined();
    expect(contract?.match(/"([a-z0-9-]+)"/g)?.map((value) => value.slice(1, -1))).toEqual(
      [...CONDITIONAL_REASON_CODES],
    );
  });

  it("uses null only for API routes and stable resource IDs for subscriptions", () => {
    const api = resolveApiCatalogEntry("openai", "economy").offering;
    const subscription = subscriptionFixture();

    expect(createApiRouteIdentity(api)).toEqual({
      providerId: "openai",
      offeringId: api.id,
      resourceId: null,
    });
    expect(
      createSubscriptionRouteIdentity(subscription, resource(subscription, "account-0001")),
    ).toEqual({
      providerId: "openai",
      offeringId: subscription.id,
      resourceId: "account-0001",
    });
    expect(() => createApiRouteIdentity(subscription)).toThrow(/Only API offerings/);
    expect(() =>
      createSubscriptionRouteIdentity(api, resource(api, "account-0001")),
    ).toThrow(/Only subscription offerings/);
  });

  it("rejects blank IDs and provider or Offering reference mismatches", () => {
    const subscription = subscriptionFixture();
    expect(() =>
      createSubscriptionRouteIdentity(subscription, resource(subscription, "")),
    ).toThrow(/Resource ID/);
    expect(() =>
      createSubscriptionRouteIdentity(subscription, {
        id: "account-0001",
        offeringRef: {
          providerId: resolveApiCatalogEntry("google", "economy").offering.providerId,
          offeringId: subscription.id,
        },
      }),
    ).toThrow(/must reference/);
    expect(() =>
      createSubscriptionRouteIdentity(subscription, {
        id: "account-0001",
        offeringRef: {
          providerId: subscription.providerId,
          offeringId: "subscription.openai.other-plan",
        },
      }),
    ).toThrow(/must reference/);
  });

  it("sorts provider, Offering, and resource element-wise with null first", () => {
    const openAiApi = createApiRouteIdentity(
      resolveApiCatalogEntry("openai", "economy").offering,
    );
    const googleApi = createApiRouteIdentity(
      resolveApiCatalogEntry("google", "economy").offering,
    );
    const subscription = subscriptionFixture();
    const accountA = createSubscriptionRouteIdentity(
      subscription,
      resource(subscription, "account-0001"),
    );
    const accountB = createSubscriptionRouteIdentity(
      subscription,
      resource(subscription, "account-0002"),
    );

    const sorted = sortRouteIdentities([accountB, googleApi, accountA, openAiApi]);
    expect(sorted).toEqual([googleApi, openAiApi, accountA, accountB]);
    expect(
      compareCanonicalRouteKeys(
        [subscription.providerId, subscription.id, null],
        routeIdentityToCanonicalKey(accountA),
      ),
    ).toBeLessThan(0);
  });

  it("uses the same provider/Offering/resource key for model-opaque accounts", () => {
    const evidence = resolveApiCatalogEntry("openai", "economy").model.evidence;
    const opaque: ModelOpaqueSubscriptionOffering = {
      kind: "model-opaque-subscription",
      id: "subscription.custom.opaque-plan",
      providerId: createCustomAccessProviderId("opaque-0001"),
      mode: "subscription",
      supportedSurfaces: ["chat"],
      evidence,
      eligibility: { kind: "unprofiled", reason: "model-undisclosed" },
    };
    const accountA = createSubscriptionRouteIdentity(
      opaque,
      resource(opaque, "account-0001"),
    );
    const accountB = createSubscriptionRouteIdentity(
      opaque,
      resource(opaque, "account-0002"),
    );

    expect(sortRouteIdentities([accountB, accountA])).toEqual([accountA, accountB]);
    expect(routeIdentityToCanonicalKey(accountA)).toEqual([
      "custom.opaque-0001",
      opaque.id,
      "account-0001",
    ]);
  });

  it("rejects duplicate tuples and keeps structured keys unambiguous", () => {
    const api = createApiRouteIdentity(
      resolveApiCatalogEntry("anthropic", "balanced").offering,
    );
    expect(() => assertUniqueRouteIdentities([api, { ...api }])).toThrow(/must be unique/);

    const first = [parseAccessProviderId("openai"), "api.openai.a-b", null] as const;
    const second = [parseAccessProviderId("openai"), "api.openai.a", "b"] as const;
    expect(first).not.toEqual(second);
    expect(compareCanonicalRouteKeys(first, second)).not.toBe(0);
  });

  it("keeps registered and Custom provider namespaces separate", () => {
    expect(parseAccessProviderId("openai")).toBe("openai");
    expect(() => parseAccessProviderId("github")).toThrow(/not registered/);
    expect(createCustomAccessProviderId("account-0001")).toBe("custom.account-0001");
    expect(createCustomAccessProviderId("account-0002")).not.toBe(
      createCustomAccessProviderId("account-0001"),
    );
    expect(createCustomAccessProviderId("openai-0001")).not.toBe("openai");
    expect(() => createCustomAccessProviderId("OpenAI Team")).toThrow(/stable ID/);
  });

  it("sorts conditional diagnostics independently of insertion order", () => {
    const subscription = subscriptionFixture();
    const fallback = createApiRouteIdentity(
      resolveApiCatalogEntry("google", "economy").offering,
    );
    const accountA = createSubscriptionRouteIdentity(
      subscription,
      resource(subscription, "account-0001"),
    );
    const accountB = createSubscriptionRouteIdentity(
      subscription,
      resource(subscription, "account-0002"),
    );
    const alternatives: ConditionalAlternative[] = [
      {
        routeIdentity: accountB,
        fallbackRouteIdentity: fallback,
        reasonCodes: ["quota-opaque"],
      },
      {
        routeIdentity: accountA,
        fallbackRouteIdentity: fallback,
        reasonCodes: ["quota-opaque", "profile-unverified"],
      },
    ];

    expect(sortConditionalAlternatives(alternatives).map(({ routeIdentity }) => routeIdentity)).toEqual([
      accountA,
      accountB,
    ]);
    expect(
      sortConditionalAlternatives([...alternatives].reverse()).map(
        ({ routeIdentity }) => routeIdentity,
      ),
    ).toEqual([accountA, accountB]);
    expect(
      normalizeConditionalReasonCodes([
        "quota-opaque",
        "profile-unverified",
        "quota-opaque",
      ]),
    ).toEqual(["profile-unverified", "quota-opaque"]);
  });
});

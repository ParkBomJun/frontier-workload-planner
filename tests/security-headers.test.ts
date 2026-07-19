import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("security response headers", () => {
  it("applies the minimal non-breaking policy to every route", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    if (!nextConfig.headers) throw new Error("Security headers must be configured.");

    const rules = await nextConfig.headers();
    expect(rules).toHaveLength(1);
    expect(rules[0]?.source).toBe("/(.*)");
    const headers = Object.fromEntries(
      (rules[0]?.headers ?? []).map(({ key, value }) => [key, value]),
    );

    expect(headers).toEqual({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy":
        "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'",
    });
  });
});

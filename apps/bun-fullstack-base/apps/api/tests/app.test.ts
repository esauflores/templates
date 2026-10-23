import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createApp } from "@api/app.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("app", () => {
  it("answers the health check, with security headers", async () => {
    const response = await createApp().request("/api/health");

    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });

  it("serves an OpenAPI document of the routes", async () => {
    const response = await createApp().request("/api/openapi.json");
    const doc = (await response.json()) as { openapi: string; paths: Record<string, unknown> };

    expect(doc.openapi).toBe("3.1.0");
    expect(Object.keys(doc.paths)).toContain("/api/hello/{name}");
  });

  it("rate-limits the API, but not the health check", async () => {
    const app = createApp();

    expect((await app.request("/api/hello/world")).headers.get("RateLimit-Limit")).toBe("300");
    expect((await app.request("/api/health")).headers.get("RateLimit-Limit")).toBeNull();
  });

  it("has no rate limit with RATE_LIMIT=0", async () => {
    vi.stubEnv("RATE_LIMIT", "0");

    expect((await createApp().request("/api/hello/world")).headers.get("RateLimit-Limit")).toBeNull();
  });

  it("refuses a body over 1 MB with 413 { error }, declared or chunked", async () => {
    const big = "x".repeat(1024 * 1024 + 1);
    const chunked = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(big));
        controller.close();
      },
    });

    const declared = { headers: { "content-length": String(big.length) }, body: big };
    for (const init of [declared, { body: chunked, duplex: "half" }]) {
      const response = await createApp().request("/api/notes", { method: "POST", ...init } as RequestInit);
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ error: "The request body is over 1 MB" });
    }
  });

  it("answers JSON for an unmatched route", async () => {
    const response = await createApp().request("/api/missing");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not Found" });
  });
});

import { describe, expect, it } from "vite-plus/test";

import { createApp } from "@api/app.ts";

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

  it("answers JSON for an unmatched route", async () => {
    const response = await createApp().request("/api/missing");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not Found" });
  });
});

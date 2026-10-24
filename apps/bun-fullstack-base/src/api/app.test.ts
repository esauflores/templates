import { basicAuth } from "hono/basic-auth";
import { HTTPException } from "hono/http-exception";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createApp } from "@/api/app.ts";

import { version } from "../../package.json";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("app", () => {
  it("answers the health check, with security headers", async () => {
    const response = await createApp().request("/api/health");

    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });

  it("serves an OpenAPI document of the routes, with the Error its 400s point to, and no /health", async () => {
    const response = await createApp().request("/api/openapi.json");
    const doc = (await response.json()) as {
      openapi: string;
      info: { version: string };
      paths: Record<string, unknown>;
      components: { schemas: Record<string, unknown> };
    };

    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info.version).toBe(version);
    expect(Object.keys(doc.paths)).toContain("/api/hello/{name}");
    expect(Object.keys(doc.paths)).not.toContain("/api/health");
    expect(doc.components.schemas).toHaveProperty("Error");
  });

  it("serves Swagger UI on the document at /api/docs", async () => {
    const response = await createApp().request("/api/docs");

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("/api/openapi.json");
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
      expect(await response.json()).toEqual({ error: `The request body is over ${1024 * 1024} bytes` });
    }
  });

  it("takes the body limit from MAX_BODY_BYTES", async () => {
    vi.stubEnv("MAX_BODY_BYTES", "16");

    const response = await createApp().request("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "20" },
      body: JSON.stringify({ text: "too long" }),
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "The request body is over 16 bytes" });
  });

  it("logs each request on arrival and once answered, but not the health check", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const app = createApp();

    await app.request("/api/health");
    expect(log).not.toHaveBeenCalled();

    await app.request("/api/hello/world");
    expect(log.mock.calls.map(([line]) => line)).toEqual([
      "<-- GET /api/hello/world",
      expect.stringMatching(/^--> GET \/api\/hello\/world .*200.* \d+ms$/),
    ]);
    log.mockRestore();
  });

  it("answers JSON for an unmatched route", async () => {
    const response = await createApp().request("/api/missing");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not Found" });
  });
});

describe("errors", () => {
  /** The app, with a route of the test's own under /api/test. */
  const appWith = (handler: () => never) => {
    const app = createApp();
    app.get("/test", handler);
    return app;
  };

  it("answers a thrown HTTPException's status and message as JSON, 5xx included", async () => {
    for (const [status, message] of [
      [418, "I'm a teapot"],
      [503, "Down for maintenance"],
    ] as const) {
      const response = await appWith(() => {
        throw new HTTPException(status, { message });
      }).request("/api/test");

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: message });
    }
  });

  it("keeps the response middleware built, headers included", async () => {
    const app = createApp();
    app.use("/private", basicAuth({ username: "user", password: "pass" }));
    app.get("/private", (c) => c.text("ok"));
    const response = await app.request("/api/private");

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("Basic");
  });

  it("hides the details of an unexpected error, and logs it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await appWith(() => {
      throw new Error("connection refused at 10.0.0.5");
    }).request("/api/test");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal Server Error" });
    expect(log).toHaveBeenCalledOnce();
  });
});

import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { clientIp, rateLimit } from "@api/core/rate-limit.ts";

/** The env a Bun server passes with each request, with the connection's address. */
const connectionFrom = (address: string) => ({ requestIP: () => ({ address }) });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("rateLimit", () => {
  const limited = () => new Hono().use(rateLimit({ limit: 2, windowMs: 60_000 })).get("/", (c) => c.text("ok"));

  it("answers 429 { error } past the limit, with Retry-After", async () => {
    const app = limited();
    const env = connectionFrom("203.0.113.1");

    expect((await app.request("/", {}, env)).status).toBe(200);
    expect((await app.request("/", {}, env)).headers.get("RateLimit-Remaining")).toBe("0");

    const response = await app.request("/", {}, env);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "Too many requests, please try again later" });
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("counts each client on its own", async () => {
    const app = limited();
    await app.request("/", {}, connectionFrom("203.0.113.1"));
    await app.request("/", {}, connectionFrom("203.0.113.1"));

    expect((await app.request("/", {}, connectionFrom("203.0.113.2"))).status).toBe(200);
  });
});

describe("clientIp", () => {
  const ipOf = async (headers: Record<string, string>, env?: object) => {
    const response = await new Hono().get("/", (c) => c.text(clientIp(c))).request("/", { headers }, env);
    return response.text();
  };

  it("is the connection's address", async () => {
    expect(await ipOf({ "x-forwarded-for": "198.51.100.9" }, connectionFrom("203.0.113.1"))).toBe("203.0.113.1");
  });

  it("is the address the proxy added, behind one", async () => {
    vi.stubEnv("TRUST_PROXY", "true");

    const headers = { "x-forwarded-for": "198.51.100.9, 203.0.113.7" };
    expect(await ipOf(headers, connectionFrom("10.0.0.2"))).toBe("203.0.113.7");
  });

  it("is one shared key without a connection", async () => {
    expect(await ipOf({})).toBe("unknown");
  });
});

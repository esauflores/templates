import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { HTTPException } from "hono/http-exception";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { onError } from "@api/core/errors.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("onError", () => {
  const appWith = (configure: (app: Hono) => void) => {
    const app = new Hono();
    app.onError(onError);
    configure(app);
    return app;
  };

  it("answers a thrown HTTPException's message as JSON", async () => {
    const app = appWith((app) =>
      app.get("/teapot", () => {
        throw new HTTPException(418, { message: "I'm a teapot" });
      }),
    );
    const response = await app.request("/teapot");

    expect(response.status).toBe(418);
    expect(await response.json()).toEqual({ error: "I'm a teapot" });
  });

  it("keeps the response middleware built, headers included", async () => {
    const app = appWith((app) => {
      app.use("/private", basicAuth({ username: "user", password: "pass" }));
      app.get("/private", (c) => c.text("ok"));
    });
    const response = await app.request("/private");

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("Basic");
  });

  it("hides the details of an unexpected error, and logs it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = appWith((app) =>
      app.get("/boom", () => {
        throw new Error("connection refused at 10.0.0.5");
      }),
    );
    const response = await app.request("/boom");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal Server Error" });
    expect(log).toHaveBeenCalledOnce();
  });

  it("keeps a deliberate 5xx status, but not its message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const app = appWith((app) =>
      app.get("/busy", () => {
        throw new HTTPException(503, { message: "database pool exhausted" });
      }),
    );
    const response = await app.request("/busy");

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Internal Server Error" });
  });
});

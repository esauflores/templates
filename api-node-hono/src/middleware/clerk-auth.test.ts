// External
import { describe, expect, it, vi } from "vitest";

// App
import { testBindings } from "@/env";
import app from "@/index";

// Clerk verification is a hosted-service call — mock it. `Bearer session-good`
// stands in for a valid session JWT, `Bearer apikey-good` for a Clerk API key.
vi.mock("@clerk/backend", () => ({
  createClerkClient: () => ({
    authenticateRequest: async (req: Request) => {
      const header = req.headers.get("authorization") ?? "";
      if (header === "Bearer session-good") {
        return { isAuthenticated: true, toAuth: () => ({ tokenType: "session_token", userId: "user_sess" }) };
      }
      if (header === "Bearer apikey-good") {
        return {
          isAuthenticated: true,
          toAuth: () => ({ tokenType: "api_key", userId: "user_key", subject: "user_key" }),
        };
      }
      return { isAuthenticated: false, toAuth: () => ({}) };
    },
  }),
}));

const clerkEnv = { ...testBindings, AUTH_PROVIDER: "clerk" as const };

const session = (authorization?: string) =>
  app.request("/api/auth/session", { headers: authorization ? { authorization } : {} }, clerkEnv);

describe("Clerk auth gate (AUTH_PROVIDER=clerk)", () => {
  it("401s without a token", async () => {
    expect((await session()).status).toBe(401);
  });

  it("401s an unrecognised token", async () => {
    expect((await session("Bearer nope")).status).toBe(401);
  });

  it("accepts a Clerk session JWT and reports the user id", async () => {
    const res = await session("Bearer session-good");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "user_sess" });
  });

  it("accepts a Clerk API key", async () => {
    const res = await session("Bearer apikey-good");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "user_key" });
  });

  it("gates feature routes the same way", async () => {
    // `requireAuth` is wired on `/api/v1/*` too — no token → rejected before any handler.
    const res = await app.request("/api/v1/widgets", {}, clerkEnv);
    expect(res.status).toBe(401);
  });

  it("404s the Better Auth catch-all under Clerk", async () => {
    const res = await app.request("/api/auth/sign-in/email", { method: "POST" }, clerkEnv);
    expect(res.status).toBe(404);
  });
});

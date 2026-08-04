// External
import type { Context } from "hono";
import { describe, it, expect, vi, beforeEach } from "vitest";

// App
import type { Bindings } from "@/env";

// Test Setup
vi.mock("@/infrastructure/auth", async () => {
  const { auth } = await import("@/tests/fixtures/auth");
  return { auth };
});

vi.mock("@/infrastructure/db", async () => {
  const { db } = await import("@/tests/fixtures/db");
  return { db };
});

// Middleware
import { requireVerifiedApiKey, clearVerifiedCache } from "./auth";

// Test Fixtures
import { makeUser, makeKey, makeVerifiedUserWithKey } from "@/tests/fixtures/auth";
import { resetDatabase } from "@/tests/fixtures/db";

// Helper Functions
const makeContext = (apiKeyHeader: string | undefined) =>
  ({
    req: {
      header: (name: string) => (name.toLowerCase() === "x-api-key" ? apiKeyHeader : undefined),
    },
  }) as Context<{ Bindings: Bindings }>;

const makeNext = () => vi.fn().mockResolvedValue(undefined);

describe("requireVerifiedApiKey", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearVerifiedCache();
  });

  it("401 Missing API Key when X-API-Key header is absent", async () => {
    const c = makeContext(undefined);
    const next = makeNext();
    await expect(requireVerifiedApiKey(c, next)).rejects.toMatchObject({
      status: 401,
      message: "Missing API Key",
    });
  });

  it("401 Invalid API Key when the key is not in the apikey table", async () => {
    const c = makeContext("pk_garbage");
    const next = makeNext();
    await expect(requireVerifiedApiKey(c, next)).rejects.toMatchObject({
      status: 401,
      message: "Invalid API Key",
    });
  });

  it("401 Invalid API Key when the apikey has empty referenceId (schema drift guard)", async () => {
    const key = await makeKey("");
    const c = makeContext(key);
    const next = makeNext();
    await expect(requireVerifiedApiKey(c, next)).rejects.toMatchObject({
      status: 401,
      message: "Invalid API Key",
    });
  });

  it("403 Email Not Verified when the user has emailVerified = false", async () => {
    const u = await makeUser("user-403", false);
    const key = await makeKey(u.id);
    const c = makeContext(key);
    const next = makeNext();
    await expect(requireVerifiedApiKey(c, next)).rejects.toMatchObject({
      status: 403,
      message: "Email Not Verified",
    });
  });

  it("403 Email Not Verified when the user does not exist at all", async () => {
    const key = await makeKey("ghost");
    const c = makeContext(key);
    const next = makeNext();
    await expect(requireVerifiedApiKey(c, next)).rejects.toMatchObject({
      status: 403,
      message: "Email Not Verified",
    });
  });

  it("calls next() when the user exists and is verified", async () => {
    const key = await makeVerifiedUserWithKey("user-ok");
    const c = makeContext(key);
    const next = makeNext();
    await requireVerifiedApiKey(c, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows repeated requests with the same verified API key", async () => {
    const key = await makeVerifiedUserWithKey("user-cache");
    const c = makeContext(key);
    const next = makeNext();
    await requireVerifiedApiKey(c, next);
    await requireVerifiedApiKey(c, next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});

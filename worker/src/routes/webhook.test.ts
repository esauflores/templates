// External
import type { Context } from "hono";
import { describe, expect, it, vi } from "vitest";

// App
import type { Bindings } from "@/env";
import { testBindings } from "@/env";

// Infrastructure
import { webhook as webhookClient } from "@/infrastructure/webhook/standardwebhooks";

// Routes
import { webhook } from "./webhook";

// Helper Functions
const makeContext = (body: string, headers: Record<string, string>) => {
  const json = vi.fn().mockReturnValue("response");
  return {
    req: {
      header: (name: string) => headers[name.toLowerCase()],
      text: () => Promise.resolve(body),
    },
    env: testBindings,
    json,
  } as unknown as Context<{ Bindings: Bindings }>;
};

describe("webhook", () => {
  it("401 when required headers are missing", async () => {
    const c = makeContext("payload", {});
    await expect(webhook(c)).rejects.toMatchObject({ status: 401, message: "Invalid Signature" });
  });

  it("401 when signature does not match body", async () => {
    const headers = webhookClient.sign(testBindings, "different-body");
    const c = makeContext("payload", headers);
    await expect(webhook(c)).rejects.toMatchObject({ status: 401, message: "Invalid Signature" });
  });

  it("401 when timestamp is outside the tolerance window", async () => {
    const headers = webhookClient.sign(testBindings, "payload", new Date(Date.now() - 10 * 60 * 1000));
    const c = makeContext("payload", headers);
    await expect(webhook(c)).rejects.toMatchObject({ status: 401, message: "Invalid Signature" });
  });

  it("200 when signature is valid", async () => {
    const body = '{"event":"test"}';
    const headers = webhookClient.sign(testBindings, body);
    const c = makeContext(body, headers);
    const res = await webhook(c);
    expect(res).toBe("response");
    expect(c.json).toHaveBeenCalledWith({ ok: true });
  });
});

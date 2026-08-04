// External
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

// App
import type { Bindings } from "@/env";

// Infrastructure
import { webhook as webhookClient } from "@/infrastructure/webhook/standardwebhooks";

export const webhook = async (c: Context<{ Bindings: Bindings }>) => {
  const body = await c.req.text();

  try {
    webhookClient.verify(c.env, body, {
      "webhook-id": c.req.header("webhook-id") ?? "",
      "webhook-timestamp": c.req.header("webhook-timestamp") ?? "",
      "webhook-signature": c.req.header("webhook-signature") ?? "",
    });
  } catch {
    throw new HTTPException(401, { message: "Invalid Signature" });
  }

  console.log("webhook received", body.length, "bytes");
  return c.json({ ok: true });
};

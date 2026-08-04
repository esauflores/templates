// External
import { Webhook } from "standardwebhooks";

// App
import type { Bindings } from "@/env";

export const webhook = {
  sign: (env: Bindings, body: string, timestamp: Date = new Date()) => {
    const msgId = `msg_${crypto.randomUUID()}`;
    const signature = new Webhook(env.WEBHOOK_SECRET).sign(msgId, timestamp, body);
    return {
      "webhook-id": msgId,
      "webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
      "webhook-signature": signature,
    };
  },

  verify: (env: Bindings, body: string, headers: Record<string, string>) => {
    new Webhook(env.WEBHOOK_SECRET).verify(body, {
      "webhook-id": headers["webhook-id"] ?? "",
      "webhook-timestamp": headers["webhook-timestamp"] ?? "",
      "webhook-signature": headers["webhook-signature"] ?? "",
    });
  },
};

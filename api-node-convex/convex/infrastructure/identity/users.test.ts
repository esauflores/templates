import { asUser, rejectionCode, setup } from "@test/harness";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/_generated/api";

// Stub Svix verification: valid unless the payload carries `__bad`.
vi.mock("svix", () => ({
  Webhook: class {
    verify(payload: string) {
      const parsed = JSON.parse(payload);
      if (parsed.__bad) throw new Error("invalid signature");
      return parsed;
    }
  },
}));

const clerkUser = (id: string, over: Record<string, unknown> = {}) => ({
  type: "user.created",
  data: {
    id,
    email_addresses: [{ email_address: `${id}@example.com` }],
    first_name: "Ada",
    last_name: "Lovelace",
    image_url: "https://img.example/ada.png",
    ...over,
  },
});

const post = (t: ReturnType<typeof setup>, body: unknown) =>
  t.fetch("/webhooks/clerk", {
    method: "POST",
    headers: { "content-type": "application/json", "svix-id": "1", "svix-timestamp": "1", "svix-signature": "x" },
    body: JSON.stringify(body),
  });

describe("Clerk user sync", () => {
  beforeEach(() => vi.stubEnv("CLERK_WEBHOOK_SECRET", "whsec_test"));
  afterEach(() => vi.unstubAllEnvs());

  it("creates a user row on user.created, readable via users.current", async () => {
    const t = setup();
    expect((await post(t, clerkUser("user_ada"))).status).toBe(200);

    const me = await t.withIdentity({ subject: "user_ada" }).query(api.infrastructure.identity.users.current, {});
    expect(me).toMatchObject({ clerkId: "user_ada", email: "user_ada@example.com", name: "Ada Lovelace" });
  });

  it("updates on user.updated and removes on user.deleted", async () => {
    const t = setup();
    await post(t, clerkUser("user_ada"));

    await post(t, { type: "user.updated", data: { id: "user_ada", first_name: "Augusta", last_name: "King" } });
    const ada = t.withIdentity({ subject: "user_ada" });
    expect((await ada.query(api.infrastructure.identity.users.current, {}))?.name).toBe("Augusta King");

    await post(t, { type: "user.deleted", data: { id: "user_ada" } });
    expect(await ada.query(api.infrastructure.identity.users.current, {})).toBeNull();
  });

  it("400s an invalid signature", async () => {
    expect((await post(setup(), { __bad: true, type: "user.created", data: { id: "x" } })).status).toBe(400);
  });

  it("current is null before the webhook lands, and needs auth", async () => {
    expect(await asUser("user_nobody").query(api.infrastructure.identity.users.current, {})).toBeNull();
    expect(await rejectionCode(setup().query(api.infrastructure.identity.users.current, {}))).toBe("UNAUTHENTICATED");
  });
});

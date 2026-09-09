import { asUser } from "@test/harness";
import { describe, expect, it } from "vitest";

import { api } from "@/_generated/api";

describe("tickets (CRUD)", () => {
  it("creates, updates and lists, scoped to the caller", async () => {
    const alice = asUser("alice");

    const t = await alice.mutation(api.features.support.tickets.create, {
      subject: "Login broken",
      body: "500 on submit",
      priority: "high",
      status: "open",
    });
    expect(t).toMatchObject({ subject: "Login broken", priority: "high", ownerId: "alice" });

    await alice.mutation(api.features.support.tickets.update, { id: t._id, status: "closed" });
    expect((await alice.query(api.features.support.tickets.get, { id: t._id }))?.status).toBe("closed");

    expect(await asUser("bob").query(api.features.support.tickets.list, {})).toEqual([]);
  });
});

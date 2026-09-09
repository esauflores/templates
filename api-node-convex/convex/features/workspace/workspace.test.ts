import { asUser } from "@test/harness";
import { describe, expect, it } from "vitest";

import { api } from "@/_generated/api";

describe("projects (CRUD)", () => {
  it("creates, updates and lists, scoped to the caller", async () => {
    const alice = asUser("alice");

    const p = await alice.mutation(api.features.workspace.projects.create, { name: "Launch", status: "active" });
    expect(p).toMatchObject({ name: "Launch", status: "active", ownerId: "alice" });

    await alice.mutation(api.features.workspace.projects.update, { id: p._id, status: "completed" });
    expect((await alice.query(api.features.workspace.projects.get, { id: p._id }))?.status).toBe("completed");

    expect(await asUser("bob").query(api.features.workspace.projects.list, {})).toEqual([]);
  });
});

import { mockModel } from "@convex-dev/agent";
import { asUser, errorOf, rejectionCode, setup } from "@test/harness";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { api } from "@/_generated/api";

const REPLY = "Sure.";
const page = { paginationOpts: { cursor: null, numItems: 20 } };

// Replace the real Mistral model so this suite never needs a network call or a
// key. Hoisted, and must land before `agent.ts` constructs `new Agent(...)`.
vi.mock("./model", () => ({
  chatModel: mockModel({ content: [{ type: "text", text: REPLY }] }),
}));

beforeAll(async () => {
  // The mock is hoisted, but Vitest still needs the module graph to pick it up
  // before the first `convex-test` import.meta.glob evaluation. Importing the
  // agent here forces that order inside this file.
  await import("./agent");
});

describe("assistant threads", () => {
  it("creates, lists, and removes, scoped to the caller", async () => {
    const t = setup();
    const alice = t.withIdentity({ subject: "alice" });
    const bob = t.withIdentity({ subject: "bob" });

    const { threadId } = await alice.mutation(api.features.assistant.threads.create, { title: "Pricing" });
    expect(threadId).toEqual(expect.any(String));

    const listed = await alice.query(api.features.assistant.threads.list, page);
    expect(listed.page).toMatchObject([{ _id: threadId, title: "Pricing", userId: "alice" }]);

    expect((await bob.query(api.features.assistant.threads.list, page)).page).toEqual([]);
    expect(await rejectionCode(bob.query(api.features.assistant.messages.list, { threadId, ...page }))).toBe(
      "NOT_FOUND",
    );
    expect(await rejectionCode(bob.action(api.features.assistant.messages.ask, { threadId, prompt: "hi" }))).toBe(
      "NOT_FOUND",
    );

    await alice.mutation(api.features.assistant.threads.remove, { threadId });
    expect((await alice.query(api.features.assistant.threads.list, page)).page).toEqual([]);
  });

  it("requires authentication", async () => {
    expect(await rejectionCode(setup().query(api.features.assistant.threads.list, page))).toBe("UNAUTHENTICATED");
  });
});

describe("assistant messages", () => {
  it("saves the prompt and a mocked reply", async () => {
    const alice = asUser("alice");
    const { threadId } = await alice.mutation(api.features.assistant.threads.create, {});

    expect(await alice.action(api.features.assistant.messages.ask, { threadId, prompt: "Hello" })).toEqual({
      text: REPLY,
    });

    const messages = await alice.query(api.features.assistant.messages.list, { threadId, ...page });
    expect(messages.page.map((m) => ({ role: m.role, text: m.text }))).toEqual(
      expect.arrayContaining([
        { role: "user", text: "Hello" },
        { role: "assistant", text: REPLY },
      ]),
    );
  });

  it("refuses a fourth ask once the AI budget is empty", async () => {
    const alice = asUser("alice");
    const { threadId } = await alice.mutation(api.features.assistant.threads.create, {});

    for (let i = 0; i < 3; i++) {
      await alice.action(api.features.assistant.messages.ask, { threadId, prompt: `q${i}` });
    }
    expect(
      await rejectionCode(alice.action(api.features.assistant.messages.ask, { threadId, prompt: "one too many" })),
    ).toBe("RATE_LIMITED");
  });
});

describe("assistant REST", () => {
  const headers = { "content-type": "application/json" };

  it("creates a thread, asks, lists messages, and deletes over HTTP", async () => {
    const alice = asUser("alice");

    const created = await alice.fetch("/threads", {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "Q" }),
    });
    expect(created.status).toBe(201);
    const { threadId } = (await created.json()) as { threadId: string };

    const asked = await alice.fetch(`/threads/${threadId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt: "Hello" }),
    });
    expect(await asked.json()).toEqual({ text: REPLY });

    const messages = (await alice.fetch(`/threads/${threadId}/messages`, {}).then((r) => r.json())) as {
      items: { role: string; text: string }[];
    };
    expect(messages.items.map((m) => m.role)).toEqual(expect.arrayContaining(["user", "assistant"]));

    expect((await alice.fetch(`/threads/${threadId}`, { method: "DELETE" })).status).toBe(204);
    expect((await alice.fetch("/threads", {}).then((r) => r.json())) as { items: unknown[] }).toMatchObject({
      items: [],
      isDone: true,
    });
  });

  it("401s an unauthenticated request", async () => {
    expect(await errorOf(await setup().fetch("/threads", {}))).toEqual({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });
});

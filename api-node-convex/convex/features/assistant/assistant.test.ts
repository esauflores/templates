import { mockModel } from "@convex-dev/agent";
import { asUser, errorOf, rejectionCode, setup } from "@test/harness";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { api } from "@/_generated/api";

const REPLY = "Sure.";

vi.mock("./model", () => ({
  chatModel: mockModel({ content: [{ type: "text", text: REPLY }] }),
}));

beforeAll(async () => {
  await import("./agent");
});

describe("assistant", () => {
  it("creates a caller-owned thread and saves a mocked reply", async () => {
    const alice = asUser("alice");
    const { threadId } = await alice.mutation(api.features.assistant.threads.create, {});
    expect(await alice.action(api.features.assistant.messages.ask, { threadId, prompt: "Hello" })).toEqual({
      text: REPLY,
    });
    expect(
      await rejectionCode(asUser("bob").action(api.features.assistant.messages.ask, { threadId, prompt: "Hi" })),
    ).toBe("NOT_FOUND");
  });

  it("works over the two example HTTP routes", async () => {
    const alice = asUser("alice");
    const headers = { "content-type": "application/json" };
    const created = await alice.fetch("/threads", { method: "POST", headers, body: JSON.stringify({}) });
    const { threadId } = (await created.json()) as { threadId: string };
    const asked = await alice.fetch(`/threads/${threadId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt: "Hello" }),
    });
    expect(await asked.json()).toEqual({ text: REPLY });
    expect(
      await errorOf(await setup().fetch("/threads", { method: "POST", headers, body: JSON.stringify({}) })),
    ).toEqual({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });
});

// External
import { describe, expect, it } from "vitest";

// Feature
import { buildChatMessages } from "./prompt";

describe("buildChatMessages", () => {
  it("grounds the user message on chunk ids and contents", () => {
    const messages = buildChatMessages("What is an array?", [
      { id: "c0", content: "An array is a contiguous sequence of elements." },
      { id: "c1", content: "Index from zero for constant-time access." },
    ]);

    expect(messages[0]).toEqual({
      role: "system",
      content:
        "Answer only from the provided chunks. Be brief. If the chunks do not contain the answer, say you do not know.",
    });
    expect(messages[1]?.role).toBe("user");
    expect(messages[1]?.content).toContain("[c0]\nAn array is a contiguous sequence of elements.");
    expect(messages[1]?.content).toContain("[c1]\nIndex from zero for constant-time access.");
    expect(messages[1]?.content).toContain("Question: What is an array?");
  });
});

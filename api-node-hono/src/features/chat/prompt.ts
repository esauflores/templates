// Infrastructure
import type { ChatMessage } from "@/infrastructure/mistral";

export function buildChatMessages(question: string, chunks: { id: string; content: string }[]): ChatMessage[] {
  const context = chunks.map((c) => `[${c.id}]\n${c.content}`).join("\n\n");
  return [
    {
      role: "system",
      content:
        "Answer only from the provided chunks. Be brief. If the chunks do not contain the answer, say you do not know.",
    },
    { role: "user", content: `Chunks:\n\n${context}\n\nQuestion: ${question}` },
  ];
}

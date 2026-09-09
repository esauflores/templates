import { useCallback, useState } from "react";

import { type ChatMessage, type Conversation, CONVERSATIONS } from "#/features/ai/data/conversations";
import { daysAgo } from "#/lib/format";

const KEY = "web:ai-conversations";
const uid = () => crypto.randomUUID();

const load = (): Conversation[] => {
  if (typeof localStorage === "undefined") return CONVERSATIONS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : CONVERSATIONS;
  } catch {
    return CONVERSATIONS;
  }
};

/** localStorage-backed conversation store — the swap point for a real `/conversations` API. */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(load);

  const persist = useCallback((next: Conversation[]) => {
    setConversations(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const create = useCallback((): string => {
    const id = uid();
    persist([{ id, title: "New chat", messages: [], updatedAt: daysAgo(0) }, ...load()]);
    return id;
  }, [persist]);

  const remove = useCallback((id: string) => persist(load().filter((c) => c.id !== id)), [persist]);

  const rename = useCallback(
    (id: string, title: string) => persist(load().map((c) => (c.id === id ? { ...c, title } : c))),
    [persist],
  );

  /** Replace a conversation's messages (used while streaming) and bump its title/timestamp. */
  const setMessages = useCallback(
    (id: string, messages: ChatMessage[]) =>
      persist(
        load().map((c) => {
          if (c.id !== id) return c;
          const firstUser = messages.find((m) => m.role === "user")?.content;
          return {
            ...c,
            messages,
            updatedAt: daysAgo(0),
            title: c.title === "New chat" && firstUser ? firstUser.slice(0, 40) : c.title,
          };
        }),
      ),
    [persist],
  );

  return { conversations, create, remove, rename, setMessages };
}

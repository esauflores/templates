import { daysAgo } from "#/lib/format";

export type ChatRole = "user" | "assistant";
export type ChatMessage = { id: string; role: ChatRole; content: string };

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
};

export const CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    title: "Weekly revenue check",
    updatedAt: daysAgo(1),
    messages: [
      { id: "m1", role: "user", content: "How did revenue trend over the last 4 weeks?" },
      {
        id: "m2",
        role: "assistant",
        content:
          "Revenue is **up ~12%** over the last 4 weeks, driven mainly by the *pro* tier.\n\n- Week 1: $4.1k\n- Week 2: $4.4k\n- Week 3: $4.0k\n- Week 4: $4.6k\n\nOne refund in week 3 explains the dip. Nothing alarming.",
      },
    ],
  },
];

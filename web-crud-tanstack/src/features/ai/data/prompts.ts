import { daysAgo } from "#/lib/format";

export const PROMPT_CATEGORIES = ["Writing", "Code", "Analysis", "Support", "Other"] as const;
export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

export type Prompt = {
  id: string;
  title: string;
  /** Body with `{{variable}}` placeholders. */
  body: string;
  category: PromptCategory;
  /** Comma-separated free tags. */
  tags: string;
  updatedAt: string;
};

export const PROMPTS: Prompt[] = [
  {
    id: "p1",
    title: "Summarise a customer",
    body: "Summarise the account for {{customer}} in 3 bullets: health, revenue trend, and the single most useful next action.",
    category: "Analysis",
    tags: "customers, summary",
    updatedAt: daysAgo(2),
  },
  {
    id: "p2",
    title: "Draft a release note",
    body: "Write a short, upbeat changelog entry for this change:\n\n{{change}}\n\nKeep it under 60 words, no marketing fluff.",
    category: "Writing",
    tags: "changelog, writing",
    updatedAt: daysAgo(5),
  },
  {
    id: "p3",
    title: "Explain this code",
    body: "Explain what the following code does, call out any bugs or edge cases, and suggest one improvement:\n\n```\n{{code}}\n```",
    category: "Code",
    tags: "code, review",
    updatedAt: daysAgo(1),
  },
  {
    id: "p4",
    title: "Reply to a support ticket",
    body: "A customer wrote:\n\n{{message}}\n\nDraft a friendly, specific reply. If you need info to resolve it, ask for exactly that.",
    category: "Support",
    tags: "support, email",
    updatedAt: daysAgo(8),
  },
  {
    id: "p5",
    title: "Turn notes into tasks",
    body: "Convert these meeting notes into a checklist of clear, assignable tasks:\n\n{{notes}}",
    category: "Other",
    tags: "productivity",
    updatedAt: daysAgo(12),
  },
];

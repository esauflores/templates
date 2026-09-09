import type { ChatMessage, ChatRole } from "#/features/ai/data/conversations";
import { type AiProvider, MODELS_BY_PROVIDER } from "#/features/ai/data/models";

export type AiConfig = {
  provider: AiProvider;
  model: string;
  /** Kept in localStorage only — never sent anywhere by the mock. */
  apiKey: string;
  /** Used when `provider === "custom"`. */
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
};

export const DEFAULT_AI_CONFIG: AiConfig = {
  provider: "mock",
  model: MODELS_BY_PROVIDER.mock[1],
  apiKey: "",
  baseUrl: "",
  temperature: 0.7,
  maxTokens: 1024,
  systemPrompt: "You are a concise assistant embedded in an admin dashboard. Prefer bullet points and short answers.",
};

const KEY = "web:ai-config";

export const loadAiConfig = (): AiConfig => {
  if (typeof localStorage === "undefined") return DEFAULT_AI_CONFIG;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_AI_CONFIG, ...(JSON.parse(raw) as Partial<AiConfig>) } : DEFAULT_AI_CONFIG;
  } catch {
    return DEFAULT_AI_CONFIG;
  }
};

export const saveAiConfig = (config: AiConfig) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    /* private mode / disabled storage */
  }
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Very rough token count — enough for the mock usage estimate. */
export const estimateTokens = (text: string) => Math.max(1, Math.round(text.length / 4));

// --- Mock reply generation -------------------------------------------------

const canned = (messages: ChatMessage[]): string => {
  const last =
    [...messages]
      .reverse()
      .find((m) => m.role === "user")
      ?.content.toLowerCase() ?? "";
  if (/\bcode\b|function|bug|typescript|react/.test(last)) {
    return "Here's a tightened version:\n\n```ts\nconst sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);\n```\n\n- pure, no mutation\n- `O(n)`\n- returns `0` for an empty array";
  }
  if (/\b(list|steps|how do i|checklist)\b/.test(last)) {
    return "A few steps:\n\n1. Clarify the goal in one sentence.\n2. Pull the data you already have.\n3. Do the smallest thing that could work.\n4. Check it, then iterate.";
  }
  if (/\b(revenue|customers|report|trend|metric)\b/.test(last)) {
    return "From the dashboard data:\n\n- **Customers** are up week over week.\n- **MRR** is flat — expansion is offsetting churn.\n- Watch **open invoices**; two are past due.\n\n_This is mock output — wire a real model in `src/features/ai/lib/ai.ts`._";
  }
  return "Got it. This template ships a **mock** assistant so the chat works offline — responses are scripted and streamed token-by-token.\n\nTo use a real model, set your provider and key in **AI settings**, then implement the non-mock branch of `streamChat` in `src/features/ai/lib/ai.ts`.";
};

export type StreamOptions = { config: AiConfig; signal?: AbortSignal };

/**
 * Streams an assistant reply chunk-by-chunk.
 *
 * **Mock** (default): scripted answer, ~1 word per 25–55ms.
 * **Real**: replace the `else` branch with a call to your provider — e.g. the
 * OpenAI/Anthropic SSE endpoint, or a TanStack Start server route that proxies
 * it — yielding text deltas as they arrive.
 */
export async function* streamChat(
  messages: ChatMessage[],
  { config, signal }: StreamOptions,
): AsyncGenerator<string, void, unknown> {
  if (config.provider === "mock") {
    const words = canned(messages).split(/(\s+)/);
    for (const w of words) {
      if (signal?.aborted) return;
      await sleep(25 + Math.random() * 30);
      yield w;
    }
    return;
  }

  // --- real provider goes here ---
  throw new Error(
    `Provider "${config.provider}" isn't wired. Implement it in src/features/ai/lib/ai.ts (stream deltas from your API using config.apiKey / config.baseUrl).`,
  );
}

export type { ChatMessage, ChatRole };

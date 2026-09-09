export const AI_PROVIDERS = ["mock", "openai", "anthropic", "custom"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/** Model options per provider (mock has its own so the demo works offline). */
export const MODELS_BY_PROVIDER: Record<AiProvider, string[]> = {
  mock: ["mock-fast", "mock-balanced", "mock-smart"],
  openai: ["gpt-4o-mini", "gpt-4o", "o4-mini"],
  anthropic: ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-5"],
  custom: ["custom-model"],
};

/** Rough $/1M tokens (in, out) — used by the mock usage estimate only. */
export const MODEL_RATES: Record<string, [number, number]> = {
  "mock-fast": [0, 0],
  "mock-balanced": [0, 0],
  "mock-smart": [0, 0],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4o": [2.5, 10],
  "o4-mini": [1.1, 4.4],
  "claude-haiku-4-5": [1, 5],
  "claude-sonnet-5": [3, 15],
  "claude-opus-5": [15, 75],
};

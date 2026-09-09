import { mistral } from "@ai-sdk/mistral";

/**
 * The language model, deliberately alone in its own module.
 *
 * Two reasons. Tests replace this file wholesale (`vi.mock("./model")`) with a
 * stub model, so the suite never needs a network call or an API key. And
 * swapping providers — `@ai-sdk/openai`, `@ai-sdk/anthropic`, a local Ollama —
 * is a one-line edit here rather than a change to the agent or any function.
 *
 * The AI SDK reads `MISTRAL_API_KEY` from the environment at request time, and
 * on Convex that means the **deployment's** environment, not a `.env` file:
 *
 *   pnpm dlx convex env set MISTRAL_API_KEY <your key>
 *
 * Nothing throws at import time if it's missing; the first `generateText` does.
 */
export const chatModel = mistral("mistral-small-latest");

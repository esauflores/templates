import { createFileRoute } from "@tanstack/react-router";

import { AssistantContent } from "#/features/ai/AssistantContent";

type AssistantSearch = { seed?: string };

export const Route = createFileRoute("/_app/assistant")({
  validateSearch: (search: Record<string, unknown>): AssistantSearch =>
    typeof search.seed === "string" && search.seed ? { seed: search.seed } : {},
  head: () => ({ meta: [{ title: "Assistant" }] }),
  component: AssistantContent,
});

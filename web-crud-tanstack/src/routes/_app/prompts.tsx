import { createFileRoute } from "@tanstack/react-router";

import { PromptsContent } from "#/features/ai/PromptsContent";

export const Route = createFileRoute("/_app/prompts")({
  head: () => ({ meta: [{ title: "Prompts" }] }),
  component: PromptsContent,
});

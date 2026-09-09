import { createFileRoute } from "@tanstack/react-router";

import { AiSettingsContent } from "#/features/ai/AiSettingsContent";

export const Route = createFileRoute("/_app/ai-settings")({
  head: () => ({ meta: [{ title: "AI settings" }] }),
  component: AiSettingsContent,
});

import { createFileRoute } from "@tanstack/react-router";

import { SettingsContent } from "#/features/account/SettingsContent";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings" }] }),
  component: SettingsContent,
});

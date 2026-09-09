import { createFileRoute } from "@tanstack/react-router";

import { ChangelogContent } from "#/features/account/ChangelogContent";

export const Route = createFileRoute("/_app/changelog")({
  head: () => ({ meta: [{ title: "Changelog" }] }),
  component: ChangelogContent,
});

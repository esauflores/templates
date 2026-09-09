import { createFileRoute } from "@tanstack/react-router";

import { ActivityContent } from "#/features/support/ActivityContent";

export const Route = createFileRoute("/_app/activity")({
  head: () => ({ meta: [{ title: "Activity" }] }),
  component: ActivityContent,
});

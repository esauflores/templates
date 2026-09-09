import { createFileRoute } from "@tanstack/react-router";

import { OverviewContent } from "#/features/overview/OverviewContent";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Overview" }] }),
  component: OverviewContent,
});

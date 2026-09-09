import { createFileRoute } from "@tanstack/react-router";

import { ReportsContent } from "#/features/overview/ReportsContent";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports" }] }),
  component: ReportsContent,
});

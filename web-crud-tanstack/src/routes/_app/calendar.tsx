import { createFileRoute } from "@tanstack/react-router";

import { CalendarContent } from "#/features/workspace/CalendarContent";

export const Route = createFileRoute("/_app/calendar")({
  head: () => ({ meta: [{ title: "Calendar" }] }),
  component: CalendarContent,
});

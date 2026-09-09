import { createFileRoute } from "@tanstack/react-router";

import { TicketsContent } from "#/features/support/TicketsContent";

export const Route = createFileRoute("/_app/tickets")({
  head: () => ({ meta: [{ title: "Tickets" }] }),
  component: TicketsContent,
});

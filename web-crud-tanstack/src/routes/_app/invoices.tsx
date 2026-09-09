import { createFileRoute } from "@tanstack/react-router";

import { InvoicesContent } from "#/features/sales/InvoicesContent";

export const Route = createFileRoute("/_app/invoices")({
  head: () => ({ meta: [{ title: "Invoices" }] }),
  component: InvoicesContent,
});

import { createFileRoute } from "@tanstack/react-router";

import { CustomersContent } from "#/features/sales/CustomersContent";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({ meta: [{ title: "Customers" }] }),
  component: CustomersContent,
});

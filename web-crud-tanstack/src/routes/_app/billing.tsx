import { createFileRoute } from "@tanstack/react-router";

import { BillingContent } from "#/features/account/BillingContent";

export const Route = createFileRoute("/_app/billing")({
  head: () => ({ meta: [{ title: "Billing" }] }),
  component: BillingContent,
});

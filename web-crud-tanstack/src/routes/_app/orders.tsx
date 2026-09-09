import { createFileRoute } from "@tanstack/react-router";

import { OrdersContent } from "#/features/sales/OrdersContent";

export const Route = createFileRoute("/_app/orders")({
  head: () => ({ meta: [{ title: "Orders" }] }),
  component: OrdersContent,
});

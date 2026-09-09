import { createFileRoute } from "@tanstack/react-router";

import { CustomerDetailContent } from "#/features/sales/CustomerDetailContent";

export const Route = createFileRoute("/_app/customers_/$id")({
  head: () => ({ meta: [{ title: "Customer" }] }),
  component: CustomerDetailRoute,
});

function CustomerDetailRoute() {
  const { id } = Route.useParams();
  return <CustomerDetailContent customerId={id} />;
}

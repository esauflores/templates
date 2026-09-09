import { createFileRoute } from "@tanstack/react-router";

import { ProductsContent } from "#/features/sales/ProductsContent";

export const Route = createFileRoute("/_app/products")({
  head: () => ({ meta: [{ title: "Products" }] }),
  component: ProductsContent,
});

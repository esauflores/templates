import { createFileRoute } from "@tanstack/react-router";

import { AccountContent } from "#/features/account/AccountContent";

export const Route = createFileRoute("/_app/account")({
  head: () => ({ meta: [{ title: "Account" }] }),
  component: AccountContent,
});

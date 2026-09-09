import { createFileRoute } from "@tanstack/react-router";

import { GettingStartedContent } from "#/features/account/GettingStartedContent";

export const Route = createFileRoute("/_app/getting-started")({
  head: () => ({ meta: [{ title: "Getting started" }] }),
  component: GettingStartedContent,
});

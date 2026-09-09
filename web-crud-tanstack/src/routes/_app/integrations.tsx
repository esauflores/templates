import { createFileRoute } from "@tanstack/react-router";

import { IntegrationsContent } from "#/features/admin/IntegrationsContent";

export const Route = createFileRoute("/_app/integrations")({
  head: () => ({ meta: [{ title: "Integrations" }] }),
  component: IntegrationsContent,
});

import { createFileRoute } from "@tanstack/react-router";

import { RolesContent } from "#/features/admin/RolesContent";

export const Route = createFileRoute("/_app/roles")({
  head: () => ({ meta: [{ title: "Roles" }] }),
  component: RolesContent,
});

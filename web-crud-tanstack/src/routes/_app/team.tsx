import { createFileRoute } from "@tanstack/react-router";

import { TeamContent } from "#/features/admin/TeamContent";

export const Route = createFileRoute("/_app/team")({
  head: () => ({ meta: [{ title: "Team" }] }),
  component: TeamContent,
});

import { createFileRoute } from "@tanstack/react-router";

import { ProjectsContent } from "#/features/workspace/ProjectsContent";

export const Route = createFileRoute("/_app/projects")({
  head: () => ({ meta: [{ title: "Projects" }] }),
  component: ProjectsContent,
});

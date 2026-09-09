import { createFileRoute } from "@tanstack/react-router";

import { FilesContent } from "#/features/workspace/FilesContent";

export const Route = createFileRoute("/_app/files")({
  head: () => ({ meta: [{ title: "Files" }] }),
  component: FilesContent,
});

import { createFileRoute } from "@tanstack/react-router";

import { BoardContent } from "#/features/support/BoardContent";

export const Route = createFileRoute("/_app/board")({
  head: () => ({ meta: [{ title: "Board" }] }),
  component: BoardContent,
});

import { createFileRoute } from "@tanstack/react-router";

import { NotificationsContent } from "#/features/account/NotificationsContent";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications" }] }),
  component: NotificationsContent,
});

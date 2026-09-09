import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { initSentry } from "#/lib/sentry";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  initSentry(router); // no-op on the server and without VITE_SENTRY_DSN

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

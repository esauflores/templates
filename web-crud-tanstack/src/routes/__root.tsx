import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { lazy, Suspense } from "react";

import { NotFound } from "#/components/boundaries/NotFound";
import { RouteError } from "#/components/boundaries/RouteError";
import { Toaster } from "#/components/ui/sonner";
import { getQueryClient } from "#/lib/query";

import appCss from "#/styles.css?url";

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() => import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools })))
  : () => null;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light dark" },
      { title: "Web CRUD" },
      {
        name: "description",
        content: "Admin dashboard starter — sidebar shell and CRUD suite. TanStack Start + Tailwind.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Web CRUD" },
      { property: "og:description", content: "Admin dashboard starter — sidebar shell and CRUD suite." },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      ...(import.meta.env.DEV ? [{ rel: "stylesheet", href: "/virtual:stylex.css" }] : []),
    ],
  }),
  component: RootComponent,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
});

function RootComponent() {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <MotionConfig reducedMotion="user">
        <Outlet />
        <Toaster />
      </MotionConfig>
      <Suspense>
        <ReactQueryDevtools buttonPosition="bottom-right" />
      </Suspense>
    </QueryClientProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

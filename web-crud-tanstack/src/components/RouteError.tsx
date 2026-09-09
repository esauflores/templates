import { type ErrorComponentProps, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { Sentry } from "#/lib/sentry";

import { Button } from "./ui/button";

/** Wired as the root `errorComponent` — any render/loader error lands here instead of a blank screen. */
export const RouteError = ({ error }: ErrorComponentProps) => {
  const router = useRouter();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-4xl font-bold tracking-tight">Something went wrong</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "An unexpected error occurred while loading this page."}
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => router.invalidate()}>
          Try again
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/">Back to overview</Link>
        </Button>
      </div>
    </div>
  );
};

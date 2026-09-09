import { Link } from "@tanstack/react-router";

import { Button } from "./ui/button";

export const NotFound = () => (
  <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
    <p className="text-5xl font-bold tracking-tight">404</p>
    <div className="flex flex-col gap-1">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">The page you're looking for doesn't exist or was moved.</p>
    </div>
    <Button asChild size="sm">
      <Link to="/">Back to overview</Link>
    </Button>
  </div>
);

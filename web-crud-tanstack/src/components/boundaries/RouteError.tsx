import * as stylex from "@stylexjs/stylex";
import { type ErrorComponentProps, Link, useRouter } from "@tanstack/react-router";

import { Button } from "../ui/button";

const styles = stylex.create({
  root: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    justifyContent: "center",
    minHeight: "100vh",
    padding: 24,
    textAlign: "center",
  },
  title: { fontSize: 36, fontWeight: 700, letterSpacing: "-0.025em" },
  message: { color: "var(--muted-foreground)", fontSize: 14, maxWidth: 448 },
  actions: { display: "flex", gap: 8 },
});

/** Wired as the root `errorComponent` — any render/loader error lands here instead of a blank screen. */
export const RouteError = ({ error }: ErrorComponentProps) => {
  const router = useRouter();

  return (
    <div {...stylex.props(styles.root)}>
      <p {...stylex.props(styles.title)}>Something went wrong</p>
      <p {...stylex.props(styles.message)}>
        {error instanceof Error ? error.message : "An unexpected error occurred while loading this page."}
      </p>
      <div {...stylex.props(styles.actions)}>
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

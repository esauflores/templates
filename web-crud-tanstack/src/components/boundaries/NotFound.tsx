import * as stylex from "@stylexjs/stylex";
import { Link } from "@tanstack/react-router";

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
  code: { fontSize: 48, fontWeight: 700, letterSpacing: "-0.025em" },
  copy: { display: "flex", flexDirection: "column", gap: 4 },
  title: { fontSize: 18, fontWeight: 600 },
  description: { color: "var(--muted-foreground)", fontSize: 14 },
});

export const NotFound = () => (
  <div {...stylex.props(styles.root)}>
    <p {...stylex.props(styles.code)}>404</p>
    <div {...stylex.props(styles.copy)}>
      <h1 {...stylex.props(styles.title)}>Page not found</h1>
      <p {...stylex.props(styles.description)}>The page you're looking for doesn't exist or was moved.</p>
    </div>
    <Button asChild size="sm">
      <Link to="/">Back to overview</Link>
    </Button>
  </div>
);

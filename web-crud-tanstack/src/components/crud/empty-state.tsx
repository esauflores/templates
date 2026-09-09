import * as stylex from "@stylexjs/stylex";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

const styles = stylex.create({
  root: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingBlock: 32,
    textAlign: "center",
  },
  icon: {
    alignItems: "center",
    backgroundColor: "var(--muted)",
    borderRadius: 9999,
    color: "var(--muted-foreground)",
    display: "flex",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  glyph: { height: 20, width: 20 },
  message: { color: "var(--muted-foreground)", fontSize: 14 },
});

export const EmptyState = ({ message, action }: { message: string; action?: ReactNode }) => (
  <div {...stylex.props(styles.root)}>
    <span {...stylex.props(styles.icon)}>
      <Inbox {...stylex.props(styles.glyph)} />
    </span>
    <p {...stylex.props(styles.message)}>{message}</p>
    {action}
  </div>
);

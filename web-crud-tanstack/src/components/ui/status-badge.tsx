import * as stylex from "@stylexjs/stylex";

type Tone = "green" | "amber" | "red" | "blue" | "gray";

const styles = stylex.create({
  badge: {
    alignItems: "center",
    borderColor: "var(--border)",
    borderRadius: 9999,
    borderStyle: "solid",
    borderWidth: 1,
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 500,
    gap: 6,
    lineHeight: 1,
    paddingBlock: 4,
    paddingInline: 8,
    textTransform: "capitalize",
  },
  dot: { borderRadius: 9999, height: 8, width: 8 },
  green: { backgroundColor: "#10b981" },
  amber: { backgroundColor: "#f59e0b" },
  red: { backgroundColor: "#ef4444" },
  blue: { backgroundColor: "#3b82f6" },
  gray: { backgroundColor: "var(--muted-foreground)" },
});

export const StatusBadge = ({ label, tone }: { label: string; tone: Tone }) => (
  <span {...stylex.props(styles.badge)}>
    <span {...stylex.props(styles.dot, styles[tone])} />
    {label}
  </span>
);

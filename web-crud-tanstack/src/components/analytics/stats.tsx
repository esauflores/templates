import * as stylex from "@stylexjs/stylex";
import { TrendingDown, TrendingUp } from "lucide-react";

export type Stat = {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down";
  takeaway?: string;
  hint?: string;
};

const styles = stylex.create({
  row: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: {
      default: "1fr",
      "@media (min-width: 640px)": "repeat(2, minmax(0, 1fr))",
      "@media (min-width: 1024px)": "repeat(4, minmax(0, 1fr))",
    },
  },
  card: {
    backgroundColor: "var(--card)",
    borderColor: "var(--border)",
    borderRadius: 10,
    borderStyle: "solid",
    borderWidth: 1,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 88,
    padding: 14,
  },
  top: { alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" },
  label: { color: "var(--muted-foreground)", fontSize: 14 },
  valueRow: { alignItems: "baseline", display: "flex", flexWrap: "wrap", gap: 6 },
  value: { fontSize: 24, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  chip: {
    alignItems: "center",
    borderColor: "var(--border)",
    borderRadius: 9999,
    borderStyle: "solid",
    borderWidth: 1,
    display: "inline-flex",
    fontSize: 12,
    gap: 4,
    paddingBlock: 2,
    paddingInline: 6,
  },
  takeaway: { alignItems: "center", display: "flex", fontSize: 12, fontWeight: 500, gap: 4 },
  hint: { color: "var(--muted-foreground)", fontSize: 12 },
  icon: { height: 12, width: 12 },
});

export const StatRow = ({ items }: { items: Stat[] }) => (
  <div {...stylex.props(styles.row)}>
    {items.map((stat) => {
      const Arrow = stat.trend === "down" ? TrendingDown : TrendingUp;
      return (
        <section key={stat.label} {...stylex.props(styles.card)}>
          <div {...stylex.props(styles.top)}>
            <span {...stylex.props(styles.label)}>{stat.label}</span>
            {stat.delta ? (
              <span {...stylex.props(styles.chip)}>
                <Arrow {...stylex.props(styles.icon)} />
                {stat.delta}
              </span>
            ) : null}
          </div>
          <div {...stylex.props(styles.valueRow)}>
            <strong {...stylex.props(styles.value)}>{stat.value}</strong>
            {stat.hint ? <span {...stylex.props(styles.hint)}>{stat.hint}</span> : null}
          </div>
          {stat.takeaway ? (
            <span {...stylex.props(styles.takeaway)}>
              {stat.takeaway}
              <Arrow {...stylex.props(styles.icon)} />
            </span>
          ) : null}
        </section>
      );
    })}
  </div>
);

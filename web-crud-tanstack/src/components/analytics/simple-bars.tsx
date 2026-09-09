import * as stylex from "@stylexjs/stylex";

type Item = { label: string; value: number; color?: string };

const styles = stylex.create({
  chart: { display: "flex", gap: 6, height: 160, paddingTop: 12 },
  column: { display: "grid", flex: 1, gap: 6, gridTemplateRows: "1fr auto", minWidth: 0 },
  bar: { alignSelf: "end", backgroundColor: "var(--chart-1)", borderRadius: 4, minHeight: 4, width: "100%" },
  label: {
    color: "var(--muted-foreground)",
    fontSize: 11,
    overflow: "hidden",
    textAlign: "center",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
  },
});

/** A compact, dependency-free chart for dashboard examples. */
export function SimpleBars({ items }: { items: Item[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div {...stylex.props(styles.chart)}>
      {items.map((item) => (
        <div key={item.label} {...stylex.props(styles.column)}>
          <div
            {...stylex.props(styles.bar)}
            style={{ backgroundColor: item.color, height: `${Math.max((item.value / max) * 100, 4)}%` }}
            title={`${item.label}: ${item.value}`}
          />
          <span {...stylex.props(styles.label)}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

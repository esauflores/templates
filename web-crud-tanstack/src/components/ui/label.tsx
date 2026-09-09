import * as stylex from "@stylexjs/stylex";
import { cn } from "cn";
import * as React from "react";

const styles = stylex.create({
  label: { alignItems: "center", display: "flex", fontSize: 14, fontWeight: 500, gap: 8, lineHeight: 1 },
});

function Label({ className, ...props }: React.ComponentProps<"label">) {
  const style = stylex.props(styles.label);
  return <label {...props} {...style} className={cn(style.className, className)} data-slot="label" />;
}

export { Label };

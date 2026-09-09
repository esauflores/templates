import * as stylex from "@stylexjs/stylex";
import { cn } from "cn";
import * as React from "react";

const styles = stylex.create({
  base: { backgroundColor: "var(--border)", flexShrink: 0 },
  horizontal: { height: 1, width: "100%" },
  vertical: { height: "100%", width: 1 },
});

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }) {
  const style = stylex.props(styles.base, orientation === "horizontal" ? styles.horizontal : styles.vertical);
  return (
    <div
      {...props}
      {...style}
      className={cn(style.className, className)}
      data-slot="separator"
      role="separator"
      aria-orientation={orientation}
    />
  );
}

export { Separator };

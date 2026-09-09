import * as stylex from "@stylexjs/stylex";
import { cn } from "cn";
import { Slot } from "radix-ui";
import * as React from "react";

type Variant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

const styles = stylex.create({
  base: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 9999,
    borderStyle: "solid",
    borderWidth: 1,
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 500,
    gap: 4,
    justifyContent: "center",
    overflow: "hidden",
    paddingBlock: 2,
    paddingInline: 8,
    whiteSpace: "nowrap",
  },
  default: { backgroundColor: "var(--primary)", color: "var(--primary-foreground)" },
  secondary: { backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" },
  destructive: { backgroundColor: "var(--destructive)", color: "white" },
  outline: { borderColor: "var(--border)", color: "var(--foreground)" },
  ghost: { color: "var(--foreground)" },
  link: { color: "var(--primary)", textDecorationLine: "underline", textUnderlineOffset: 4 },
});

const variants = {
  default: styles.default,
  secondary: styles.secondary,
  destructive: styles.destructive,
  outline: styles.outline,
  ghost: styles.ghost,
  link: styles.link,
};

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & { asChild?: boolean; variant?: Variant }) {
  const Comp = asChild ? Slot.Root : "span";
  const style = stylex.props(styles.base, variants[variant]);
  return (
    <Comp {...props} {...style} className={cn(style.className, className)} data-slot="badge" data-variant={variant} />
  );
}

export { Badge };

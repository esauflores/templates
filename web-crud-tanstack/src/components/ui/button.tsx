import * as stylex from "@stylexjs/stylex";
import { cn } from "cn";
import { Slot } from "radix-ui";
import * as React from "react";

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type Size = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

const styles = stylex.create({
  base: {
    alignItems: "center",
    borderRadius: 6,
    borderStyle: "solid",
    borderWidth: 0,
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 14,
    fontWeight: 500,
    gap: 8,
    justifyContent: "center",
    lineHeight: 1,
    outline: "none",
    padding: 0,
    transitionDuration: "150ms",
    transitionProperty: "background-color, border-color, color, box-shadow",
    whiteSpace: "nowrap",
  },
  disabled: { cursor: "not-allowed", opacity: 0.5, pointerEvents: "none" },
  default: { backgroundColor: "var(--primary)", color: "var(--primary-foreground)" },
  destructive: { backgroundColor: "var(--destructive)", color: "white" },
  outline: {
    backgroundColor: "var(--background)",
    borderColor: "var(--border)",
    borderWidth: 1,
    color: "var(--foreground)",
  },
  secondary: { backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" },
  ghost: { backgroundColor: "transparent", color: "var(--foreground)" },
  link: {
    backgroundColor: "transparent",
    color: "var(--primary)",
    textDecorationLine: "underline",
    textUnderlineOffset: 4,
  },
  defaultSize: { height: 36, paddingInline: 16 },
  xs: { fontSize: 12, gap: 4, height: 24, paddingInline: 8 },
  sm: { gap: 6, height: 32, paddingInline: 12 },
  lg: { height: 40, paddingInline: 24 },
  icon: { height: 36, paddingInline: 0, width: 36 },
  iconXs: { height: 24, paddingInline: 0, width: 24 },
  iconSm: { height: 32, paddingInline: 0, width: 32 },
  iconLg: { height: 40, paddingInline: 0, width: 40 },
});

const variants = {
  default: styles.default,
  destructive: styles.destructive,
  outline: styles.outline,
  secondary: styles.secondary,
  ghost: styles.ghost,
  link: styles.link,
};

const sizes = {
  default: styles.defaultSize,
  xs: styles.xs,
  sm: styles.sm,
  lg: styles.lg,
  icon: styles.icon,
  "icon-xs": styles.iconXs,
  "icon-sm": styles.iconSm,
  "icon-lg": styles.iconLg,
};

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  disabled,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean; size?: Size; variant?: Variant }) {
  const Comp = asChild ? Slot.Root : "button";
  const style = stylex.props(styles.base, variants[variant], sizes[size], disabled && styles.disabled);

  return (
    <Comp
      {...props}
      {...style}
      className={cn(style.className, className)}
      data-size={size}
      data-slot="button"
      data-variant={variant}
      disabled={disabled}
    />
  );
}

export { Button };

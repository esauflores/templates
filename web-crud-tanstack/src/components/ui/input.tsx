import * as stylex from "@stylexjs/stylex";
import { cn } from "cn";
import * as React from "react";

const styles = stylex.create({
  input: {
    backgroundColor: "transparent",
    borderColor: "var(--input)",
    borderRadius: 6,
    borderStyle: "solid",
    borderWidth: 1,
    color: "var(--foreground)",
    fontSize: 14,
    height: 36,
    minWidth: 0,
    outline: "none",
    paddingBlock: 4,
    paddingInline: 12,
    width: "100%",
  },
});

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const style = stylex.props(styles.input);
  return <input {...props} {...style} className={cn(style.className, className)} data-slot="input" type={type} />;
}

export { Input };

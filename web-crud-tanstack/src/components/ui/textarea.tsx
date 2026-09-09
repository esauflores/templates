import * as stylex from "@stylexjs/stylex";
import { cn } from "cn";
import * as React from "react";

const styles = stylex.create({
  textarea: {
    backgroundColor: "transparent",
    borderColor: "var(--input)",
    borderRadius: 6,
    borderStyle: "solid",
    borderWidth: 1,
    color: "var(--foreground)",
    fontSize: 14,
    minHeight: 64,
    outline: "none",
    paddingBlock: 8,
    paddingInline: 12,
    resize: "vertical",
    width: "100%",
  },
});

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  const style = stylex.props(styles.textarea);
  return <textarea {...props} {...style} className={cn(style.className, className)} data-slot="textarea" />;
}

export { Textarea };

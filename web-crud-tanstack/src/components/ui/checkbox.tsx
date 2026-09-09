import * as stylex from "@stylexjs/stylex";
import { cn } from "cn";
import * as React from "react";

const styles = stylex.create({
  checkbox: {
    accentColor: "var(--primary)",
    display: "block",
    height: 16,
    margin: 0,
    width: 16,
  },
});

type CheckboxProps = Omit<React.ComponentProps<"input">, "checked" | "onChange" | "type"> & {
  checked?: boolean | "indeterminate";
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onCheckedChange?: (checked: boolean) => void;
};

function Checkbox({ checked, className, onCheckedChange, onChange, ...props }: CheckboxProps) {
  const style = stylex.props(styles.checkbox);
  return (
    <input
      {...props}
      {...style}
      aria-checked={checked === "indeterminate" ? "mixed" : checked}
      checked={checked === undefined ? undefined : checked === true}
      className={cn(style.className, className)}
      data-slot="checkbox"
      onChange={(event) => {
        onChange?.(event);
        onCheckedChange?.(event.currentTarget.checked);
      }}
      type="checkbox"
    />
  );
}

export { Checkbox };

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form";

import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const styles = stylex.create({
  field: { display: "grid", gap: 6 },
  error: { color: "var(--destructive)" },
  errorText: { color: "var(--destructive)", fontSize: 12 },
  capitalize: { textTransform: "capitalize" },
});

/** Label + control + inline error, for the CRUD dialog forms. */
export const Field = ({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) => (
  <div {...stylex.props(styles.field)} className={className}>
    <Label htmlFor={htmlFor} {...stylex.props(!!error && styles.error)}>
      {label}
    </Label>
    {children}
    {error ? <p {...stylex.props(styles.errorText)}>{error}</p> : null}
  </div>
);

/** `<Field>` wrapping a Radix `Select` bound to a react-hook-form field via `Controller`. */
export const SelectField = <F extends FieldValues>({
  control,
  name,
  id,
  label,
  options,
  error,
  capitalize = true,
}: {
  control: Control<F>;
  name: FieldPath<F>;
  id: string;
  label: string;
  options: readonly string[];
  error?: string;
  capitalize?: boolean;
}) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <Field label={label} htmlFor={id} error={error}>
        <Select value={(field.value as string) ?? ""} onValueChange={field.onChange}>
          <SelectTrigger id={id}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o} {...stylex.props(capitalize && styles.capitalize)}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    )}
  />
);

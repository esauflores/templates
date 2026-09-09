import type { ReactNode } from "react";
import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form";

import { cn } from "#/lib/utils";

import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

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
  <div className={cn("grid gap-1.5", className)}>
    <Label htmlFor={htmlFor} className={error ? "text-destructive" : undefined}>
      {label}
    </Label>
    {children}
    {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
              <SelectItem key={o} value={o} className={capitalize ? "capitalize" : undefined}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    )}
  />
);

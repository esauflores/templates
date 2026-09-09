import { zodResolver } from "@hookform/resolvers/zod";
import { type DefaultValues, type FieldValues, useForm } from "react-hook-form";
import type { z } from "zod";

/**
 * `react-hook-form` wired to a zod schema. Returns the usual `UseFormReturn`
 * (`register`, `control`, `handleSubmit`, `formState.errors`, …) — `handleSubmit`
 * hands you the **parsed** output, so `z.coerce` fields arrive typed.
 *
 * ```tsx
 * const schema = z.object({ name: z.string().min(1, "Required"), mrr: z.coerce.number() });
 * const form = useZodForm(schema, { name: "", mrr: 0 });
 * <form onSubmit={form.handleSubmit(onValid)} noValidate> … </form>
 * ```
 *
 * Text inputs: `{...form.register("name")}`. Non-native controls (Radix `Select`):
 * `<SelectField control={form.control} name="…" … />`.
 */
export function useZodForm<TIn extends FieldValues, TOut extends FieldValues>(
  schema: z.ZodType<TOut, TIn>,
  defaultValues: DefaultValues<TIn>,
) {
  return useForm<TIn, unknown, TOut>({ resolver: zodResolver(schema), defaultValues });
}

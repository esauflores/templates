import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ValidationTargets } from "hono";
import { resolver, validator } from "hono-openapi";
import { z } from "zod";

/** Every error's body, named `Error` in the OpenAPI document. The web app reads it into ApiError. */
export const ErrorSchema = z.object({ error: z.string().meta({ example: "Not Found" }) }).meta({ ref: "Error" });

/**
 * Validates a request's `target` (param, query, json, …) with `schema`, which also documents it in the OpenAPI
 * document. Invalid input answers `400 { error }` with Zod's readable message, before the handler runs.
 */
export const validate = <Target extends keyof ValidationTargets, Schema extends StandardSchemaV1>(
  target: Target,
  schema: Schema,
) =>
  validator(target, schema, (result, c) => {
    if (!result.success) return c.json({ error: z.prettifyError({ issues: result.error } as z.ZodError) }, 400);
  });

/** A documented JSON response for describeRoute: `200: json(NoteSchema, "The note")`. */
export const json = (schema: StandardSchemaV1, description: string) => ({
  description,
  content: { "application/json": { schema: resolver(schema) } },
});

/** A documented error response for describeRoute, `{ error }`: `404: error("No such note")`. */
export const error = (description: string) => json(ErrorSchema, description);

import { OpenAPIHono, z, type OpenAPIHonoOptions } from "@hono/zod-openapi";
import type { Env } from "hono";

/** Every error's body, named `Error` in the OpenAPI document. The web app reads it into ApiError. */
export const ErrorSchema = z.object({ error: z.string().openapi({ example: "Not Found" }) }).openapi("Error");

/** Invalid input (params, query, body) answers `400 { error }` with Zod's readable message, not its raw issues. */
const answerInvalidInput: OpenAPIHonoOptions<Env>["defaultHook"] = (result, c) => {
  if (result.success) return;
  return c.json({ error: z.prettifyError(result.error) }, 400);
};

/** A module's router, mounted in app.ts with `.route("/", …)` under the app's /api base path. */
export const createRouter = () => new OpenAPIHono({ defaultHook: answerInvalidInput });

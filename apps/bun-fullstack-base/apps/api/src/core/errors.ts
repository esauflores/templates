import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";

/** Unknown paths answer `404 { error }`, like every other error. */
export const notFound: NotFoundHandler = (c) => c.json({ error: "Not Found" }, 404);

/**
 * Where every error ends: a 4xx HTTPException answers its message. Anything else is logged and answers
 * `{ error: "Internal Server Error" }`, keeping an HTTPException's own 5xx status (a 503 stays a 503).
 * Middleware like basicAuth throws with a ready-made response (e.g. its WWW-Authenticate header), which is kept.
 */
export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException && err.status < 500) {
    if (err.res) return err.getResponse();
    return c.json({ error: err.message }, err.status);
  }

  console.error(err);
  return c.json({ error: "Internal Server Error" }, err instanceof HTTPException ? err.status : 500);
};

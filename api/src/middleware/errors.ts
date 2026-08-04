// External
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export const notFound = (c: Context) => c.json({ error: "Not Found" }, 404);

export const onError = (err: unknown, c: Context) => {
  if (err instanceof HTTPException) {
    if (err.status >= 500) {
      console.error(err);
      return c.json({ error: "Internal Server Error" }, 500);
    }

    return c.json({ error: err.message }, err.status);
  }

  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
};

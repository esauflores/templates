// External
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

// App
import type { Bindings } from "@/env";

export const requireKey = async (c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) => {
  const key = c.env.API_KEY;
  if (!key) return next();
  if (c.req.header("Authorization") !== `Bearer ${key}`) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  return next();
};

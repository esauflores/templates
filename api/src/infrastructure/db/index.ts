// App
import type { Bindings } from "@/env";

import { db as neon } from "./neon";
import { db as pglite } from "./pglite";

export const db = (env: Bindings) => {
  switch (env.DB_PROVIDER) {
    case "pglite":
      return pglite(env);
    case "neon":
    default:
      return neon(env);
  }
};

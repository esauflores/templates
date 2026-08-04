import { db as neon } from "./neon";
import { db as pglite } from "./pglite";

const provider = process.env.DB_PROVIDER ?? "neon";

export const db = (() => {
  switch (provider) {
    case "neon":
      return neon;
    case "pglite":
      return pglite;
    default:
      return neon;
  }
})();

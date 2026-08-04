// External
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

// App
import type { Bindings } from "@/env";

const client = new PGlite();
export const db = (_env: Bindings) => drizzle({ client });

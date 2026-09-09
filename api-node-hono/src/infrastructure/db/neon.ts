// External
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// App
import type { Bindings } from "@/env";

export const db = (env: Bindings) => drizzle({ client: neon(env.DATABASE_URL) });

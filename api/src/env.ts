// External
import { config } from "dotenv";

if (process.env.VITEST) {
  config({ path: ".env.test" });
}

export type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  EMAILIT_API_KEY: string;
  EMAILIT_FROM: string;
  DB_PROVIDER?: "neon" | "pglite";
  EMAIL_PROVIDER?: "emailit" | "noop";
  AUTH_PROVIDER?: "better-auth";
  LOG_LEVEL?: "info" | "warn" | "error" | "silent";
};

export const testBindings: Bindings = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "",
  EMAILIT_API_KEY: process.env.EMAILIT_API_KEY ?? "",
  EMAILIT_FROM: process.env.EMAILIT_FROM ?? "",
  DB_PROVIDER: process.env.DB_PROVIDER as "neon" | "pglite" | undefined,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER as "emailit" | "noop" | undefined,
  AUTH_PROVIDER: process.env.AUTH_PROVIDER as "better-auth" | undefined,
  LOG_LEVEL: process.env.LOG_LEVEL as "info" | "warn" | "error" | "silent" | undefined,
};

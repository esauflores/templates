// External
import { config } from "dotenv";

if (process.env.VITEST) {
  config({ path: ".env.test" });
}

export type Bindings = {
  // Origin
  API_ORIGIN: string;
  WEB_ORIGIN: string;
  // Database
  DB_PROVIDER?: "neon" | "pglite";
  DATABASE_URL: string;
  // Better Auth
  AUTH_PROVIDER?: "better-auth";
  BETTER_AUTH_SECRET: string;
  // Email
  EMAIL_PROVIDER?: "emailit" | "noop";
  EMAILIT_API_KEY: string;
  EMAILIT_FROM: string;
  // Log Level
  LOG_LEVEL?: "info" | "warn" | "error" | "silent";
};

export const testBindings: Bindings = {
  // Origin
  API_ORIGIN: "http://localhost:5173",
  WEB_ORIGIN: "http://localhost:4321",
  // Database
  DB_PROVIDER: process.env.DB_PROVIDER as "neon" | "pglite" | undefined,
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  // Better Auth
  AUTH_PROVIDER: process.env.AUTH_PROVIDER as "better-auth" | undefined,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
  // Email
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER as "emailit" | "noop" | undefined,
  EMAILIT_API_KEY: process.env.EMAILIT_API_KEY ?? "",
  EMAILIT_FROM: process.env.EMAILIT_FROM ?? "",
  // Log Level
  LOG_LEVEL: process.env.LOG_LEVEL as "info" | "warn" | "error" | "silent" | undefined,
};

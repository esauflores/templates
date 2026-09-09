// External
import { config } from "dotenv";

if (process.env.VITEST) {
  config({ path: ".env.test" });
}

export type Bindings = {
  // Origin
  API_ORIGIN: string;
  WEB_ORIGIN: string;
  PORT: string;
  // Database
  DB_PROVIDER?: "neon" | "pglite";
  DATABASE_URL: string;
  // Auth — `better-auth` (default) or `clerk`
  AUTH_PROVIDER?: "better-auth" | "clerk";
  BETTER_AUTH_SECRET: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  // Email
  EMAIL_PROVIDER?: "emailit" | "noop";
  EMAILIT_API_KEY: string;
  EMAILIT_FROM: string;
  // Object storage (uploaded PDFs)
  STORAGE_PROVIDER?: "s3" | "memory";
  S3_BUCKET: string;
  S3_REGION: string;
  /** Optional custom endpoint for S3-compatible stores (R2, MinIO). */
  S3_ENDPOINT: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  // AI (Mistral: embeddings, chat, OCR)
  MISTRAL_API_KEY: string;
  // Log Level
  LOG_LEVEL?: "info" | "warn" | "error" | "silent";
};

export function bindings(): Bindings {
  return {
    API_ORIGIN: process.env.API_ORIGIN ?? "http://localhost:3000",
    WEB_ORIGIN: process.env.WEB_ORIGIN ?? "http://localhost:4321",
    PORT: process.env.PORT ?? "3000",
    DB_PROVIDER: process.env.DB_PROVIDER as "neon" | "pglite" | undefined,
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    AUTH_PROVIDER: process.env.AUTH_PROVIDER as "better-auth" | "clerk" | undefined,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY ?? "",
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER as "emailit" | "noop" | undefined,
    EMAILIT_API_KEY: process.env.EMAILIT_API_KEY ?? "",
    EMAILIT_FROM: process.env.EMAILIT_FROM ?? "",
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER as "s3" | "memory" | undefined,
    S3_BUCKET: process.env.S3_BUCKET ?? "",
    S3_REGION: process.env.S3_REGION ?? "",
    S3_ENDPOINT: process.env.S3_ENDPOINT ?? "",
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "",
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "",
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY ?? "",
    LOG_LEVEL: process.env.LOG_LEVEL as "info" | "warn" | "error" | "silent" | undefined,
  };
}

export const testBindings: Bindings = {
  API_ORIGIN: "http://localhost:3000",
  WEB_ORIGIN: "http://localhost:4321",
  PORT: "3000",
  DB_PROVIDER: process.env.DB_PROVIDER as "neon" | "pglite" | undefined,
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  AUTH_PROVIDER: process.env.AUTH_PROVIDER as "better-auth" | "clerk" | undefined,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "sk_test_placeholder",
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY ?? "pk_test_placeholder",
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER as "emailit" | "noop" | undefined,
  EMAILIT_API_KEY: process.env.EMAILIT_API_KEY ?? "",
  EMAILIT_FROM: process.env.EMAILIT_FROM ?? "",
  STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER as "s3" | "memory" | undefined) ?? "memory",
  S3_BUCKET: process.env.S3_BUCKET ?? "",
  S3_REGION: process.env.S3_REGION ?? "",
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? "",
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "",
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "",
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY ?? "test",
  LOG_LEVEL: process.env.LOG_LEVEL as "info" | "warn" | "error" | "silent" | undefined,
};

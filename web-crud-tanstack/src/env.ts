import { z } from "zod";

/**
 * Typed, validated client env. Only `VITE_*` vars are exposed to the bundle.
 * Import `env` instead of touching `import.meta.env` directly.
 */
const schema = z.object({
  /** Base URL of the CRUD API. Empty → the app stays fully in-memory (seed data). */
  VITE_API_URL: z.union([z.url(), z.literal("")]).default(""),
  /** Sentry DSN. Empty → error reporting is disabled. */
  VITE_SENTRY_DSN: z.union([z.url(), z.literal("")]).default(""),
});

const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;

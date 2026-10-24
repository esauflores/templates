import { z } from "zod";

import { version } from "../../../package.json";

/** The app's version, package.json's, in the OpenAPI document. Read at build time, so dist/ doesn't need the file. */
export const VERSION = version;

/**
 * The settings, from the environment (Bun loads the repo root's .env), each with its default:
 * - PORT (3000), DATABASE_PATH (data/app.db), RATE_LIMIT (300 a minute per client; 0 turns it off).
 * - MAX_BODY_BYTES (1 MB), TRUST_PROXY (off; see "Rate limits" in src/api/README.md).
 */
const Config = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_PATH: z.string().default("data/app.db"),
  RATE_LIMIT: z.coerce.number().int().min(0).default(300),
  MAX_BODY_BYTES: z.coerce.number().int().positive().default(1_048_576),
  TRUST_PROXY: z.stringbool().default(false),
});

/** Checked on each call, so a bad value fails at start, naming it. Empty values count as unset. */
export function config() {
  const env = Object.fromEntries(Object.keys(Config.shape).map((name) => [name, process.env[name] || undefined]));
  const result = Config.safeParse(env);
  if (!result.success) throw new Error(`Invalid config: ${z.prettifyError(result.error)}`);
  return result.data;
}

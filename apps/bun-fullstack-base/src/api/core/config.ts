import { z } from "zod";

import { version } from "../../../package.json";

/** The app's version, package.json's, in the OpenAPI document. Read at build time, so dist/ doesn't need the file. */
export const VERSION = version;

/**
 * The app's settings, from the environment (Bun loads the repo root's .env), each with its default:
 * - PORT: the server's port, 3000.
 * - DATABASE_PATH: the SQLite file, data/app.db, from where the server runs (the repo root); the Docker image sets
 *   /data/app.db, its volume, and the tests `:memory:`.
 * - RATE_LIMIT: requests a minute per client, 300; 0 for none (as when benchmarking).
 * - MAX_BODY_BYTES: the largest request body read, 1 MB; raise it for uploads.
 * - TRUST_PROXY: whether the client's IP is the one a reverse proxy adds to X-Forwarded-For, off. Read as Zod reads a
 *   boolean: true, 1, yes, on, y or enabled, or their opposites, in any case. See "Rate limits" in src/api/README.md.
 */
const Config = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_PATH: z.string().default("data/app.db"),
  RATE_LIMIT: z.coerce.number().int().min(0).default(300),
  MAX_BODY_BYTES: z.coerce.number().int().positive().default(1_048_576),
  TRUST_PROXY: z.stringbool().default(false),
});

/**
 * The settings, checked: a bad value fails at start, naming it, rather than running with the wrong one. Empty values
 * (`RATE_LIMIT=`) count as unset. Read on each call, so tests can change the environment.
 */
export function config() {
  const env = Object.fromEntries(Object.keys(Config.shape).map((name) => [name, process.env[name] || undefined]));
  const result = Config.safeParse(env);
  if (!result.success) throw new Error(`Invalid config: ${z.prettifyError(result.error)}`);
  return result.data;
}

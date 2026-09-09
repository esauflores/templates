import { register as registerAgent } from "@convex-dev/agent/test";
import { register as registerAggregate } from "@convex-dev/aggregate/test";
import { register as registerMigrations } from "@convex-dev/migrations/test";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { register as registerWorkpool } from "@convex-dev/workpool/test";
import { convexTest } from "convex-test";

import { isAppError } from "@/infrastructure/lib/errors";
import schema from "@/schema";

/**
 * Shared `convex-test` setup.
 *
 * This lives outside `convex/` on purpose: everything under `convex/` is
 * analysed and bundled for deployment, and this file imports `convex-test`
 * (a devDependency). Keeping it here means `convex deploy` never sees it.
 *
 * `convex-test` needs every function module, which `import.meta.glob` collects
 * at build time. The pattern is root-absolute so it reads the same from any
 * file, and excludes the test files via a negated second entry.
 *
 * It deliberately does *not* use the `!(*.*.*)*.*s` form from the Convex docs:
 * that extglob matches nothing under this version of Vite, leaving
 * `convex-test` with no modules and a misleading "Could not find the
 * `_generated` directory" error. The `_generated/*.d.ts` files must stay in —
 * that directory is how `convex-test` locates the module root.
 */
const modules = import.meta.glob(["/convex/**/*.ts", "!/convex/**/*.test.ts"]);

/**
 * A backend with an empty database and no identity.
 *
 * Components are sandboxed backends of their own, so `convex-test` needs each
 * one registered with the same name used in `convex/convex.config.ts` —
 * otherwise any function that touches `components.*` fails. Workpool also pulls
 * in a nested `batch-worker` component, which its own `register` handles.
 */
export const setup = () => {
  const t = convexTest(schema, modules);
  registerAgent(t);
  registerMigrations(t);
  registerRateLimiter(t);
  registerWorkpool(t, "notifications");
  registerAggregate(t, "orderTotals");
  return t;
};

/** A backend where every call is made by `subject` — no real Clerk involved. */
export const asUser = (subject: string) => setup().withIdentity({ subject });

/** `{ status, code }` of a non-2xx REST response, for asserting the error mapping. */
export async function errorOf(response: Response): Promise<{ status: number; code: string }> {
  const body = (await response.json()) as { code: string };
  return { status: response.status, code: body.code };
}

/**
 * The `ErrorCode` a call rejected with. Asserting on the code rather than the
 * message is the point of throwing `ConvexError` — see `infrastructure/lib/errors.ts`.
 */
export async function rejectionCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "NO_ERROR";
  } catch (error) {
    if (isAppError(error)) return error.data.code;
    const message = error instanceof Error ? error.message : String(error);
    return /"code":"([A-Z_]+)"/.exec(message)?.[1] ?? message;
  }
}

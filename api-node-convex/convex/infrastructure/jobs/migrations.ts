import { Migrations } from "@convex-dev/migrations";

import { components, internal } from "@/_generated/api";
import schema from "@/schema";

/**
 * Online data migrations, via the `@convex-dev/migrations` component.
 *
 * These are **not** the per-change migration files a SQL project needs. Convex
 * pushes schema edits straight to the deployment; what it won't do is let the
 * data drift from the schema. Two edits are therefore blocked until the existing
 * rows are fixed up:
 *
 *   - adding a **required** field, and
 *   - **removing** a field, since Convex rejects documents carrying a field the
 *     schema doesn't declare ("Unexpected field `x` in object").
 *
 * Both follow the same five steps: widen the schema (add the field as optional,
 * or keep the doomed one as optional), push, run a migration to fix the data,
 * narrow the schema, push again. The migration below is step three.
 *
 * Passing `schema` gives `migrateOne` typed documents and lets `customRange`
 * page over your own indexes.
 */
export const migrations = new Migrations(components.migrations, { schema });

/**
 * Generic runner, so a migration can be invoked by name (`M` being this module,
 * `infrastructure/jobs/migrations`):
 *   pnpm dlx convex run $M:run '{fn: "$M:normalizeCustomerEmails"}'
 *
 * The name the component records is that path, so moving this file makes an
 * already-completed migration run again under its new name.
 */
export const run = migrations.runner();

/**
 * Lower-case every stored customer email.
 *
 * A representative backfill: idempotent (running it twice changes nothing) and
 * safe to interrupt, which is what lets the component resume from its cursor
 * after a failure. Returning an object patches the document; returning nothing
 * leaves it alone, so untouched rows aren't rewritten.
 */
export const normalizeCustomerEmails = migrations.define({
  table: "customers",
  migrateOne: (_ctx, customer) => {
    const email = customer.email.trim().toLowerCase();
    return email === customer.email ? undefined : { email };
  },
});

/**
 * The list to run on deploy, in order:
 *   pnpm dlx convex run $M:runAll --prod
 * Already-completed migrations are skipped, so this is safe to run every time.
 */
export const runAll = migrations.runner([internal.infrastructure.jobs.migrations.normalizeCustomerEmails]);

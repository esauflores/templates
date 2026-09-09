import agent from "@convex-dev/agent/convex.config.js";
import aggregate from "@convex-dev/aggregate/convex.config.js";
import migrations from "@convex-dev/migrations/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";
import { defineApp } from "convex/server";

/**
 * Convex components installed into this deployment.
 *
 * A component is a sandboxed mini-backend with its own tables: it can't read
 * this app's data, and this app can't read its tables except through the
 * functions it exports as `components.<name>`. Those bindings are generated, so
 * `pnpm dlx convex dev` (or `pnpm dlx convex codegen`) must run after editing this file.
 *
 * Pools are named because that's how you get more than one: each `app.use` of
 * `workpool` is an independent queue with its own parallelism budget, so a flood
 * of low-priority work can't starve anything else. Add a second pool here rather
 * than raising `maxParallelism` on this one.
 */
const app = defineApp();

app.use(agent);
app.use(migrations);
app.use(rateLimiter);
app.use(workpool, { name: "notifications" });

// One `TableAggregate` per aggregate, so each usage needs its own name. This one
// indexes orders by owner for count/sum — see `features/sales/aggregates.ts`.
app.use(aggregate, { name: "orderTotals" });

export default app;

import { TableAggregate } from "@convex-dev/aggregate";

import { components } from "@/_generated/api";
import type { DataModel } from "@/_generated/dataModel";

/**
 * Order count and revenue, via `@convex-dev/aggregate`.
 *
 * Convex has no `COUNT(*)` or `SUM(...)`. The obvious workaround —
 * `(await ctx.db.query("orders").collect()).length` — reads every row, which is
 * exactly what the `no-collect-in-query` lint rule exists to stop: it grows with
 * the table, burns bandwidth, and eventually trips the query limits.
 *
 * This component keeps a running total in a balanced tree instead, so `count`
 * and `sum` are O(log n) regardless of table size.
 *
 * The trade is that it's **denormalised**: nothing watches the table, so every
 * insert, update and delete in `orders.ts` has to tell the aggregate too, or the
 * totals silently drift. Convex mutations are transactional, so the row and the
 * aggregate always move together — but only if the call is there.
 *
 * - `Namespace: string` — the `ownerId`, so each tenant's totals live in a
 *   separate tree. Without this every write would contend on one root document.
 * - `Key: number` — `_creationTime`, which makes "revenue since X" a bounded
 *   query rather than a full walk.
 * - `sumValue` — what `sum()` adds up.
 */
export const orderTotals = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "orders";
}>(components.orderTotals, {
  namespace: (doc) => doc.ownerId,
  sortKey: (doc) => doc._creationTime,
  sumValue: (doc) => doc.totalCents,
});

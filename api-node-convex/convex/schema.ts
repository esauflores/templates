import { defineSchema } from "convex/server";

import { salesTables } from "@/features/sales/tables";
import { supportTables } from "@/features/support/tables";
import { workspaceTables } from "@/features/workspace/tables";
import { identityTables } from "@/infrastructure/identity/tables";
import { replicationTables } from "@/infrastructure/replication/tables";
import { storageTables } from "@/infrastructure/storage/tables";

/**
 * The database. Convex forces this file to live at `convex/schema.ts`, but the
 * tables are declared per feature (`features/<x>/tables.ts`) and only composed
 * here. `convex dev` regenerates `_generated/` (committed) from the result.
 *
 * Convention: every business table carries `ownerId` (the Clerk `sub`) + a
 * `by_ownerId` index; money is integer cents; timestamps are epoch millis. `_id`
 * and `_creationTime` are automatic. (`users` is the exception — it mirrors Clerk
 * and is keyed by `clerkId`.)
 */
export default defineSchema({
  ...salesTables,
  ...workspaceTables,
  ...supportTables,
  ...identityTables,
  ...storageTables,
  ...replicationTables,
});

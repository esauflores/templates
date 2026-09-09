/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as features_assistant_agent from "../features/assistant/agent.js";
import type * as features_assistant_messages from "../features/assistant/messages.js";
import type * as features_assistant_model from "../features/assistant/model.js";
import type * as features_assistant_threads from "../features/assistant/threads.js";
import type * as features_sales_aggregates from "../features/sales/aggregates.js";
import type * as features_sales_customers from "../features/sales/customers.js";
import type * as features_sales_invoices from "../features/sales/invoices.js";
import type * as features_sales_model from "../features/sales/model.js";
import type * as features_sales_orders from "../features/sales/orders.js";
import type * as features_sales_products from "../features/sales/products.js";
import type * as features_sales_tables from "../features/sales/tables.js";
import type * as features_support_tables from "../features/support/tables.js";
import type * as features_support_tickets from "../features/support/tickets.js";
import type * as features_workspace_projects from "../features/workspace/projects.js";
import type * as features_workspace_tables from "../features/workspace/tables.js";
import type * as http from "../http.js";
import type * as infrastructure_identity_auth from "../infrastructure/identity/auth.js";
import type * as infrastructure_identity_tables from "../infrastructure/identity/tables.js";
import type * as infrastructure_identity_users from "../infrastructure/identity/users.js";
import type * as infrastructure_jobs_migrations from "../infrastructure/jobs/migrations.js";
import type * as infrastructure_jobs_webhooks from "../infrastructure/jobs/webhooks.js";
import type * as infrastructure_lib_db from "../infrastructure/lib/db.js";
import type * as infrastructure_lib_errors from "../infrastructure/lib/errors.js";
import type * as infrastructure_lib_limits from "../infrastructure/lib/limits.js";
import type * as infrastructure_lib_rest from "../infrastructure/lib/rest.js";
import type * as infrastructure_replication_replication from "../infrastructure/replication/replication.js";
import type * as infrastructure_replication_tables from "../infrastructure/replication/tables.js";
import type * as infrastructure_storage_files from "../infrastructure/storage/files.js";
import type * as infrastructure_storage_tables from "../infrastructure/storage/tables.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  "features/assistant/agent": typeof features_assistant_agent;
  "features/assistant/messages": typeof features_assistant_messages;
  "features/assistant/model": typeof features_assistant_model;
  "features/assistant/threads": typeof features_assistant_threads;
  "features/sales/aggregates": typeof features_sales_aggregates;
  "features/sales/customers": typeof features_sales_customers;
  "features/sales/invoices": typeof features_sales_invoices;
  "features/sales/model": typeof features_sales_model;
  "features/sales/orders": typeof features_sales_orders;
  "features/sales/products": typeof features_sales_products;
  "features/sales/tables": typeof features_sales_tables;
  "features/support/tables": typeof features_support_tables;
  "features/support/tickets": typeof features_support_tickets;
  "features/workspace/projects": typeof features_workspace_projects;
  "features/workspace/tables": typeof features_workspace_tables;
  http: typeof http;
  "infrastructure/identity/auth": typeof infrastructure_identity_auth;
  "infrastructure/identity/tables": typeof infrastructure_identity_tables;
  "infrastructure/identity/users": typeof infrastructure_identity_users;
  "infrastructure/jobs/migrations": typeof infrastructure_jobs_migrations;
  "infrastructure/jobs/webhooks": typeof infrastructure_jobs_webhooks;
  "infrastructure/lib/db": typeof infrastructure_lib_db;
  "infrastructure/lib/errors": typeof infrastructure_lib_errors;
  "infrastructure/lib/limits": typeof infrastructure_lib_limits;
  "infrastructure/lib/rest": typeof infrastructure_lib_rest;
  "infrastructure/replication/replication": typeof infrastructure_replication_replication;
  "infrastructure/replication/tables": typeof infrastructure_replication_tables;
  "infrastructure/storage/files": typeof infrastructure_storage_files;
  "infrastructure/storage/tables": typeof infrastructure_storage_tables;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  notifications: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"notifications">;
  orderTotals: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"orderTotals">;
};

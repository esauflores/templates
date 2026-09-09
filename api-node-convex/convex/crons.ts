import { cronJobs } from "convex/server";

import { internal } from "@/_generated/api";

/**
 * Scheduled work. Convex fixes this file at `convex/crons.ts`, and the schedule
 * is part of the deployment — pushing this file *is* installing the cron, so
 * there's nothing to configure in a dashboard and nothing to keep in sync.
 *
 * Two rules worth knowing:
 *
 *   - **Only `internal*` functions.** A cron has no caller, so there's no
 *     identity to authorize; scheduling a public function would hand the world
 *     an entry point that skips every check in `identity/auth.ts`.
 *   - **`interval` / `cron` only**, never the `hourly` / `daily` / `weekly`
 *     helpers — see `_generated/ai/guidelines.md`.
 *   - **Not on the hour.** Minute `0` is when every cron on every deployment
 *     fires at once, so a job there queues behind the crowd — hence `17 3`. The
 *     `convex/no-top-of-hour-crons` lint rule flags a minute-`0` schedule.
 *
 * This is the *scheduled* half of background work; the event-driven half is
 * `jobs/webhooks.ts`, enqueued by the mutation that caused it. Reach for a cron
 * when the trigger is the clock rather than a write, and for one-shot delayed
 * work (send this in an hour) use `ctx.scheduler.runAfter` from the mutation
 * instead — that's per-item, transactional, and needs no schedule at all.
 */
const crons = cronJobs();

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Collect uploads that were never claimed. Daily is plenty: the cost of a
 * missed day is some idle bytes, and the `graceMs` window has to be generous
 * anyway so a slow client's in-flight upload is never swept out from under it.
 */
crons.cron(
  "sweep unclaimed uploads",
  "17 3 * * *", // 03:17 UTC daily
  internal.infrastructure.storage.files.sweepUnclaimedUploads,
  { graceMs: DAY_MS },
);

export default crons;

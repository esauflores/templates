import { runToCompletion } from "@convex-dev/migrations";
import { setup } from "@test/harness";
import { describe, expect, it } from "vitest";

import { api, components, internal } from "@/_generated/api";

const create = (t: ReturnType<typeof setup>, email: string) =>
  t
    .withIdentity({ subject: "alice" })
    .mutation(api.features.sales.customers.create, { name: "Acme", email, plan: "pro", status: "active" });

describe("normalizeCustomerEmails migration", () => {
  it("rewrites only the rows that need it", async () => {
    const t = setup();
    const messy = await create(t, "  MiXeD@Acme.TEST ");
    const clean = await create(t, "fine@acme.test");

    await t.run(async (ctx) => {
      await runToCompletion(
        ctx as never,
        components.migrations,
        internal.infrastructure.jobs.migrations.normalizeCustomerEmails,
      );
    });

    const alice = t.withIdentity({ subject: "alice" });
    expect((await alice.query(api.features.sales.customers.get, { id: messy._id }))?.email).toBe("mixed@acme.test");

    // Already-normal rows are returned untouched by `migrateOne`, so their
    // `_creationTime` is unchanged and no needless write happened.
    const untouched = await alice.query(api.features.sales.customers.get, { id: clean._id });
    expect(untouched?.email).toBe("fine@acme.test");
    expect(untouched?._creationTime).toBe(clean._creationTime);
  });

  it("is idempotent — a second run is a no-op", async () => {
    const t = setup();
    const customer = await create(t, "AGAIN@Acme.test");

    // `cursor: null` restarts from the top, so the second pass really does walk
    // the same rows again rather than being skipped as already-complete.
    for (let i = 0; i < 2; i++) {
      await t.run(async (ctx) => {
        await runToCompletion(
          ctx as never,
          components.migrations,
          internal.infrastructure.jobs.migrations.normalizeCustomerEmails,
          {
            cursor: null,
          },
        );
      });
    }

    expect(
      (await t.withIdentity({ subject: "alice" }).query(api.features.sales.customers.get, { id: customer._id }))?.email,
    ).toBe("again@acme.test");
  });
});

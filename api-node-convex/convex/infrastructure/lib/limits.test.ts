import { errorOf, rejectionCode, setup } from "@test/harness";
import { describe, expect, it } from "vitest";

import { api } from "@/_generated/api";

/**
 * The `uploads` bucket has `capacity: 5`, which is cheap to exhaust — the
 * `writes` bucket behaves identically with a larger budget.
 */
const upload = async (t: ReturnType<typeof setup>, subject: string, name: string) => {
  const as = t.withIdentity({ subject });
  const storageId = await as.run((ctx) => ctx.storage.store(new Blob(["x"])));
  return as.mutation(api.infrastructure.storage.files.save, { storageId, name });
};

const exhaustUploads = async (t: ReturnType<typeof setup>, subject: string) => {
  for (let i = 0; i < 5; i++) await upload(t, subject, `f${i}.txt`);
};

describe("rate limits", () => {
  it("refuses work once the bucket is empty", async () => {
    const t = setup();
    await exhaustUploads(t, "alice");
    expect(await rejectionCode(upload(t, "alice", "one-too-many.txt"))).toBe("RATE_LIMITED");
  });

  it("meters each caller separately, so one tenant can't starve another", async () => {
    const t = setup();
    await exhaustUploads(t, "alice");
    expect(await rejectionCode(upload(t, "alice", "blocked.txt"))).toBe("RATE_LIMITED");

    // Bob's bucket is untouched.
    await expect(upload(t, "bob", "fine.txt")).resolves.toMatchObject({ name: "fine.txt" });
  });

  it("keeps uploads and ordinary writes on separate budgets", async () => {
    const t = setup();
    await exhaustUploads(t, "alice");
    expect(await rejectionCode(upload(t, "alice", "blocked.txt"))).toBe("RATE_LIMITED");

    // Uploads are spent, but a cheap row write still goes through.
    await expect(
      t.withIdentity({ subject: "alice" }).mutation(api.features.sales.customers.create, {
        name: "Acme",
        email: "a@acme.test",
        plan: "pro",
        status: "active",
      }),
    ).resolves.toMatchObject({ name: "Acme" });
  });

  it("answers 429 with a Retry-After header over HTTP", async () => {
    const t = setup();
    const alice = t.withIdentity({ subject: "alice" });
    await exhaustUploads(t, "alice");

    const response = await alice.fetch("/files?name=blocked.txt", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "x",
    });

    expect(await errorOf(response)).toEqual({ status: 429, code: "RATE_LIMITED" });
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

import { asUser, rejectionCode, setup } from "@test/harness";
import { describe, expect, it } from "vitest";

import { api, internal } from "@/_generated/api";

/**
 * A note on `contentType`: `convex-test` writes only `size` and `sha256` into
 * its `_storage` stand-in, so the MIME type always reads back as `null` here
 * even though a real deployment records it. These tests therefore assert on
 * `size`, which the harness does track.
 */
describe("files (Convex storage)", () => {
  it("saves, lists with metadata and a URL, and removes", async () => {
    const alice = asUser("alice");

    const storageId = await alice.run((ctx) => ctx.storage.store(new Blob(["hello"], { type: "text/plain" })));
    const file = await alice.mutation(api.infrastructure.storage.files.save, { storageId, name: "hi.txt" });
    expect(file).toMatchObject({ name: "hi.txt", size: 5, ownerId: "alice" });

    const [listed] = await alice.query(api.infrastructure.storage.files.list, {});
    expect(listed).toMatchObject({ _id: file._id });
    expect(typeof listed!.url).toBe("string");

    await alice.mutation(api.infrastructure.storage.files.remove, { id: file._id });
    expect(await alice.query(api.infrastructure.storage.files.list, {})).toEqual([]);
  });

  it("takes size from storage rather than from the caller", async () => {
    const alice = asUser("alice");
    const storageId = await alice.run((ctx) => ctx.storage.store(new Blob(["0123456789"], { type: "image/png" })));

    // The only metadata `save` accepts is the display name — there is no
    // `size` or `contentType` argument to lie about.
    const file = await alice.mutation(api.infrastructure.storage.files.save, { storageId, name: "photo.png" });
    expect(file.size).toBe(10);
  });

  it("rejects a storage id with no blob behind it", async () => {
    const alice = asUser("alice");
    const storageId = await alice.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await alice.run((ctx) => ctx.storage.delete(storageId));

    expect(
      await rejectionCode(alice.mutation(api.infrastructure.storage.files.save, { storageId, name: "gone" })),
    ).toBe("NOT_FOUND");
  });

  it("stops a second user from claiming a blob that is already owned", async () => {
    const t = setup();
    const alice = t.withIdentity({ subject: "alice" });
    const storageId = await alice.run((ctx) => ctx.storage.store(new Blob(["secret"], { type: "text/plain" })));
    const file = await alice.mutation(api.infrastructure.storage.files.save, { storageId, name: "secret.txt" });

    // Bob knows the storage id and tries to register it as his own — which
    // would otherwise let him delete Alice's bytes through his own row.
    expect(
      await rejectionCode(
        t
          .withIdentity({ subject: "bob" })
          .mutation(api.infrastructure.storage.files.save, { storageId, name: "mine.txt" }),
      ),
    ).toBe("CONFLICT");

    // Alice's file and its bytes are untouched.
    expect(await alice.query(api.infrastructure.storage.files.get, { id: file._id })).toMatchObject({ size: 6 });
    expect(await t.run((ctx) => ctx.storage.getUrl(storageId))).not.toBeNull();
  });

  it("isolates owners", async () => {
    const alice = asUser("alice");
    const storageId = await alice.run((ctx) => ctx.storage.store(new Blob(["x"])));
    const file = await alice.mutation(api.infrastructure.storage.files.save, { storageId, name: "x" });

    const bob = asUser("bob");
    expect(await bob.query(api.infrastructure.storage.files.get, { id: file._id })).toBeNull();
    expect(await rejectionCode(bob.mutation(api.infrastructure.storage.files.remove, { id: file._id }))).toBe(
      "NOT_FOUND",
    );
  });

  it("accepts a raw HTTP upload and derives its metadata", async () => {
    const alice = asUser("alice");
    const res = await alice.fetch("/files?name=note.txt", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "the body",
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ name: "note.txt", size: 8 });

    const list = (await alice.fetch("/files", {}).then((r) => r.json())) as { items: unknown[]; isDone: boolean };
    expect(list).toMatchObject({ isDone: true });
    expect(list.items).toHaveLength(1);
  });

  it("pages over uploads like every other collection", async () => {
    const alice = asUser("alice");
    for (const name of ["a.txt", "b.txt", "c.txt"]) {
      const storageId = await alice.run((ctx) => ctx.storage.store(new Blob([name])));
      await alice.mutation(api.infrastructure.storage.files.save, { storageId, name });
    }

    const first = await alice.query(api.infrastructure.storage.files.paginated, {
      paginationOpts: { cursor: null, numItems: 2 },
    });
    expect(first.page.map((f) => f.name)).toEqual(["c.txt", "b.txt"]); // newest first
    expect(first.isDone).toBe(false);

    const second = await alice.query(api.infrastructure.storage.files.paginated, {
      paginationOpts: { cursor: first.continueCursor, numItems: 2 },
    });
    expect(second.page.map((f) => f.name)).toEqual(["a.txt"]);
  });

  it("sweeps blobs nobody claimed, and only those", async () => {
    const t = setup();
    const alice = t.withIdentity({ subject: "alice" });

    const saved = await alice.run((ctx) => ctx.storage.store(new Blob(["kept"])));
    const file = await alice.mutation(api.infrastructure.storage.files.save, { storageId: saved, name: "kept.txt" });

    // An upload URL was handed out and the bytes arrived, but `save` never ran —
    // so nothing references these and no query can see them.
    const orphan = await t.run((ctx) => ctx.storage.store(new Blob(["dropped"])));

    // `graceMs: 0` puts the cutoff at now, so both blobs are old enough to be
    // considered; the cron uses a day so an in-flight upload is never touched.
    expect(await t.mutation(internal.infrastructure.storage.files.sweepUnclaimedUploads, { graceMs: 0 })).toMatchObject(
      { deleted: 1 },
    );

    expect(await t.run((ctx) => ctx.db.system.get("_storage", orphan))).toBeNull();
    expect(await alice.query(api.infrastructure.storage.files.get, { id: file._id })).toMatchObject({
      name: "kept.txt",
    });
  });

  it("leaves a fresh unclaimed upload alone", async () => {
    const t = setup();
    const pending = await t.run((ctx) => ctx.storage.store(new Blob(["mid-flight"])));

    expect(
      await t.mutation(internal.infrastructure.storage.files.sweepUnclaimedUploads, { graceMs: 60_000 }),
    ).toMatchObject({ deleted: 0 });
    expect(await t.run((ctx) => ctx.db.system.get("_storage", pending))).not.toBeNull();
  });

  it("hands out an upload URL to authenticated callers only", async () => {
    expect(typeof (await asUser("alice").mutation(api.infrastructure.storage.files.generateUploadUrl, {}))).toBe(
      "string",
    );
    expect(await rejectionCode(setup().mutation(api.infrastructure.storage.files.generateUploadUrl, {}))).toBe(
      "UNAUTHENTICATED",
    );
  });
});

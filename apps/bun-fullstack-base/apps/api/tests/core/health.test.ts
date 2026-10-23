import { expect, it, vi } from "vite-plus/test";

import { createApp } from "@api/app.ts";
import { db } from "@api/core/db.ts";

/** Its own file: it closes the database, which every other test file needs open. */
it("answers 500 when the database can't be read, so the health check fails with it", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.$client.close();

  const response = await createApp().request("/api/health");

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Internal Server Error" });
});

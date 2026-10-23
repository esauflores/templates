import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { requestLogger } from "@api/core/logger.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requestLogger", () => {
  const app = new Hono()
    .use(requestLogger({ skip: ["/health"] }))
    .get("/health", (c) => c.text("ok"))
    .get("/missing", (c) => c.text("no", 404));

  it("logs one line per request, with its method, path, status and time", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await app.request("/missing");

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]![0]).toMatch(/^GET \/missing 404 \d+ms$/);
  });

  it("doesn't log the skipped paths", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await app.request("/health");

    expect(log).not.toHaveBeenCalled();
  });
});

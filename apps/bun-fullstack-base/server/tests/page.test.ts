import type { HTMLBundle } from "bun";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { pageRoutes } from "../src/page.ts";

let dir = "";

/** A page as build.ts outputs it: files in a folder, listed with the headers Bun computed for them. */
async function builtPage(files: Record<string, string>): Promise<HTMLBundle> {
  dir = await mkdtemp(join(tmpdir(), "page-"));
  for (const [name, body] of Object.entries(files)) await Bun.write(join(dir, name), body);
  return {
    index: join(dir, "index.html"),
    files: Object.keys(files).map((name) => ({
      path: join(dir, name),
      loader: name.endsWith(".html") ? "html" : "js",
      isEntry: true,
      headers: { etag: `"${name}"`, "content-type": name.endsWith(".html") ? "text/html" : "text/javascript" },
    })),
  };
}

afterEach(() => rm(dir, { recursive: true, force: true }));

describe("pageRoutes", () => {
  it("leaves a page that wasn't built to Bun", async () => {
    const page = { index: "index.html" } as HTMLBundle;

    expect(await pageRoutes(page)).toEqual({ "/*": page });
  });

  it("answers a built page's files from memory, with cache headers", async () => {
    const page = await builtPage({ "index.html": "<html></html>", "chunk-abc.js": "console.log(1)" });
    const routes = await pageRoutes(page);
    await rm(dir, { recursive: true });

    const html = routes["/*"] as Response;
    expect(await html.text()).toBe("<html></html>");
    expect(html.headers.get("cache-control")).toBe("no-cache");
    expect(html.headers.get("etag")).toBe('"index.html"');

    const js = Object.entries(routes).find(([path]) => path.endsWith("/chunk-abc.js"))?.[1] as Response;
    expect(await js.text()).toBe("console.log(1)");
    expect(js.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });
});

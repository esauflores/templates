import type { HTMLBundle } from "bun";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { compress } from "../build.ts";
import { pageRoutes } from "../src/page.ts";

const JS = "console.log('hello');\n".repeat(50);

let dir = "";

/** A page as build.ts outputs it: files in a folder, gzipped, listed with the headers Bun computed for them. */
async function builtPage(files: Record<string, string>): Promise<HTMLBundle> {
  dir = await mkdtemp(join(tmpdir(), "page-"));
  for (const [name, body] of Object.entries(files)) {
    await Bun.write(join(dir, name), body);
    await compress(join(dir, name));
  }
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

/** The route answering a path, matched by the end of its pattern. */
function route(routes: Awaited<ReturnType<typeof pageRoutes>>, path: string) {
  return Object.entries(routes).find(([pattern]) => pattern.endsWith(path))?.[1] as Response;
}

afterEach(() => rm(dir, { recursive: true, force: true }));

describe("pageRoutes", () => {
  it("leaves a page that wasn't built to Bun", async () => {
    const page = { index: "index.html" } as HTMLBundle;

    expect(await pageRoutes(page)).toEqual({ "/*": page });
  });

  it("answers a built page's files from memory, gzipped when that's smaller, with cache headers", async () => {
    const routes = await pageRoutes(await builtPage({ "index.html": "<html></html>", "chunk-abc.js": JS }));
    await rm(dir, { recursive: true });

    const html = route(routes, "/*");
    expect(await html.text()).toBe("<html></html>");
    expect(html.headers.get("content-encoding")).toBeNull();
    expect(html.headers.get("cache-control")).toBe("no-cache");
    expect(html.headers.get("etag")).toBe('"index.html"');

    const js = route(routes, "/chunk-abc.js");
    expect(js.headers.get("content-encoding")).toBe("gzip");
    expect(new TextDecoder().decode(Bun.gunzipSync(await js.arrayBuffer()))).toBe(JS);
    expect(js.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("answers the files in public/ at their own paths, checked every time", async () => {
    const page = await builtPage({ "index.html": "<html></html>" });
    await Bun.write(join(dir, "public", "robots.txt"), "User-agent: *\n");
    const robots = route(await pageRoutes(page), "/robots.txt");

    expect(await robots.text()).toBe("User-agent: *\n");
    expect(robots.headers.get("content-type")).toBe("text/plain;charset=utf-8");
    expect(robots.headers.get("cache-control")).toBe("no-cache");
  });
});

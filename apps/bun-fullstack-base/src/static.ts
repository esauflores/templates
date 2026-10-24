import type { HTMLBundle } from "bun";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Hashed files change name with their content, so browsers and CDNs keep them for a year. */
const HASHED = "public, max-age=31536000, immutable";

/** index.html and public/ keep their names, so browsers check them on each use (ETag, 304 when unchanged). */
const REVALIDATE = "no-cache";

/** Security headers on every page file, matching the API's: no MIME sniffing, no framing, origin-only referrer. */
const SECURITY = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
};

/**
 * The web app's routes for Bun.serve. In dev, Bun bundles the page on request. Built, each file is read once and
 * served from memory, with its gzip copy when it has one. index.html answers every other path, so client-side routes
 * load.
 */
export async function pageRoutes(page: HTMLBundle): Promise<Record<string, HTMLBundle | Response>> {
  const built = (path: string) => (page.files ? resolve(import.meta.dir, path) : path);
  const routes: Record<string, HTMLBundle | Response> = await publicRoutes(
    join(dirname(built(page.index)), "public"),
    page,
  );
  if (!page.files) return { ...routes, "/*": page };

  for (const file of page.files) {
    const isPage = file.loader === "html";
    const headers = { ...file.headers, ...SECURITY, "cache-control": isPage ? REVALIDATE : HASHED };
    const route = `/${file.path.replace(/^\.\//, "")}`;
    routes[isPage ? "/*" : route] = await fromMemory(built(file.path), headers);

    const map = `${built(file.path)}.map`;
    if (!isPage && existsSync(map)) {
      routes[`${route}.map`] = await fromMemory(map, { "content-type": "application/json", "cache-control": HASHED });
    }
  }
  return routes;
}

/** Files in public/ at their own paths (robots.txt, llms.txt): not hashed, so checked on each load. */
async function publicRoutes(dir: string, page: HTMLBundle): Promise<Record<string, Response>> {
  const routes: Record<string, Response> = {};
  if (!existsSync(dir)) return routes;
  for await (const name of new Bun.Glob("**/*").scan({ cwd: dir, dot: true })) {
    if (name.endsWith(".gz")) continue;
    const path = join(dir, name);
    const headers = { "content-type": Bun.file(path).type, ...SECURITY, "cache-control": REVALIDATE };
    routes[`/${name}`] = page.files ? await fromMemory(path, headers) : new Response(Bun.file(path), { headers });
  }
  return routes;
}

/** A file's response, read once and answered from memory: its gzip copy (scripts/build.ts) when there is one. */
async function fromMemory(path: string, headers: Record<string, string>): Promise<Response> {
  const gzip = Bun.file(`${path}.gz`);
  const compressed = await gzip.exists();
  const body = await (compressed ? gzip : Bun.file(path)).bytes();
  return new Response(body, { headers: compressed ? { ...headers, "content-encoding": "gzip" } : headers });
}

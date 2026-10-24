import type { HTMLBundle } from "bun";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Hashed files change name when their content does, so browsers (and CDNs, public) keep them a year (31536000 s)
 * without asking again, even on reload (immutable): a deploy gives them new names, which the new index.html links.
 */
const HASHED = "public, max-age=31536000, immutable";

/**
 * index.html and public/ keep their names across deploys, so browsers keep a copy but check it before each use (with
 * the ETag, answered 304 when unchanged): a deploy shows at once. no-store is the one that doesn't keep a copy.
 */
const REVALIDATE = "no-cache";

/**
 * The web app's routes for Bun.serve. In dev, the page is Bun's to bundle as it's requested. Built ahead of time
 * (scripts/build.ts), it lists its files in dist/ instead: each is read once here and answered from memory, as Bun would
 * otherwise read the file again on every request. index.html answers every other path, so client-side routes load.
 * - Each file is one fixed answer, the same bytes for every client, so no code runs per request: Bun answers it on its
 *   fast path and adds the ETag, answering 304 when the client has that version. Compression is the reverse proxy's job
 *   (see "Docker" in the README), not this process's.
 * - The files in the web app's public/ are answered at their own paths too (/robots.txt), as Vite does.
 * - A built page lists its files relative to the built server (dist/server.js, which this file is bundled into), so
 *   they're read from there, and the server runs from any working directory.
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
    const headers = { ...file.headers, "cache-control": isPage ? REVALIDATE : HASHED };
    routes[isPage ? "/*" : `/${file.path.replace(/^\.\//, "")}`] = await fromMemory(built(file.path), headers);
  }
  return routes;
}

/**
 * Each file in public/ at its path, for the files that need a fixed one (robots.txt, llms.txt): not hashed, so
 * checked every time. In dev, read on each request, so edits show; built, read once from the copy in dist/.
 */
async function publicRoutes(dir: string, page: HTMLBundle): Promise<Record<string, Response>> {
  const routes: Record<string, Response> = {};
  if (!existsSync(dir)) return routes;
  for await (const name of new Bun.Glob("**/*").scan({ cwd: dir, dot: true })) {
    const path = join(dir, name);
    const headers = { "content-type": Bun.file(path).type, "cache-control": REVALIDATE };
    routes[`/${name}`] = page.files ? await fromMemory(path, headers) : new Response(Bun.file(path), { headers });
  }
  return routes;
}

/** A file's response, read once and answered from memory. */
async function fromMemory(path: string, headers: Record<string, string>): Promise<Response> {
  return new Response(await Bun.file(path).bytes(), { headers });
}

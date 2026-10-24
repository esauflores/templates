import { cp, rm } from "node:fs/promises";
import { join } from "node:path";

import { compileCss, root } from "./css.ts";

/**
 * The production build: the page's stylesheet compiled by Tailwind, then server.ts with everything it imports, the API
 * and the page included, bundled into dist/. The page's TSX becomes hashed files next to the server, which serves them
 * from there, so production installs nothing and bundles nothing at runtime.
 * - root is src/, so dist/ mirrors it (dist/server.js, dist/web/index.html), and publicPath makes the page link its
 *   files from / on any route.
 * - The web app's public/ is copied as is, for static.ts to answer its files at their own paths, and the API's
 *   migrations into dist/migrations/, next to the bundled server, as they're next to core/db.ts in the source.
 * - The database is SQLite from Bun itself (bun:sqlite), so dist/ has no addon to carry or load, and it builds for
 *   any platform Bun does.
 * - The page's text files get a gzip copy, compressed once here at the highest level, which static.ts answers as is:
 *   about a third of the bytes, with no compression per request (see "Benchmark" in the README).
 * - The JavaScript and the stylesheet are minified (Tailwind compiles it unminified); index.html is kept as written.
 * - NODE_ENV is inlined, which turns off the dev server in server.ts and gives React's production build.
 */
const outdir = join(root, "dist");
await rm(outdir, { recursive: true, force: true });

/** First: main.tsx imports it, so Bun bundles it with everything else. */
await compileCss();

const result = await Bun.build({
  entrypoints: [join(root, "src/server.ts")],
  root: join(root, "src"),
  outdir,
  target: "bun",
  minify: true,
  sourcemap: "linked",
  publicPath: "/",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
});
await cp(join(root, "src/web/public"), join(outdir, "web/public"), { recursive: true });
await cp(join(root, "src/api/core/migrations"), join(outdir, "migrations"), { recursive: true });

/** A gzip copy (file.gz) of each text file, only when it's smaller; not the server's own code or the source maps. */
const COMPRESSIBLE = /\.(html|js|css|svg|txt|xml|json)$/;
const publicFiles = await Array.fromAsync(
  new Bun.Glob("**/*").scan({ cwd: join(outdir, "web/public"), absolute: true }),
);
const pageFiles = [...result.outputs.map((output) => output.path), ...publicFiles].filter(
  (path) => COMPRESSIBLE.test(path) && path !== join(outdir, "server.js"),
);
for (const path of pageFiles) {
  const body = await Bun.file(path).bytes();
  const gzip = Bun.gzipSync(body, { level: 9 });
  if (gzip.length < body.length) await Bun.write(`${path}.gz`, gzip);
}
console.log(`Built ${result.outputs.length} files into dist/, ${pageFiles.length} of them gzipped`);

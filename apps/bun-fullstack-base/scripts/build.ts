import { cp, rm } from "node:fs/promises";
import { join } from "node:path";

import { compileCss, root } from "./css.ts";

/**
 * The production build: compiles the stylesheet, then bundles server.ts (with the API and the page) into dist/, which
 * then runs without node_modules. Text files get a gzip copy that static.ts serves as is. NODE_ENV is inlined as
 * production.
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

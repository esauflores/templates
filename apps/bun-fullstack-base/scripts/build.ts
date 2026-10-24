import { readFileSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The production build: the page's stylesheet compiled by Tailwind, then server.ts with everything it imports, the API
 * and the page included, bundled into dist/. The page's TSX becomes hashed files next to the server, which serves them
 * from there, so production installs nothing and bundles nothing at runtime.
 * - root is src/, so dist/ mirrors it (dist/server.js, dist/web/index.html), and publicPath makes the page link its
 *   files from / on any route.
 * - The built server finds those files from its working directory: run it from dist/ (`bun run start` does).
 * - The web app's public/ is copied as is, for static.ts to answer its files at their own paths, and the API's
 *   migrations into dist/migrations/, next to the bundled server, as they're next to core/db.ts in the source.
 * - The database is SQLite from Bun itself (bun:sqlite), so dist/ has no addon to carry or load, and it builds for
 *   any platform Bun does.
 * - Nothing is compressed here: the reverse proxy in front of the server does it (see "Docker" in the README), so every
 *   client gets the same bytes and Bun keeps its fast path for static responses.
 * - One minifier pass, on everything this build writes: the page's stylesheet (Tailwind compiles it unminified, above)
 *   and the TypeScript, the server and the page alike. `identifiers` renames local variables in the
 *   JavaScript only, as CSS has none of its own to rename.
 * - NODE_ENV is inlined, which turns off the dev server in server.ts and gives React's production build.
 */
export const buildOptions = {
  entrypoints: [fileURLToPath(new URL("../src/server.ts", import.meta.url))],
  root: fileURLToPath(new URL("../src", import.meta.url)),
  target: "bun",
  minify: { whitespace: true, syntax: true, identifiers: true },
  sourcemap: "linked",
  publicPath: "/",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
} satisfies Bun.BuildConfig;

/** The repo root: where Tailwind runs, so it scans src/web for the classes the page uses. */
const root = fileURLToPath(new URL("..", import.meta.url));

/** What Tailwind compiles, and where: styles/generated.css (ignored by git) is the file main.tsx imports. */
const entry = join(root, "src/web/styles/global.css");
const stylesheet = join(root, "src/web/styles/generated.css");

/** The two fonts the stylesheet links: the name it gives them, and the package file behind it. */
const FONTS = [
  ["geist-latin-wght-normal.woff2", "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2"],
  ["geist-mono-latin-wght-normal.woff2", "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2"],
] as const;

/**
 * Compiles src/web/styles/global.css to `stylesheet` with Tailwind's CLI, the app's own `tailwindcss`, and inlines the
 * fonts into it: the CLI leaves url() alone, and Bun would then try to resolve "/fonts/…" as a file when it bundles the
 * stylesheet. Not minified: the build option below is.
 */
async function compileCss() {
  const pkg = Bun.resolveSync("@tailwindcss/cli/package.json", root);
  const { bin } = JSON.parse(readFileSync(pkg, "utf8")) as { bin: { tailwindcss: string } };
  const build = Bun.spawn([process.execPath, join(dirname(pkg), bin.tailwindcss), "-i", entry, "-o", stylesheet], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await build.exited) !== 0) throw new Error(`Tailwind exited with ${build.exitCode}`);

  let css = await Bun.file(stylesheet).text();
  for (const [name, file] of FONTS) {
    const font = await Bun.file(Bun.resolveSync(file, root)).arrayBuffer();
    const data = `data:font/woff2;base64,${Buffer.from(font).toString("base64")}`;
    css = css.replaceAll(new RegExp(`url\\(\\s*["']?/fonts/${name}["']?\\s*\\)`, "g"), `url("${data}")`);
  }
  await Bun.write(stylesheet, css);
}

if (import.meta.main) {
  const outdir = fileURLToPath(new URL("../dist", import.meta.url));
  await rm(outdir, { recursive: true, force: true });
  /** First: main.tsx imports it, so Bun bundles it with everything else. */
  await compileCss();
  const result = await Bun.build({ ...buildOptions, outdir });
  const publicDir = `${outdir}/web/public`;
  await cp(fileURLToPath(new URL("../src/web/public", import.meta.url)), publicDir, { recursive: true });
  await cp(fileURLToPath(new URL("../src/api/core/migrations", import.meta.url)), `${outdir}/migrations`, {
    recursive: true,
  });
  console.log(`Built ${result.outputs.length} files into dist/`);
}

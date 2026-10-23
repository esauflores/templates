import tailwind from "bun-plugin-tailwind";
import { fileURLToPath } from "node:url";

/**
 * The production build: server.ts with everything it imports, the API and the web app's page included, bundled into
 * dist/. The page's TSX and CSS (through Tailwind) become hashed files next to the server, which serves them from
 * there, so production installs nothing and bundles nothing at runtime.
 * - root is the repo, so dist/ mirrors it (dist/server/src/server.js, dist/apps/web/index.html), and publicPath
 *   makes the page link its files from / on any route.
 * - The built server finds those files from its working directory: run it from dist/ (`bun run start` does).
 * - NODE_ENV is inlined, which turns off the dev server in server.ts and gives React's production build.
 */
export const buildOptions = {
  entrypoints: [fileURLToPath(new URL("./src/server.ts", import.meta.url))],
  root: fileURLToPath(new URL("..", import.meta.url)),
  target: "bun",
  plugins: [tailwind],
  minify: true,
  sourcemap: "linked",
  publicPath: "/",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
} satisfies Bun.BuildConfig;

/** The page's text files, which get a gzip copy; the server's own code (dist/server/) and source maps don't. */
const COMPRESSIBLE = /\.(html|js|css|svg)$/;

/** Writes a gzip copy next to a file (file.gz), at the highest level and only when it's smaller, for page.ts. */
export async function compress(path: string) {
  const body = await Bun.file(path).bytes();
  const gzip = Bun.gzipSync(body, { level: 9 });
  if (gzip.length < body.length) await Bun.write(`${path}.gz`, gzip);
}

if (import.meta.main) {
  const outdir = fileURLToPath(new URL("./dist", import.meta.url));
  const result = await Bun.build({ ...buildOptions, outdir });
  const pageFiles = result.outputs
    .map((output) => output.path)
    .filter((path) => COMPRESSIBLE.test(path) && !path.startsWith(`${outdir}/server/`));
  await Promise.all(pageFiles.map(compress));
  console.log(`Built ${result.outputs.length} files into server/dist/, ${pageFiles.length} of them gzipped`);
}

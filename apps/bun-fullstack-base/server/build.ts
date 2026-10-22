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

if (import.meta.main) {
  const result = await Bun.build({ ...buildOptions, outdir: fileURLToPath(new URL("./dist", import.meta.url)) });
  console.log(`Built ${result.outputs.length} files into server/dist/`);
}

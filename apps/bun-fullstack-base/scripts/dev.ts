import { watch } from "node:fs";
import { join } from "node:path";

import { compileCss, root } from "./css.ts";

/**
 * `bun run dev`: one `bun --hot` server for the API and the page, and the stylesheet rebuilt as src/web changes.
 * Tailwind's own `--watch` wants watchman or @parcel/watcher's native binary, which some installs block, so this
 * watches with node:fs and runs the CLI instead: about a tenth of a second, debounced.
 */

/** Builds run one after another, never two at once; a burst of edits is one build. */
let queue = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | undefined;
function rebuild() {
  clearTimeout(timer);
  timer = setTimeout(() => (queue = queue.then(compileCss).catch(console.error)), 100);
}

/** Once before the server answers, so the first page load has its CSS; then on every change under src/web. */
await compileCss();
const watcher = watch(join(root, "src/web"), { recursive: true }, (_event, name) => {
  /** Its own output, which would wake the watcher again. */
  if (name !== "styles/generated.css") rebuild();
});

const server = Bun.spawn([process.execPath, "--hot", "src/server.ts"], {
  cwd: root,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});
process.on("SIGINT", () => server.kill());
process.on("SIGTERM", () => server.kill());

await server.exited;
watcher.close();

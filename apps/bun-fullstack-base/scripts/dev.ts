import { readFileSync, watch } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `bun run dev`: one `bun --hot` server for the API and the page, and the stylesheet rebuilt as src/web changes.
 * Tailwind's own `--watch` wants watchman or @parcel/watcher's native binary, which some installs block, so this
 * watches with node:fs and runs the CLI instead: about a tenth of a second, debounced. The compile below is the same as
 * the one scripts/build.ts runs, kept here so neither script imports the other.
 */

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

let timer: ReturnType<typeof setTimeout> | undefined;
let building = false;

/** Rebuilds now, or once the current build is done: a burst of edits is one build. */
function rebuild() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    if (building) return rebuild();
    building = true;
    try {
      await compileCss();
    } catch (error) {
      console.error(error);
    } finally {
      building = false;
    }
  }, 100);
}

/** Once before the server answers, so the first page load has its CSS; then on every change under src/web. */
await compileCss();
const watcher = watch(join(root, "src/web"), { recursive: true }, (_event, name) => {
  /** Its own output, which would wake the watcher again. */
  if (name === "styles/generated.css") return;
  rebuild();
});

const server = Bun.spawn([process.execPath, "--hot", "src/server.ts"], {
  cwd: root,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const stop = () => {
  watcher.close();
  server.kill();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await server.exited;
watcher.close();

import { fileURLToPath } from "node:url";

/** The repo root: where Tailwind runs, so it scans src/web for the classes the page uses. */
export const root = fileURLToPath(new URL("..", import.meta.url));

/**
 * Compiles src/web/styles/global.css with Tailwind's CLI (the app's own, through `bun x`) into styles/generated.css,
 * ignored by git, the file main.tsx imports. Not minified: Bun minifies it with the page in the build. The fonts'
 * url()s point into node_modules, and Bun inlines them when it bundles the stylesheet.
 */
export async function compileCss() {
  const tailwind = Bun.spawn(
    [
      process.execPath,
      "x",
      "--bun",
      "tailwindcss",
      "-i",
      "src/web/styles/global.css",
      "-o",
      "src/web/styles/generated.css",
    ],
    { cwd: root, stdout: "inherit", stderr: "inherit" },
  );
  if ((await tailwind.exited) !== 0) throw new Error(`Tailwind exited with ${tailwind.exitCode}`);
}

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

/**
 * Vite+ checks and tests the code: `vp check` formats, lints and type-checks everything, with tsconfig.json (and
 * src/web/tsconfig.json, which swaps Bun's types for DOM and JSX). `vp test` runs the tests next to the code they test:
 * the server and API tests on Bun (no DOM), the web tests in headless Chromium through Playwright; each server test file
 * gets a database of its own, in memory. The web tests' API is mocked in the browser by MSW (src/web/mocks.ts, started
 * by src/web/mocks.setup.ts), so they need no server, port or database. Serving and bundling the web app is Bun's job,
 * not Vite's (src/server.ts), and the stylesheet is Tailwind's own CLI (scripts/build.ts, scripts/dev.ts).
 */
const root = fileURLToPath(new URL(".", import.meta.url));

/** MSW's service worker, which the web tests register: served from the package, as the browser needs a URL for it. */
const serviceWorker = readFileSync(Bun.resolveSync("msw/mockServiceWorker.js", root), "utf8");

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [
    {
      name: "msw",
      configureServer(server) {
        server.middlewares.use("/mockServiceWorker.js", (_request, response) => {
          response.setHeader("content-type", "text/javascript");
          response.end(serviceWorker);
        });
      },
    },
  ],
  test: {
    env: { DATABASE_PATH: ":memory:" },
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          include: ["src/**/*.test.ts"],
          exclude: ["src/web/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "web",
          include: ["src/web/**/*.test.{ts,tsx}"],
          setupFiles: [fileURLToPath(new URL("./src/web/mocks.setup.ts", import.meta.url))],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
  fmt: {
    tabWidth: 2,
    printWidth: 120,
    sortImports: {
      order: "asc",
      newlinesBetween: true,
      internalPattern: ["@/"],
      groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"], "style", "unknown"],
    },
  },
  lint: {
    categories: { correctness: "error" },
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        // The web app takes only the API's types (`import type { notesRoutes }`): importing its code would bundle the
        // server (and bun:sqlite) into the page.
        files: ["src/web/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            { patterns: [{ group: ["@/api/**"], allowTypeImports: true, message: "Only import type from @/api" }] },
          ],
        },
      },
    ],
  },
});

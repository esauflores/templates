import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

/**
 * Vite+ checks and tests the code: `vp check` formats, lints and type-checks everything, with tsconfig.json (and
 * src/web/tsconfig.json, which swaps Bun's types for DOM and JSX). `vp test` runs the tests next to the code they test:
 * the server and API tests on Bun (no DOM), the web tests in headless Chromium through Playwright, each test file on
 * a database of its own, in memory. Serving and bundling the web app is Bun's job, not Vite's (src/server.ts, with Tailwind as a Bun plugin, see bunfig.toml).
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
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

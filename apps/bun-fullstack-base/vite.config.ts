import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

/**
 * Vite+ checks and tests the code: `vp check` formats, lints and type-checks; `vp test` runs the API tests on Bun and
 * the web tests in headless Chromium. Bun serves and bundles the web app (src/server.ts), not Vite.
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
          name: "api",
          include: ["src/api/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "web",
          include: ["src/web/**/*.test.{ts,tsx}"],
          setupFiles: [fileURLToPath(new URL("./src/web/mocks/setup.ts", import.meta.url))],
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

import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "forks",
    // DB test files each spin up their own in-memory pglite and migrate it.
    // Run files serially so parallel forks don't starve each other's CPU and
    // trip the migrate step's timeout; keep a generous hook timeout for CI.
    fileParallelism: false,
    hookTimeout: 20_000,
  },
});

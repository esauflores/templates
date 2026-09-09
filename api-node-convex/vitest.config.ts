import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite doesn't read `paths` from tsconfig, so the same two aliases are
  // repeated here. The trailing slashes matter: a bare `@` would also swallow
  // `@convex-dev/...`.
  resolve: {
    alias: {
      "@/": new URL("./convex/", import.meta.url).pathname,
      "@test/": new URL("./test/", import.meta.url).pathname,
    },
  },
  test: {
    // convex-test runs functions in a mock Convex runtime, which needs the edge
    // (Web-standard) environment rather than Node.
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test", "@convex-dev/agent"] } },
    include: ["convex/**/*.test.ts"],
  },
});

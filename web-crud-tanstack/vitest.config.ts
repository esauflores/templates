import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Standalone from vite.config.ts — the Nitro / TanStack Start plugins don't run under test.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // The logic layer only (.ts) — components/screens are covered by the Playwright e2e suite.
      include: ["src/lib/**/*.ts", "src/components/crud/*.ts", "src/features/**/weekly.ts"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/*.d.ts"],
    },
  },
});

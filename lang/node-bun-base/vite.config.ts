import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
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
    categories: {
      correctness: "error",
    },
    env: {
      builtin: true,
      node: true,
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});

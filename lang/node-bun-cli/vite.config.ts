import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    tabWidth: 2,
    printWidth: 120,
    sortImports: {
      order: "asc",
      newlinesBetween: true,
      groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"], "style", "unknown"],
    },
  },
  lint: {
    categories: {
      correctness: "error",
    },
    env: {
      builtin: true,
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});

import { fileURLToPath } from "node:url";

import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [cloudflare(), ssrPlugin()],
});

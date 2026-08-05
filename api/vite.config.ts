import { fileURLToPath } from "node:url";

import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";

export default defineConfig({
  server: {
    // ponytail: Vite's CORS conflicts with Hono's middleware; upgrade by configuring Vite's CORS to mirror Hono's allowed origins
    cors: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [cloudflare(), ssrPlugin()],
});

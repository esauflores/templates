import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // @visx/* (alpha) and some d3 ESM packages, pulled in by the Bklit charts,
  // ship extensionless internal imports that Node's dev-SSR resolver rejects.
  // Bundle them for SSR instead of externalizing — the prod build already does.
  ssr: { noExternal: [/^@visx\//, /^d3-/] },
  plugins: [
    nitro({
      rollupConfig: { external: [/^@sentry\//] },
      // Baseline security headers on every response. Add a `Content-Security-Policy`
      // once you've inventoried the app's inline scripts/styles (framework hydration,
      // motion, charts) and your API origin — a wrong CSP silently breaks the page.
      routeRules: {
        "/**": {
          headers: {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
            "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
          },
        },
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;

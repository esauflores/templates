// External
import type { OpenAPIHono } from "@hono/zod-openapi";

// App
import type { Bindings } from "@/env";

// Infrastructure
import { auth } from "@/infrastructure/auth";

// Static — version is a build-time constant. With `moduleResolution: "Bundler"` and
// `resolveJsonModule: true` (default), Vite and Vitest both import JSON natively.
import pkg from "../../package.json" with { type: "json" };

/**
 * Composes the app's OpenAPI spec with Better Auth's, then returns the merged spec.
 *
 * Why this exists: `app.getOpenAPIDocument()` only knows about routes registered
 * with `.openapi()`. Better Auth's handler is mounted via `app.all("/api/auth/*", …)`
 * and is opaque to OpenAPIHono. We fetch Better Auth's spec via
 * `auth.api.generateOpenAPISchema()` and merge it.
 *
 * Two corrections happen during the merge:
 *
 * 1. Better Auth's paths are relative to the handler's base URL, so `/api/auth`
 *    is prepended to match the actual mount path.
 *
 * 2. Better Auth uses different tags for core and plugin endpoints. We overwrite
 *    every operation's tags with `"Auth"` so Swagger UI groups them together.
 */
export async function buildOpenAPIDocument(app: OpenAPIHono<{ Bindings: Bindings }>, env: Bindings) {
  const baseSpec = app.getOpenAPIDocument({
    openapi: "3.0.0",
    info: {
      title: pkg.name,
      version: pkg.version,
      description: "TODO: describe this API.",
    },
  });

  const authSpec = await auth(env).api.generateOpenAPISchema();

  const authPaths = Object.fromEntries(
    Object.entries(authSpec.paths ?? {}).map(([path, pathObj]) => {
      const methods = Object.fromEntries(
        Object.entries(pathObj).map(([method, methodOp]) => [method, { ...methodOp, tags: ["Auth"] }]),
      );

      return [`/api/auth${path}`, methods];
    }),
  );

  return {
    ...baseSpec,
    paths: {
      ...baseSpec.paths,
      ...authPaths,
    },
    components: {
      ...baseSpec.components,
      ...authSpec.components,
      schemas: {
        ...baseSpec.components?.schemas,
        ...authSpec.components?.schemas,
      },
    },
  };
}

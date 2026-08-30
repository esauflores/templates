// External
import type { OpenAPIHono } from "@hono/zod-openapi";

// App
import type { Bindings } from "@/env";

import pkg from "../../package.json" with { type: "json" };

export function registerOpenAPI(app: OpenAPIHono<{ Bindings: Bindings }>) {
  app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
    type: "http",
    scheme: "bearer",
  });
}

export function buildOpenAPIDocument(app: OpenAPIHono<{ Bindings: Bindings }>) {
  return app.getOpenAPIDocument({
    openapi: "3.0.0",
    info: {
      title: pkg.name,
      version: pkg.version,
      description: "Document-grounded chat and retrieval with PDF bounding boxes.",
    },
  });
}

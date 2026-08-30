// App
import { testBindings } from "@/env";
import { loadVectors } from "@/features/rag/store";
import app from "@/index";

// External
import { describe, expect, it } from "vitest";

describe("app", () => {
  it("GET /healthz reports chunk count", async () => {
    loadVectors([]);
    const res = await app.request("/healthz", {}, testBindings);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, chunks: 0 });
  });

  it("GET /doc lists the app routes", async () => {
    const res = await app.request("/doc", {}, testBindings);
    expect(res.status).toBe(200);
    const spec = (await res.json()) as { paths: Record<string, unknown> };
    expect(spec.paths).toHaveProperty("/healthz");
    expect(spec.paths).toHaveProperty("/ingest");
    expect(spec.paths).toHaveProperty("/retrieval");
    expect(spec.paths).toHaveProperty("/chat");
  });

  it("returns 401 when API_KEY is set and Bearer is missing", async () => {
    const res = await app.request(
      "/retrieval",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "What is an array?" }),
      },
      { ...testBindings, API_KEY: "secret" },
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});

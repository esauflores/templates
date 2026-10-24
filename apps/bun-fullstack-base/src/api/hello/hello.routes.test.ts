import { describe, expect, it } from "vite-plus/test";

import { createApp } from "@/api/app.ts";

import { HelloParamsSchema } from "./hello.routes.ts";

describe("GET /api/hello/{name}", () => {
  it("decodes a URL-encoded name in the hello route", async () => {
    const response = await createApp().request("/api/hello/Ada%20Lovelace");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Hello, Ada Lovelace!" });
  });

  it("rejects an invalid name with a 400 and a readable message", async () => {
    const response = await createApp().request(`/api/hello/${"a".repeat(51)}`);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.stringContaining("<=50 characters") });
  });
});

describe("HelloParamsSchema", () => {
  it("takes a name of 1 to 50 characters", () => {
    expect(HelloParamsSchema.parse({ name: "Ada" })).toEqual({ name: "Ada" });
    for (const name of ["", "a".repeat(51)]) expect(HelloParamsSchema.safeParse({ name }).success).toBe(false);
  });
});

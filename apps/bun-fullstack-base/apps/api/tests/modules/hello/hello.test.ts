import { describe, expect, it } from "vite-plus/test";

import { createApp } from "@api/app.ts";
import { greet } from "@api/modules/hello/hello.service.ts";

describe("greet", () => {
  it("greets by name", () => {
    expect(greet("Ada")).toEqual({ message: "Hello, Ada!" });
  });
});

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

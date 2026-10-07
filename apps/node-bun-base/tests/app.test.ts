import { describe, expect, it } from "vitest";

import app from "@/app.ts";

describe("app routes", () => {
  it("decodes a URL-encoded name in the hello route", async () => {
    const response = await app.request("/api/hello/Ada%20Lovelace");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ message: "Hello, Ada Lovelace!" });
  });

  it("returns not found for an unmatched route", async () => {
    const response = await app.request("/missing");

    expect(response.status).toBe(404);
  });
});

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

  it("infers each image in order and accepts an empty batch", async () => {
    const zero = [0.0].concat(Array<number>(783).fill(0));
    const one = Array<number>(784).fill(1);
    const post = (inputs: number[][]) =>
      app.request("/infer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inputs }),
      });
    const zeroResponse = await post([zero]);
    const oneResponse = await post([one]);
    const zeroScores = ((await zeroResponse.json()) as { scores: number[][] }).scores[0];
    const oneScores = ((await oneResponse.json()) as { scores: number[][] }).scores[0];
    expect(zeroResponse.status).toBe(200);
    expect(oneResponse.status).toBe(200);
    expect(zeroScores).toHaveLength(10);
    expect(oneScores).toHaveLength(10);
    expect([...zeroScores, ...oneScores].every(Number.isFinite)).toBe(true);
    expect(zeroScores).not.toEqual(oneScores);
    const reversed = await post([one, zero]);
    expect(reversed.status).toBe(200);
    expect((await reversed.json()).scores).toEqual([oneScores, zeroScores]);
    const empty = await post([]);
    expect(empty.status).toBe(200);
    expect(await empty.json()).toEqual({ scores: [] });
  });
});

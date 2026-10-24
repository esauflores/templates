import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";

import { error, json, validate } from "@/api/core/router.ts";

describe("validate", () => {
  const app = new Hono().get("/items/:id", validate("param", z.object({ id: z.coerce.number().int() })), (c) => {
    const { id } = c.req.valid("param");
    return c.json({ id }, 200);
  });

  it("answers invalid input with 400 { error } and Zod's readable message", async () => {
    const response = await app.request("/items/abc");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.stringMatching(/expected number.*\n.*at id/) });
  });

  it("runs the handler on valid input, with the parsed values", async () => {
    expect(await (await app.request("/items/7")).json()).toEqual({ id: 7 });
  });
});

describe("json and error", () => {
  it("document a JSON response for describeRoute, error with the { error } shape", () => {
    const response = json(z.object({ id: z.number() }), "The item");

    expect(response.description).toBe("The item");
    expect(response.content["application/json"].schema).toBeDefined();
    expect(error("No such item").description).toBe("No such item");
  });
});

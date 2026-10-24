import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api, ApiError, call } from "@/web/lib/api.ts";
import { mockApi } from "@/web/testing.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("call", () => {
  it("returns the typed body of a 2xx answer", async () => {
    mockApi({ "GET /api/hello/Ada": () => ({ body: { message: "Hello, Ada!" } }) });

    expect(await call(api.hello[":name"].$get({ param: { name: "Ada" } }))).toEqual({ message: "Hello, Ada!" });
  });

  it("throws an ApiError with the API's status and message", async () => {
    mockApi({
      "GET /api/hello/Ada": () => ({ status: 404, statusText: "Not Found", body: { error: "No such greeter" } }),
    });

    const error = await call(api.hello[":name"].$get({ param: { name: "Ada" } })).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: "ApiError", status: 404, statusText: "Not Found", message: "No such greeter" });
  });

  it("falls back to the status when the error has no body", async () => {
    mockApi({ "GET /api/hello/Ada": () => ({ status: 502 }) });

    await expect(call(api.hello[":name"].$get({ param: { name: "Ada" } }))).rejects.toThrow("Request failed (502)");
  });
});

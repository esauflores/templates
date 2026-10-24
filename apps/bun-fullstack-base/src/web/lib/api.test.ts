import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vite-plus/test";

import { api, ApiError, call } from "@/web/lib/api.ts";
import { worker } from "@/web/mocks.ts";

/** Every answer here comes from mocks.ts (MSW, in the browser): no server, no database. */
describe("call", () => {
  it("returns the typed body of a 2xx answer", async () => {
    expect(await call(api.hello[":name"].$get({ param: { name: "Ada" } }))).toEqual({ message: "Hello, Ada!" });
  });

  it("throws an ApiError with the API's status and message", async () => {
    worker.use(
      http.get("/api/hello/Ada", () =>
        HttpResponse.json({ error: "No such greeter" }, { status: 404, statusText: "Not Found" }),
      ),
    );

    const error = await call(api.hello[":name"].$get({ param: { name: "Ada" } })).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: "ApiError", status: 404, statusText: "Not Found", message: "No such greeter" });
  });

  it("falls back to the status when the error has no body and no status text", async () => {
    worker.use(http.get("/api/hello/Ada", () => new HttpResponse(null, { status: 599, statusText: "" })));

    await expect(call(api.hello[":name"].$get({ param: { name: "Ada" } }))).rejects.toThrow("Request failed (599)");
  });
});

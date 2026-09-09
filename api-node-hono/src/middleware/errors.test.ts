// External
import { HTTPException } from "hono/http-exception";
import { describe, expect, it, vi } from "vitest";

// Middleware
import { ApiError, notFound, onError } from "./errors";

// Helper Functions
const makeContext = (requestId?: string) => ({
  json: vi.fn().mockReturnValue("response"),
  get: vi.fn().mockReturnValue(requestId),
});

describe("notFound", () => {
  it("returns 404 with { code, message }", () => {
    const c = makeContext();
    notFound(c as any);
    expect(c.json).toHaveBeenCalledWith({ code: "not_found", message: "Not Found" }, 404);
  });
});

describe("onError", () => {
  it("maps a 4xx HTTPException status to a code and passes the message through", () => {
    const c = makeContext();
    onError(new HTTPException(404, { message: "Not Found Here" }), c as any);
    expect(c.json).toHaveBeenCalledWith({ code: "not_found", message: "Not Found Here" }, 404);
  });

  it("returns an ApiError's own code, message and details", () => {
    const c = makeContext();
    const err = new ApiError(422, "validation_error", "Request validation failed", [
      { path: "name", message: "Required" },
    ]);
    onError(err, c as any);
    expect(c.json).toHaveBeenCalledWith(
      {
        code: "validation_error",
        message: "Request validation failed",
        details: [{ path: "name", message: "Required" }],
      },
      422,
    );
  });

  it("includes requestId when the context has one", () => {
    const c = makeContext("req-123");
    onError(new ApiError(403, "forbidden", "Nope"), c as any);
    expect(c.json).toHaveBeenCalledWith({ code: "forbidden", message: "Nope", requestId: "req-123" }, 403);
  });

  it("sanitises a 5xx HTTPException to a generic body (does not leak internals)", () => {
    const c = makeContext();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    onError(new HTTPException(500, { message: "ECONNREFUSED db.internal:5432 password=hunter2" }), c as any);
    expect(c.json).toHaveBeenCalledWith({ code: "internal_error", message: "Internal Server Error" }, 500);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("sanitises non-HTTPException throws to 500 generic", () => {
    const c = makeContext();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    onError(new Error("stack trace with secrets"), c as any);
    expect(c.json).toHaveBeenCalledWith({ code: "internal_error", message: "Internal Server Error" }, 500);
    expect(consoleSpy).toHaveBeenCalled();
  });
});

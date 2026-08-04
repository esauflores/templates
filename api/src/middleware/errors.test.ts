// External
import { HTTPException } from "hono/http-exception";
import { describe, it, expect, vi } from "vitest";

// Middleware
import { notFound, onError } from "./errors";

// Helper Functions
const makeContext = () => ({ json: vi.fn().mockReturnValue("response") });

describe("notFound", () => {
  it("returns 404 with { error: 'Not Found' }", () => {
    const c = makeContext();
    notFound(c as any);
    expect(c.json).toHaveBeenCalledWith({ error: "Not Found" }, 404);
  });
});

describe("onError", () => {
  it("passes through 4xx HTTPException message and status", () => {
    const c = makeContext();
    const err = new HTTPException(404, { message: "Not Found Here" });
    onError(err, c as any);
    expect(c.json).toHaveBeenCalledWith({ error: "Not Found Here" }, 404);
  });

  it("sanitises 5xx HTTPException to a generic body (does not leak internals)", () => {
    const c = makeContext();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new HTTPException(500, { message: "ECONNREFUSED db.internal:5432 password=hunter2" });
    onError(err, c as any);
    expect(c.json).toHaveBeenCalledWith({ error: "Internal Server Error" }, 500);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("sanitises non-HTTPException throws to 500 generic", () => {
    const c = makeContext();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    onError(new Error("stack trace with secrets"), c as any);
    expect(c.json).toHaveBeenCalledWith({ error: "Internal Server Error" }, 500);
    expect(consoleSpy).toHaveBeenCalled();
  });
});

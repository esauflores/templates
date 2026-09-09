import { ConvexError } from "convex/values";

/**
 * Expected failures are thrown as `ConvexError`s carrying a machine-readable
 * `code`.
 *
 * Why not `throw new Error(...)`: on a production deployment Convex redacts
 * developer errors down to a generic "Server Error" with no message, so a
 * `new Error("Customer not found")` reaches clients as an opaque failure.
 * A `ConvexError`'s `data` payload survives redaction intact.
 *
 * The `code` is also what lets `infrastructure/lib/rest.ts` map a failure onto the
 * right HTTP status instead of guessing.
 */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_ARGUMENT"
  | "CONFLICT"
  | "RATE_LIMITED";

export type AppErrorData = { code: ErrorCode; message: string; retryAfterMs?: number };

const appError = (code: ErrorCode) => (message: string) => new ConvexError<AppErrorData>({ code, message });

/** No verified identity on the request. */
export const unauthenticated = appError("UNAUTHENTICATED");
/** Authenticated, but not allowed to touch this resource. */
export const forbidden = appError("FORBIDDEN");
/** Absent, or present but owned by someone else — the two are deliberately indistinguishable. */
export const notFound = appError("NOT_FOUND");
/** Well-formed request, unusable values (empty order, negative quantity, ...). */
export const invalidArgument = appError("INVALID_ARGUMENT");
/** Valid request that collides with existing state. */
export const conflict = appError("CONFLICT");

/**
 * Rate limit exhausted. Carries how long until capacity returns, so the HTTP
 * layer can answer with a `Retry-After` header instead of leaving the caller to
 * guess (and hammer).
 */
export const rateLimited = (message: string, retryAfterMs: number) =>
  new ConvexError<AppErrorData>({ code: "RATE_LIMITED", message, retryAfterMs });

export function isAppError(error: unknown): error is ConvexError<AppErrorData> {
  if (!(error instanceof ConvexError)) return false;
  const data: unknown = error.data;
  return typeof data === "object" && data !== null && "code" in data && "message" in data;
}

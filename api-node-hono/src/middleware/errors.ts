// External
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** One entry in a `validation_error`'s `details` array. */
export type ErrorDetail = { path: string; message: string };

/** The wire shape for every failure: `{ code, message, details?, requestId? }`. */
export type ErrorBody = {
  code: string;
  message: string;
  details?: ErrorDetail[];
  requestId?: string;
};

const CODE_BY_STATUS: Record<number, string> = {
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  405: "method_not_allowed",
  409: "conflict",
  413: "payload_too_large",
  415: "unsupported_media_type",
  422: "validation_error",
  429: "rate_limited",
  500: "internal_error",
  503: "service_unavailable",
};

/**
 * A thrown error carrying a stable machine `code` and optional field `details`.
 * Handlers throw this (`throw new ApiError(404, "not_found", "…")`); `onError`
 * turns it into the JSON body.
 */
export class ApiError extends HTTPException {
  readonly code: string;
  readonly details?: ErrorDetail[];

  constructor(status: ContentfulStatusCode, code: string, message: string, details?: ErrorDetail[]) {
    super(status, { message });
    this.code = code;
    this.details = details;
  }
}

const body = (code: string, message: string, requestId?: string, details?: ErrorDetail[]): ErrorBody => {
  const out: ErrorBody = { code, message };
  if (details?.length) out.details = details;
  if (requestId) out.requestId = requestId;
  return out;
};

export const notFound = (c: Context) => c.json(body("not_found", "Not Found", c.get("requestId")), 404);

export const onError = (err: unknown, c: Context) => {
  const requestId = c.get("requestId") as string | undefined;

  if (err instanceof ApiError) {
    if (err.status >= 500) console.error(err);
    const message = err.status >= 500 ? "Internal Server Error" : err.message;
    return c.json(body(err.code, message, requestId, err.details), err.status);
  }

  if (err instanceof HTTPException) {
    if (err.status >= 500) {
      console.error(err);
      return c.json(body("internal_error", "Internal Server Error", requestId), 500);
    }
    return c.json(body(CODE_BY_STATUS[err.status] ?? "error", err.message, requestId), err.status);
  }

  console.error(err);
  return c.json(body("internal_error", "Internal Server Error", requestId), 500);
};

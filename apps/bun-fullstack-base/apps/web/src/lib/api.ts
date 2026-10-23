import { QueryClient } from "@tanstack/react-query";
import type { AppType } from "api";
import { DetailedError, hc, parseResponse, type ClientResponse } from "hono/client";

/** The API's typed client, built from its routes: `api.hello[":name"].$get({ param: { name } })`. */
export const api = hc<AppType>("/").api;

/** An API error, with the message from its `{ error }` body, and its status (`404`, "Not Found"). */
export class ApiError extends Error {
  override readonly name = "ApiError";
  readonly status: number;
  readonly statusText: string;
  constructor(status: number, message: string, statusText = "") {
    super(message);
    this.status = status;
    this.statusText = statusText;
  }
}

/** Awaits an API call and returns its body, typed from the route, throwing an ApiError on a non-2xx answer. */
export async function call<T extends ClientResponse<unknown>>(request: Promise<T>) {
  try {
    return await parseResponse(request);
  } catch (error) {
    if (!(error instanceof DetailedError)) throw error;
    const { data, statusText } = error.detail as { data?: { error?: string }; statusText: string };
    const status = error.statusCode as number;
    throw new ApiError(status, data?.error || statusText || `Request failed (${status})`, statusText);
  }
}

/**
 * The app's query client. It retries what may pass next time (a 5xx or a network error) up to 3 times, and shows a
 * 4xx at once: the same request would fail the same way.
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: (failures, error) => failures < 3 && !(error instanceof ApiError && error.status < 500) },
    },
  });

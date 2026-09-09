import type { CrudChange } from "#/components/crud/use-crud";
import { env } from "#/env";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${env.VITE_API_URL}${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    throw new ApiError(res.status, (await res.text().catch(() => "")) || res.statusText);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Thin typed `fetch` — prefixes `VITE_API_URL`, sends/parses JSON, throws `ApiError` on non-2xx. */
export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  del: (path: string) => request<void>("DELETE", path),
};

/**
 * `persist` for {@link useCrud}: `useCrud(SEED, "project", { persist: crudPersist("projects") })`.
 * A no-op while `VITE_API_URL` is unset (the in-memory demo keeps working); once set,
 * every mutation hits `${VITE_API_URL}/<resource>`. Define it at module scope so the
 * reference stays stable across renders.
 */
export const crudPersist =
  <T extends { id: string }>(resource: string) =>
  async (change: CrudChange<T>): Promise<void> => {
    if (!env.VITE_API_URL) return;
    if (change.type === "create") {
      await api.post(`/${resource}`, change.item);
    } else if (change.type === "update") {
      await api.patch(`/${resource}/${change.id}`, change.patch);
    } else {
      await Promise.all(change.ids.map((id) => api.del(`/${resource}/${id}`)));
    }
  };

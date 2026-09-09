// App
import type { Storage } from "./index";

/**
 * Process-local object store — for tests and offline dev (`STORAGE_PROVIDER=memory`).
 * Contents are lost on restart. `url()` returns a `data:` URI so a browser can open it.
 */
const blobs = new Map<string, { body: Uint8Array; contentType: string }>();

export const memoryStorage = (): Storage => ({
  put: async (key, body, contentType) => {
    blobs.set(key, { body, contentType });
  },
  url: async (key) => {
    const blob = blobs.get(key);
    if (!blob) throw new Error(`storage: no object at ${key}`);
    return `data:${blob.contentType};base64,${Buffer.from(blob.body).toString("base64")}`;
  },
  delete: async (key) => {
    blobs.delete(key);
  },
});

/** Test helper: wipe the in-memory store between cases. */
export const clearMemoryStorage = () => blobs.clear();

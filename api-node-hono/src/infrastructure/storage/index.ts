// App
import type { Bindings } from "@/env";

import { memoryStorage } from "./memory";
import { s3Storage } from "./s3";

/** Object storage for uploaded files (PDFs). Keys are caller-chosen paths. */
export type Storage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** A time-limited URL a client can GET directly (presigned for S3, `data:` for memory). */
  url(key: string): Promise<string>;
  delete(key: string): Promise<void>;
};

export const storage = (env: Bindings): Storage => {
  switch (env.STORAGE_PROVIDER) {
    case "memory":
      return memoryStorage();
    case "s3":
    default:
      return s3Storage(env);
  }
};

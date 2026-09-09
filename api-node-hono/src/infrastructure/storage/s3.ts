// External
// Requires: pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// App
import type { Bindings } from "@/env";

import type { Storage } from "./index";

/**
 * S3 (or any S3-compatible store — set `S3_ENDPOINT` for R2 / MinIO, which also
 * flips on path-style addressing).
 */
export const s3Storage = (env: Bindings): Storage => {
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(env.S3_ENDPOINT),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  const Bucket = env.S3_BUCKET;

  return {
    put: async (key, body, contentType) => {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
    },
    url: (key) => getSignedUrl(client, new GetObjectCommand({ Bucket, Key: key }), { expiresIn: 900 }),
    delete: async (key) => {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
  };
};

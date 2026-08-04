// External
import { apiKey, defaultKeyHasher } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

// Database
import { user, apikey } from "@/db/schema";
import * as schema from "@/db/schema";

// Test Fixtures
import { db } from "@/tests/fixtures/db";

export const auth = () =>
  betterAuth({
    baseURL: "http://localhost:5173/api/auth",
    secret: "test-secret-do-not-use-in-production",
    database: drizzleAdapter(db(), { provider: "pg", schema }),
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
    plugins: [
      apiKey({
        defaultPrefix: "pk_",
      }),
    ],
  });

export const makeUser = async (identifier: string, emailVerified: boolean = false) => {
  const result = await auth().api.signUpEmail({
    body: {
      name: "Test User",
      email: `${identifier}@example.com`,
      password: "test-password-123",
    },
  });

  if (emailVerified) await db().update(user).set({ emailVerified: true }).where(eq(user.id, result.user.id));

  return result.user;
};

export const makeKey = async (userId: string) => {
  const plaintext = `pk_${crypto.randomUUID()}`;
  const hashed = await defaultKeyHasher(plaintext);

  await db().insert(apikey).values({
    id: crypto.randomUUID(),
    referenceId: userId,
    key: hashed,
  });

  return plaintext;
};

export const makeVerifiedUserWithKey = async (refId: string) => {
  const userRecord = await makeUser(refId, true);
  return makeKey(userRecord.id);
};

// External
import { defaultKeyHasher } from "@better-auth/api-key";
import { eq } from "drizzle-orm";

// App
import { testBindings } from "@/env";

// Database
import { user, apikey } from "@/db/schema";

// Infrastructure
import { auth } from "@/infrastructure/auth/better-auth";
import { db } from "@/infrastructure/db";

export const makeUser = async (identifier: string, emailVerified: boolean = false) => {
  const result = await auth(testBindings).api.signUpEmail({
    body: {
      name: "Test User",
      email: `${identifier}@example.com`,
      password: "test-password-123",
    },
  });

  if (emailVerified)
    await db(testBindings).update(user).set({ emailVerified: true }).where(eq(user.id, result.user.id));

  return result.user;
};

export const makeKey = async (userId: string) => {
  const plaintext = `pk_${crypto.randomUUID()}`;
  const hashed = await defaultKeyHasher(plaintext);

  await db(testBindings).insert(apikey).values({
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

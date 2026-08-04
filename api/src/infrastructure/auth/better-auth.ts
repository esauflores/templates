// External
import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

// App
import type { Bindings } from "@/env";

// Database
import * as schema from "@/db/schema";

// Infrastructure
import { db } from "@/infrastructure/db";
import { sendEmail } from "@/infrastructure/email";

export const auth = (env: Bindings) =>
  betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db(env), { provider: "pg", schema }),
    logger: { disabled: env.LOG_LEVEL === "silent" },
    emailAndPassword: { enabled: true },
    emailVerification: {
      sendOnSignUp: true,
      resendOnSignIn: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail(env, {
          to: user.email,
          subject: "Verify your email",
          text: `Click to verify your email: ${url}`,
          html: `<p>Click to verify your email:</p><p><a href="${url}">${url}</a></p>`,
          idempotencyKey: `verify-${user.id}`,
        });
      },
    },
    trustedOrigins: [env.BETTER_AUTH_URL],
    plugins: [
      apiKey({
        defaultPrefix: "pk_",
        rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 60 },
      }),
    ],
  });

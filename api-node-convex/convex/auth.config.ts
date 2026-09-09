import type { AuthConfig } from "convex/server";

/**
 * Auth providers Convex will trust. Convex validates incoming JWTs against the
 * issuer's JWKS itself — no server SDK.
 *
 * Clerk: activate the Convex integration in the Clerk dashboard, then point this
 * at your Frontend API URL (the token's `iss` claim):
 *   pnpm dlx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-subdomain>.clerk.accounts.dev
 * `applicationID` must match the token's `aud`, which the integration sets to
 * the literal `convex`.
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;

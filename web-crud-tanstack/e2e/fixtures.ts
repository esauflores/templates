import { test as base } from "@playwright/test";

const ORIGIN = "http://localhost:5173";
const SESSION = { user: { email: "e2e@test.dev", name: "E2E", emailVerified: true } };

/**
 * `test` pre-seeded with the mock session (localStorage) so pages render past the
 * `_app` auth gate. Import from here instead of `@playwright/test` for anything
 * that needs to be "signed in".
 */
export const test = base.extend({
  // Playwright requires the object-destructure form even with no fixture deps.
  // eslint-disable-next-line no-empty-pattern
  storageState: async ({}, use) => {
    await use({
      cookies: [],
      origins: [{ origin: ORIGIN, localStorage: [{ name: "web:demo-session", value: JSON.stringify(SESSION) }] }],
    });
  },
});

export { expect } from "@playwright/test";

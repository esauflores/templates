import { expect, test } from "@playwright/test"; // raw = unauthenticated

test("an unauthenticated visit redirects to /sign-in", async ({ page }) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/sign-in\?redirect=/);
  await expect(page.getByRole("heading", { name: /sign in to web crud/i })).toBeVisible();
});

test("signing in returns to the originally requested page", async ({ page }) => {
  await page.goto("/customers");
  await expect(page).toHaveURL(/\/sign-in/);

  await page.getByLabel("Email").fill("e2e@test.dev");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();

  await expect(page).toHaveURL(/\/customers$/);
  await expect(page.getByRole("link", { name: "Customers", exact: true })).toBeVisible();
});

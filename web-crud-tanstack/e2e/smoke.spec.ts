import { expect, test } from "./fixtures";

test("overview loads inside the sidebar shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Web CRUD" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reports", exact: true })).toBeVisible();
});

test("sidebar navigates between sections", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(page).toHaveURL(/\/customers$/);
  await expect(page.getByRole("button", { name: "New customer" }).first()).toBeVisible();

  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await expect(page).toHaveURL(/\/reports$/);
});

test("sign-in renders full-screen, outside the shell", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: /sign in to web crud/i })).toBeVisible();
  // the sidebar (and its nav links) is not mounted here
  await expect(page.getByRole("link", { name: "Customers", exact: true })).toHaveCount(0);
});

import { expect, test } from "./fixtures";

test("create then delete a project", async ({ page }) => {
  const name = `E2E project ${Date.now()}`;
  await page.goto("/projects");
  await expect(page.getByRole("button", { name: "New project" })).toBeVisible();

  // retry the click until React has hydrated and the dialog actually opens
  const dialog = page.getByRole("dialog");
  await expect(async () => {
    await page.getByRole("button", { name: "New project" }).first().click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();

  await dialog.getByLabel("Name").fill(name);
  await dialog.getByRole("button", { name: "Create" }).click();

  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toBeVisible();
  await expect(page.getByText(`Created project “${name}”`)).toBeVisible();

  // delete: inline row action → AlertDialog confirm
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

  await expect(row).toHaveCount(0);
  await expect(page.getByText(/Deleted project/)).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("an anonymous visitor is sent to the login page for /admin and /account", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)admin/);

    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)account/);
});

test("a registered customer has an empty order history and no access to the admin panel", async ({ page }) => {
    const email = `qa+${Date.now()}@example.com`;

    await page.goto("/register");
    await page.waitForLoadState("networkidle"); // form must attach event handlers before submission
    await page.getByLabel("Name").fill("QA Customer");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Password123!");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText("No orders yet.")).toBeVisible();

    const response = await page.goto("/admin");
    expect(response?.status()).toBe(404);
});
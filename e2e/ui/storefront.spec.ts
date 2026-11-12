import { expect, test } from "@playwright/test";

test("catalog lists products and filters by category", async ({ page }) => {
    await page.goto("/products");
    const main = page.locator("main");

    await expect(main.getByRole("link", { name: /E2E Runner/ })).toBeVisible();
    await expect(main.getByRole("link", { name: /E2E Lifestyle/ })).toBeVisible();

    await main.getByRole("link", { name: /^running$/i }).click();
    await expect(page).toHaveURL(/category=running/);
    await expect(main.getByRole("link", { name: /E2E Runner/ })).toBeVisible();
    await expect(main.getByRole("link", { name: /E2E Lifestyle/ })).toHaveCount(0);
});

test("a customer can add a product to the cart", async ({ page }) => {
    await page.goto("/products/e2e-runner");

    // Early clicks may happen before hydration, so retry until the button becomes active
    await expect(async () => {
        await page.getByRole("button", { name: "42", exact: true }).click();
        await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible({ timeout: 1000 });
    }).toPass();

    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.locator("header").getByRole("link", { name: /^Cart/ })).toContainText(/\(\s*1\s*\)/); // new one

    await page.goto("/cart");
    await expect(page.getByText("E2E Runner")).toBeVisible();
    await expect(page.getByText("Size EU 42")).toBeVisible();
    await expect(page.getByText("$120.00").first()).toBeVisible();
});
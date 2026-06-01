import { test, expect } from "@playwright/test";

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Bolão da Família Bazante 2026")).toBeVisible();
});

test("signup form has all required fields", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByLabel("Nome completo")).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
});

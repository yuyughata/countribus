import { expect, test } from "@playwright/test";

test("landing page renders the hero and navigates to the dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("intercity journeys");

  await page.getByRole("link", { name: "View dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back 👋" })).toBeVisible();
});

test("dashboard shows KPI cards", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Gross booking value")).toBeVisible();
  await expect(page.getByText("Active trips")).toBeVisible();
});

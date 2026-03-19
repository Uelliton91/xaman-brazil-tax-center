import { test, expect } from "@playwright/test";

test("happy path with demo wallet", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Xaman Brazil Tax Center")).toBeVisible();

  await page.getByRole("button", { name: "Iniciar sessão" }).click();
  await page.getByRole("button", { name: "Sincronizar e recalcular" }).click();

  await expect(page.getByText("Transações normalizadas")).toBeVisible();
  await expect(page.getByText("ACQUISITION")).toBeVisible();
});


import { test, expect } from "@playwright/test";
import {
  mockAuthApi,
  mockSagaApi,
  mockHealthApi,
  setAuthState,
  TEST_USER,
  ADMIN_USER,
} from "./fixtures/api-mocks";

test.describe("Navigation", () => {
  test("home page is publicly accessible", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "ArchLens" })).toBeVisible();
    await expect(page.getByText("Drop your architecture diagram here")).toBeVisible();
  });

  test("navbar shows Sign In button when not logged in", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).not.toBeVisible();
  });

  test("protected route /analyses redirects to /login", async ({ page }) => {
    await page.goto("/analyses");

    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("protected route /compare redirects to /login", async ({ page }) => {
    await page.goto("/compare");

    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("navbar shows user links when authenticated", async ({ page }) => {
    await mockSagaApi(page);
    await page.goto("/");
    await setAuthState(page, TEST_USER);
    await page.reload();

    await expect(page.getByText(TEST_USER.username)).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  });

  test("navbar shows Admin link for admin users", async ({ page }) => {
    await mockAuthApi(page);
    await mockHealthApi(page);
    await page.goto("/");
    await setAuthState(page, ADMIN_USER);
    await page.reload();

    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
  });

  test("navbar hides Admin link for regular users", async ({ page }) => {
    await page.goto("/");
    await setAuthState(page, TEST_USER);
    await page.reload();

    await expect(page.getByRole("link", { name: "Admin" })).not.toBeVisible();
  });

  test("privacy policy page is accessible", async ({ page }) => {
    await page.goto("/privacy-policy");

    await expect(page.getByText("Privacidade")).toBeVisible();
  });

  test("terms page is accessible", async ({ page }) => {
    await page.goto("/terms");

    await expect(page.locator("body")).toContainText(/Termos|Terms/i);
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    await page.goto("/nonexistent-page-xyz");

    await expect(page.locator("body")).toContainText(/nao encontrada|not found|404/i);
  });

  test("theme toggle switches dark/light mode", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    const themeBtn = page.getByRole("button", { name: /theme|dark|light|toggle/i });

    if (await themeBtn.isVisible()) {
      const initialClass = await html.getAttribute("class");
      await themeBtn.click();
      await page.waitForTimeout(300);
      const newClass = await html.getAttribute("class");
      expect(initialClass).not.toBe(newClass);
    }
  });
});

import { test, expect } from "@playwright/test";
import { mockAuthApi, TEST_USER, setAuthState } from "./fixtures/api-mocks";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthApi(page);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator('[data-slot="card-title"]')).toHaveText("Sign In");
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.getByRole("link", { name: "Create one" })).toBeVisible();
  });

  test("successful login redirects to home", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#username").fill(TEST_USER.username);
    await page.locator("#password").fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL("/");
    await expect(page).toHaveURL("/");
  });

  test("login shows username in navbar after success", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#username").fill(TEST_USER.username);
    await page.locator("#password").fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL("/");
    await expect(page.getByText(TEST_USER.username, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  });

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator('[data-slot="card-title"]')).toHaveText("Create Account");
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
    await expect(page.locator("#termsAccepted")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("register button disabled until terms accepted", async ({ page }) => {
    await page.goto("/register");

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();

    await page.locator("#termsAccepted").check();
    await expect(submitBtn).toBeEnabled();
  });

  test("successful register redirects to login", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#username").fill(TEST_USER.username);
    await page.locator("#email").fill(TEST_USER.email);
    await page.locator("#password").fill(TEST_USER.password);
    await page.locator("#confirmPassword").fill(TEST_USER.password);
    await page.locator("#termsAccepted").check();
    await page.locator('button[type="submit"]').click();

    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("password mismatch shows error", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#password").fill("Test@12345");
    await page.locator("#confirmPassword").fill("Different@123");

    await expect(page.getByText("Passwords do not match.")).toBeVisible();
  });

  test("logout clears session and redirects", async ({ page }) => {
    await page.goto("/");
    await setAuthState(page);
    await page.reload();

    await expect(page.getByText(TEST_USER.username, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Logout" }).click();

    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("login navigates to register and back", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: "Create one" }).click();
    await expect(page).toHaveURL("/register");

    await page.getByRole("main").getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/login");
  });
});

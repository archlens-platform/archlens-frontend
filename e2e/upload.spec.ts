import { test, expect } from "@playwright/test";
import path from "path";
import {
  mockAuthApi,
  mockUploadApi,
  mockSagaApi,
  setAuthState,
  TEST_USER,
} from "./fixtures/api-mocks";

test.describe("Diagram Upload", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthApi(page);
    await mockUploadApi(page);
    await mockSagaApi(page);
  });

  test("upload area visible on home page", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Drop your architecture diagram here")).toBeVisible();
    await expect(page.getByText("PNG, JPEG, WebP or PDF up to 20MB")).toBeVisible();
  });

  test("file selection shows filename and analyze button", async ({ page }) => {
    await page.goto("/");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures", "test-diagram.png"));

    await expect(page.getByText("test-diagram.png")).toBeVisible();
    await expect(page.getByRole("button", { name: "Analyze Diagram" })).toBeVisible();
  });

  test("unauthenticated upload redirects to login", async ({ page }) => {
    await page.goto("/");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures", "test-diagram.png"));
    await page.getByRole("button", { name: "Analyze Diagram" }).click();

    await page.waitForURL("/login");
  });

  test("authenticated upload triggers analysis", async ({ page }) => {
    await page.goto("/");
    await setAuthState(page, TEST_USER);
    await page.reload();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures", "test-diagram.png"));
    await page.getByRole("button", { name: "Analyze Diagram" }).click();

    await page.waitForURL(/\/analyses\/diag-new-001/);
  });

  test("file clear button removes selection", async ({ page }) => {
    await page.goto("/");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures", "test-diagram.png"));

    await expect(page.getByText("test-diagram.png")).toBeVisible();

    const clearBtn = page.locator("button").filter({ has: page.locator("svg.lucide-x") });
    await clearBtn.click();

    await expect(page.getByText("test-diagram.png")).not.toBeVisible();
    await expect(page.getByText("Drop your architecture diagram here")).toBeVisible();
  });

  test("feature cards are displayed", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Multi-Provider AI")).toBeVisible();
    await expect(page.getByText("Consensus Engine")).toBeVisible();
    await expect(page.getByText("Real-time Updates")).toBeVisible();
    await expect(page.getByText("Detailed Reports")).toBeVisible();
  });
});

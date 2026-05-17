import { test, expect } from "@playwright/test";
import {
  mockSagaApi,
  mockReportApi,
  setAuthState,
  TEST_USER,
} from "./fixtures/api-mocks";

test.describe("Analyses", () => {
  test.beforeEach(async ({ page }) => {
    await mockSagaApi(page);
    await mockReportApi(page);
    await page.goto("/");
    await setAuthState(page, TEST_USER);
  });

  test("analyses page shows list when authenticated", async ({ page }) => {
    await page.goto("/analyses");

    await expect(page.getByText("Analyses").first()).toBeVisible();
    await expect(page.getByText("Architecture V1")).toBeVisible();
  });

  test("analyses page shows analysis count", async ({ page }) => {
    await page.goto("/analyses");

    await expect(page.getByText("1 diagram analyzed")).toBeVisible();
  });

  test("analyses page shows completed status badge", async ({ page }) => {
    await page.goto("/analyses");

    await expect(page.getByText("Completed")).toBeVisible();
  });

  test("empty state message when no analyses", async ({ page }) => {
    await page.route("**/api/orchestrator/saga?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          page: 1,
          pageSize: 12,
          totalCount: 0,
          totalPages: 0,
        }),
      });
    });

    await page.goto("/analyses");

    await expect(page.getByText("No analyses yet")).toBeVisible();
  });
});

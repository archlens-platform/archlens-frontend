import type { Page } from "@playwright/test";

export const TEST_USER = {
  username: "testuser",
  email: "test@archlens.dev",
  password: "Test@12345",
  role: "User",
};

export const ADMIN_USER = {
  username: "admin",
  email: "admin@archlens.dev",
  password: "Admin@123",
  role: "Admin",
};

const AUTH_RESPONSE = (user: typeof TEST_USER) => ({
  token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1bmlxdWVfbmFtZSI6InRlc3R1c2VyIiwicm9sZSI6IlVzZXIiLCJleHAiOjk5OTk5OTk5OTl9.fake",
  expiresInMinutes: 60,
  username: user.username,
  role: user.role,
});

const SAGA_ITEM = {
  correlationId: "saga-001",
  diagramId: "diag-001",
  analysisId: "analysis-001",
  fileName: "architecture-v1.png",
  currentState: "Completed",
  retryCount: 0,
  createdAt: "2026-04-01T10:00:00Z",
  updatedAt: "2026-04-01T10:05:00Z",
  processingTimeMs: 5200,
};

export async function mockAuthApi(page: Page) {
  await page.route("**/auth/login", async (route) => {
    const body = route.request().postDataJSON();
    if (body?.username && body?.password) {
      const user = body.username === "admin" ? ADMIN_USER : TEST_USER;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(AUTH_RESPONSE(user)),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid credentials" }),
      });
    }
  });

  await page.route("**/auth/register", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        userId: "user-001",
        username: TEST_USER.username,
        email: TEST_USER.email,
      }),
    });
  });
}

export async function mockSagaApi(page: Page) {
  await page.route("**/api/orchestrator/saga?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [SAGA_ITEM],
        page: 1,
        pageSize: 12,
        totalCount: 1,
        totalPages: 1,
      }),
    });
  });

  await page.route("**/api/orchestrator/saga/diagram/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SAGA_ITEM),
    });
  });
}

export async function mockUploadApi(page: Page) {
  await page.route("**/api/upload/diagrams", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          diagramId: "diag-new-001",
          isDuplicate: false,
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 }),
      });
    }
  });
}

export async function mockHealthApi(page: Page) {
  const healthRoutes = [
    "**/health",
    "**/api/upload/health",
    "**/api/orchestrator/health",
    "**/api/reports/health",
    "**/api/ai/health",
  ];

  for (const route of healthRoutes) {
    await page.route(route, async (r) => {
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "Healthy" }),
      });
    });
  }
}

export async function mockReportApi(page: Page) {
  await page.route("**/api/reports/reports/analysis/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "report-001",
        analysisId: "analysis-001",
        diagramId: "diag-001",
        overallScore: 7.8,
        confidence: 0.85,
        scores: {
          scalability: 7.5,
          security: 7.0,
          reliability: 8.0,
          maintainability: 8.5,
        },
        components: [
          { name: "API Gateway", type: "Gateway", description: "Entry point", confidence: 0.9 },
          { name: "Auth Service", type: "Microservice", description: "Authentication", confidence: 0.85 },
        ],
        connections: [],
        risks: [
          { title: "Single Point of Failure", severity: "high", category: "Reliability", description: "Gateway has no redundancy", mitigation: "Add failover" },
        ],
        recommendations: ["Add Load Balancer"],
        providersUsed: ["openai", "gemini"],
        processingTimeMs: 5200,
        createdAt: "2026-04-01T10:05:00Z",
      }),
    });
  });
}

export async function setAuthState(page: Page, user = TEST_USER) {
  await page.evaluate(
    ({ token, username, role }) => {
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      localStorage.setItem("archlens_token", token);
      localStorage.setItem(
        "archlens_user",
        JSON.stringify({ username, role, expires })
      );
    },
    {
      token: AUTH_RESPONSE(user).token,
      username: user.username,
      role: user.role,
    }
  );
}

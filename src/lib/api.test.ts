import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

let requestInterceptor: ((config: Record<string, unknown>) => Record<string, unknown>) | null = null;
let responseSuccessInterceptor: ((response: unknown) => unknown) | null = null;
let responseErrorInterceptor: ((error: unknown) => unknown) | null = null;

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    interceptors: {
      request: {
        use: (fn: (config: Record<string, unknown>) => Record<string, unknown>) => {
          requestInterceptor = fn;
        },
      },
      response: {
        use: (onSuccess: (r: unknown) => unknown, onError: (error: unknown) => unknown) => {
          responseSuccessInterceptor = onSuccess;
          responseErrorInterceptor = onError;
        },
      },
    },
  };
  return {
    default: {
      create: () => instance,
      get: (...args: unknown[]) => mockGet(...args),
    },
  };
});

vi.mock("@/lib/auth", () => ({
  getToken: vi.fn(() => "test-token"),
  logout: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("API interceptors", () => {
  it("request interceptor adds correlation id and auth header", async () => {
    await import("./api");
    expect(requestInterceptor).not.toBeNull();

    const config = { headers: {} as Record<string, string> };
    const result = requestInterceptor!(config);
    expect(result.headers["X-Correlation-Id"]).toBeDefined();
    expect(result.headers["Authorization"]).toBe("Bearer test-token");
  });

  it("response success interceptor returns response unchanged", async () => {
    await import("./api");
    expect(responseSuccessInterceptor).not.toBeNull();

    const mockResponse = { data: { id: "123" }, status: 200 };
    const result = responseSuccessInterceptor!(mockResponse);
    expect(result).toBe(mockResponse);
  });

  it("response error interceptor calls logout on 401 for non-auth routes", async () => {
    const { logout } = await import("@/lib/auth");
    await import("./api");
    expect(responseErrorInterceptor).not.toBeNull();

    const error = {
      config: { url: "/api/reports/123" },
      response: { status: 401 },
    };

    await expect(responseErrorInterceptor!(error)).rejects.toBe(error);
    expect(logout).toHaveBeenCalled();
  });

  it("response error interceptor does NOT logout on 401 for auth routes", async () => {
    const { logout } = await import("@/lib/auth");
    vi.mocked(logout).mockClear();
    await import("./api");

    const error = {
      config: { url: "/auth/login" },
      response: { status: 401 },
    };

    await expect(responseErrorInterceptor!(error)).rejects.toBe(error);
    expect(logout).not.toHaveBeenCalled();
  });

  it("response error interceptor does NOT logout on non-401 errors", async () => {
    const { logout } = await import("@/lib/auth");
    vi.mocked(logout).mockClear();
    await import("./api");

    const error = {
      config: { url: "/api/reports" },
      response: { status: 500 },
    };

    await expect(responseErrorInterceptor!(error)).rejects.toBe(error);
    expect(logout).not.toHaveBeenCalled();
  });

  it("request interceptor skips auth header when no token", async () => {
    const { getToken } = await import("@/lib/auth");
    vi.mocked(getToken).mockReturnValue(null);
    await import("./api");

    const config = { headers: {} as Record<string, string> };
    const result = requestInterceptor!(config);
    expect(result.headers["X-Correlation-Id"]).toBeDefined();
    expect(result.headers["Authorization"]).toBeUndefined();

    vi.mocked(getToken).mockReturnValue("test-token");
  });

  it("response error interceptor handles missing config gracefully", async () => {
    const { logout } = await import("@/lib/auth");
    vi.mocked(logout).mockClear();
    await import("./api");

    const error = {
      config: undefined,
      response: { status: 401 },
    };

    await expect(responseErrorInterceptor!(error)).rejects.toBe(error);
  });
});

describe("API functions", () => {
  it("uploadDiagram sends FormData", async () => {
    mockPost.mockResolvedValue({
      data: { diagramId: "123", fileName: "test.png", fileHash: "abc", storagePath: "/path", createdAt: "2024-01-01" },
    });

    const { uploadDiagram } = await import("./api");
    const file = new File(["data"], "test.png", { type: "image/png" });
    const result = await uploadDiagram(file);

    expect(mockPost).toHaveBeenCalledWith(
      "/api/upload/diagrams",
      expect.any(FormData),
      expect.objectContaining({ headers: { "Content-Type": "multipart/form-data" } })
    );
    expect(result.diagramId).toBe("123");
  });

  it("getDiagramStatus fetches diagram by id", async () => {
    mockGet.mockResolvedValue({
      data: { id: "123", fileName: "test.png", status: "Completed" },
    });

    const { getDiagramStatus } = await import("./api");
    const result = await getDiagramStatus("123");
    expect(mockGet).toHaveBeenCalledWith("/api/upload/diagrams/123");
    expect(result.id).toBe("123");
  });

  it("listDiagrams passes page params", async () => {
    mockGet.mockResolvedValue({
      data: { items: [], page: 2, pageSize: 10, totalCount: 0, totalPages: 0 },
    });

    const { listDiagrams } = await import("./api");
    const result = await listDiagrams(2, 10);
    expect(mockGet).toHaveBeenCalledWith("/api/upload/diagrams", {
      params: { page: 2, pageSize: 10 },
    });
    expect(result.page).toBe(2);
  });

  it("getSagaStatus fetches saga by diagramId", async () => {
    mockGet.mockResolvedValue({
      data: { analysisId: "a1", currentState: "Completed" },
    });

    const { getSagaStatus } = await import("./api");
    const result = await getSagaStatus("d1");
    expect(mockGet).toHaveBeenCalledWith("/api/orchestrator/saga/diagram/d1");
    expect(result.currentState).toBe("Completed");
  });

  it("getReport fetches report by id", async () => {
    mockGet.mockResolvedValue({
      data: { id: "r1", overallScore: 8.5 },
    });

    const { getReport } = await import("./api");
    const result = await getReport("r1");
    expect(result.overallScore).toBe(8.5);
  });

  it("login sends credentials", async () => {
    mockPost.mockResolvedValue({
      data: { token: "jwt", username: "user", role: "User", expiresInMinutes: 60 },
    });

    const { login } = await import("./api");
    const result = await login({ username: "user", password: "pass" });
    expect(mockPost).toHaveBeenCalledWith("/auth/login", { username: "user", password: "pass" });
    expect(result.token).toBe("jwt");
  });

  it("register sends user data", async () => {
    mockPost.mockResolvedValue({
      data: { userId: "u1", username: "newuser", email: "a@b.com" },
    });

    const { register } = await import("./api");
    const result = await register({
      username: "newuser",
      email: "a@b.com",
      password: "Pass123!",
      lgpdConsent: true,
    });
    expect(result.userId).toBe("u1");
  });

  it("deleteMyAccount calls DELETE", async () => {
    mockDelete.mockResolvedValue({ data: {} });

    const { deleteMyAccount } = await import("./api");
    await deleteMyAccount();
    expect(mockDelete).toHaveBeenCalledWith("/auth/me");
  });

  it("exportMyData calls GET", async () => {
    mockGet.mockResolvedValue({ data: { username: "user" } });

    const { exportMyData } = await import("./api");
    const result = await exportMyData();
    expect(result).toEqual({ username: "user" });
  });

  it("checkServiceHealth returns health status for all services", async () => {
    mockGet.mockResolvedValue({ data: {} });

    const { checkServiceHealth } = await import("./api");
    const results = await checkServiceHealth();
    expect(results).toHaveLength(5);
    results.forEach((r) => {
      expect(r).toHaveProperty("name");
      expect(r).toHaveProperty("healthy");
    });
  });

  it("checkServiceHealth marks service as unhealthy on error", async () => {
    mockGet.mockRejectedValue(new Error("timeout"));

    const { checkServiceHealth } = await import("./api");
    const results = await checkServiceHealth();
    expect(results.every((r) => r.healthy === false)).toBe(true);
  });

  it("getReportByAnalysis fetches report by analysisId", async () => {
    mockGet.mockResolvedValue({
      data: { id: "r1", analysisId: "a1", overallScore: 7.5 },
    });

    const { getReportByAnalysis } = await import("./api");
    const result = await getReportByAnalysis("a1");
    expect(mockGet).toHaveBeenCalledWith("/api/reports/reports/analysis/a1");
    expect(result.overallScore).toBe(7.5);
  });

  it("listReports passes page params", async () => {
    mockGet.mockResolvedValue({
      data: { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });

    const { listReports } = await import("./api");
    const result = await listReports(1, 20);
    expect(mockGet).toHaveBeenCalledWith("/api/reports/reports", {
      params: { page: 1, pageSize: 20 },
    });
    expect(result.totalCount).toBe(0);
  });

  it("listSagas passes page params", async () => {
    mockGet.mockResolvedValue({
      data: { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });

    const { listSagas } = await import("./api");
    const result = await listSagas(1, 20);
    expect(mockGet).toHaveBeenCalledWith("/api/orchestrator/saga", {
      params: { page: 1, pageSize: 20 },
    });
    expect(result.totalCount).toBe(0);
  });

  it("getOrchestratorMetrics fetches metrics", async () => {
    mockGet.mockResolvedValue({
      data: { totalAnalyses: 10, completed: 8, failed: 2, processing: 0, averageProcessingTimeMs: 5000 },
    });

    const { getOrchestratorMetrics } = await import("./api");
    const result = await getOrchestratorMetrics();
    expect(result.totalAnalyses).toBe(10);
  });

  it("getReportMetrics fetches report metrics", async () => {
    mockGet.mockResolvedValue({
      data: { totalReports: 5, averageOverallScore: 7.8 },
    });

    const { getReportMetrics } = await import("./api");
    const result = await getReportMetrics();
    expect(result.totalReports).toBe(5);
  });

  it("deleteAnalysis calls delete on all services", async () => {
    mockDelete.mockResolvedValue({ data: {} });

    const { deleteAnalysis } = await import("./api");
    await deleteAnalysis("d1", "a1");
    expect(mockDelete).toHaveBeenCalledTimes(3);
  });

  it("getPrometheusMetrics returns metrics for all services", async () => {
    mockGet.mockResolvedValue({
      data: { data: { result: [{ value: [1234567890, "0.5"] }] } },
    });

    const { getPrometheusMetrics } = await import("./api");
    const results = await getPrometheusMetrics();
    expect(results).toHaveLength(6);
    results.forEach((m) => {
      expect(m).toHaveProperty("service");
      expect(m).toHaveProperty("requestRate");
      expect(m).toHaveProperty("errorRate");
      expect(m).toHaveProperty("latencyP95");
    });
  });

  it("getPrometheusMetrics handles failed requests", async () => {
    mockGet.mockRejectedValue(new Error("timeout"));

    const { getPrometheusMetrics } = await import("./api");
    const results = await getPrometheusMetrics();
    expect(results).toHaveLength(6);
    results.forEach((m) => {
      expect(m.requestRate).toBe(0);
      expect(m.errorRate).toBe(0);
      expect(m.latencyP95).toBe(0);
    });
  });

  it("getPrometheusMetrics handles rejected settled results", async () => {
    mockGet.mockResolvedValue({
      data: { data: { result: [] } },
    });

    const { getPrometheusMetrics } = await import("./api");
    const results = await getPrometheusMetrics();
    results.forEach((m) => {
      expect(m.requestRate).toBe(0);
    });
  });

  it("getPrometheusMetrics handles NaN values", async () => {
    mockGet.mockResolvedValue({
      data: { data: { result: [{ value: [1234567890, "not-a-number"] }] } },
    });

    const { getPrometheusMetrics } = await import("./api");
    const results = await getPrometheusMetrics();
    results.forEach((m) => {
      expect(m.requestRate).toBe(0);
    });
  });

  it("listDiagrams uses default params", async () => {
    mockGet.mockResolvedValue({
      data: { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });

    const { listDiagrams } = await import("./api");
    await listDiagrams();
    expect(mockGet).toHaveBeenCalledWith("/api/upload/diagrams", {
      params: { page: 1, pageSize: 20 },
    });
  });
});

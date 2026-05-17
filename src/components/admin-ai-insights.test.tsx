import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminAIInsights } from "./admin-ai-insights";
import type { OrchestratorMetrics, ReportMetrics } from "@/types";
import type { ServiceHealth, PrometheusMetric } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockOrchMetrics: OrchestratorMetrics = {
  totalAnalyses: 10,
  completed: 8,
  failed: 1,
  processing: 1,
  averageProcessingTimeMs: 5000,
  analysesByState: { Completed: 8, Failed: 1, Processing: 1 },
  recentAnalyses: [],
};

const mockReportMetrics: ReportMetrics = {
  totalReports: 8,
  averageOverallScore: 7.5,
  providerUsage: { openai: 5, anthropic: 3 },
  averageScores: {
    scalability: 7.0,
    security: 8.0,
    reliability: 7.5,
    maintainability: 7.0,
  },
};

const mockHealthData: ServiceHealth[] = [
  { name: "Gateway", url: "/health", healthy: true },
  { name: "Upload", url: "/api/upload/health", healthy: true },
  { name: "AI Processing", url: "/api/ai/health", healthy: false },
];

const mockPrometheusData: PrometheusMetric[] = [
  { service: "gateway", requestRate: 12.5, errorRate: 0.5, latencyP95: 120 },
];

describe("AdminAIInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders initial state with generate button", () => {
    render(
      <AdminAIInsights
        orchestratorMetrics={mockOrchMetrics}
        reportMetrics={mockReportMetrics}
        healthData={mockHealthData}
        prometheusData={mockPrometheusData}
      />
    );
    expect(screen.getByText("AI Operations Insights")).toBeInTheDocument();
    expect(screen.getByText("Generate Insights")).toBeInTheDocument();
  });

  it("shows loading state when generating", async () => {
    const api = await import("@/lib/api");
    const mockPost = vi.mocked(api.default.post);
    mockPost.mockImplementation(() => new Promise(() => {})); // never resolves

    render(
      <AdminAIInsights
        orchestratorMetrics={mockOrchMetrics}
        reportMetrics={mockReportMetrics}
        healthData={mockHealthData}
        prometheusData={mockPrometheusData}
      />
    );

    fireEvent.click(screen.getByText("Generate Insights"));
    expect(screen.getByText("Analyzing dashboard metrics...")).toBeInTheDocument();
  });

  it("displays insights after successful generation", async () => {
    const api = await import("@/lib/api");
    const mockPost = vi.mocked(api.default.post);
    mockPost.mockResolvedValueOnce({
      data: { content: "System is healthy. All services operational." },
    });

    render(
      <AdminAIInsights
        orchestratorMetrics={mockOrchMetrics}
        reportMetrics={mockReportMetrics}
        healthData={mockHealthData}
        prometheusData={mockPrometheusData}
      />
    );

    fireEvent.click(screen.getByText("Generate Insights"));

    await waitFor(() => {
      expect(screen.getByText(/System is healthy/)).toBeInTheDocument();
    });
  });

  it("displays error message on failure", async () => {
    const api = await import("@/lib/api");
    const mockPost = vi.mocked(api.default.post);
    mockPost.mockRejectedValueOnce(new Error("Network error"));

    render(
      <AdminAIInsights
        orchestratorMetrics={mockOrchMetrics}
        reportMetrics={mockReportMetrics}
        healthData={mockHealthData}
        prometheusData={mockPrometheusData}
      />
    );

    fireEvent.click(screen.getByText("Generate Insights"));

    await waitFor(() => {
      expect(
        screen.getByText(/Unable to generate insights/)
      ).toBeInTheDocument();
    });
  });

  it("parses SSE string responses", async () => {
    const api = await import("@/lib/api");
    const mockPost = vi.mocked(api.default.post);
    mockPost.mockResolvedValueOnce({
      data: 'data: {"content":"chunk1"}\ndata: {"content":"chunk2"}\ndata: [DONE]',
    });

    render(
      <AdminAIInsights
        orchestratorMetrics={mockOrchMetrics}
        reportMetrics={mockReportMetrics}
        healthData={mockHealthData}
        prometheusData={mockPrometheusData}
      />
    );

    fireEvent.click(screen.getByText("Generate Insights"));

    await waitFor(() => {
      expect(screen.getByText(/chunk1chunk2/)).toBeInTheDocument();
    });
  });

  it("renders without optional props", () => {
    render(
      <AdminAIInsights
        orchestratorMetrics={mockOrchMetrics}
        reportMetrics={undefined}
        healthData={undefined}
        prometheusData={undefined}
      />
    );
    expect(screen.getByText("Generate Insights")).toBeInTheDocument();
  });

  it("toggles auto-refresh button", () => {
    render(
      <AdminAIInsights
        orchestratorMetrics={mockOrchMetrics}
        reportMetrics={mockReportMetrics}
        healthData={mockHealthData}
        prometheusData={mockPrometheusData}
      />
    );

    const autoBtn = screen.getByText("Auto (5m)");
    fireEvent.click(autoBtn);
    expect(autoBtn).toBeInTheDocument();
  });

  it("shows refresh button after insights are loaded", async () => {
    const api = await import("@/lib/api");
    const mockPost = vi.mocked(api.default.post);
    mockPost.mockResolvedValueOnce({
      data: { content: "Some insights here" },
    });

    render(
      <AdminAIInsights
        orchestratorMetrics={mockOrchMetrics}
        reportMetrics={mockReportMetrics}
        healthData={mockHealthData}
        prometheusData={mockPrometheusData}
      />
    );

    fireEvent.click(screen.getByText("Generate Insights"));

    await waitFor(() => {
      expect(screen.getByText("Refresh Insights")).toBeInTheDocument();
    });
  });
});

import axios from "axios";
import { getToken, logout } from "@/lib/auth";
import type {
  DiagramUpload,
  OrchestratorMetrics,
  PagedResponse,
  ReportMetrics,
  ReportResponse,
  ReportSummary,
  SagaStatus,
  UploadResponse,
} from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  config.headers["X-Correlation-Id"] = crypto.randomUUID();
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthRoute = url.startsWith("/auth/");
    if (error.response?.status === 401 && !isAuthRoute) {
      logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export async function uploadDiagram(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<UploadResponse>("/api/upload/diagrams", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getDiagramStatus(id: string): Promise<DiagramUpload> {
  const { data } = await api.get<DiagramUpload>(`/api/upload/diagrams/${id}`);
  return data;
}

export async function listDiagrams(
  page = 1,
  pageSize = 20
): Promise<PagedResponse<DiagramUpload>> {
  const { data } = await api.get<PagedResponse<DiagramUpload>>("/api/upload/diagrams", {
    params: { page, pageSize },
  });
  return data;
}

export async function getSagaStatus(diagramId: string): Promise<SagaStatus> {
  const { data } = await api.get<SagaStatus>(`/api/orchestrator/saga/diagram/${diagramId}`);
  return data;
}

export async function listSagas(
  page = 1,
  pageSize = 20
): Promise<PagedResponse<SagaStatus>> {
  const { data } = await api.get<PagedResponse<SagaStatus>>("/api/orchestrator/saga", {
    params: { page, pageSize },
  });
  return data;
}

export async function getReport(id: string): Promise<ReportResponse> {
  const { data } = await api.get<ReportResponse>(`/api/reports/reports/${id}`);
  return data;
}

export async function getReportByAnalysis(analysisId: string): Promise<ReportResponse> {
  const { data } = await api.get<ReportResponse>(
    `/api/reports/reports/analysis/${analysisId}`
  );
  return data;
}

export async function listReports(
  page = 1,
  pageSize = 20
): Promise<PagedResponse<ReportSummary>> {
  const { data } = await api.get<PagedResponse<ReportSummary>>("/api/reports/reports", {
    params: { page, pageSize },
  });
  return data;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  lgpdConsent: boolean;
}

export interface AuthResponseData {
  token: string;
  expiresInMinutes: number;
  username: string;
  role: string;
}

export interface RegisterResponseData {
  userId: string;
  username: string;
  email: string;
}

export async function deleteAnalysis(diagramId: string, analysisId: string): Promise<void> {
  await Promise.allSettled([
    api.delete(`/api/upload/diagrams/${diagramId}`),
    api.delete(`/api/orchestrator/saga/diagram/${diagramId}`),
    api.delete(`/api/reports/reports/analysis/${analysisId}`),
  ]);
}

export async function login(req: LoginRequest): Promise<AuthResponseData> {
  const { data } = await api.post<AuthResponseData>("/auth/login", req);
  return data;
}

export async function register(req: RegisterRequest): Promise<RegisterResponseData> {
  const { data } = await api.post<RegisterResponseData>("/auth/register", req);
  return data;
}

export async function exportMyData(): Promise<object> {
  const { data } = await api.get<object>("/auth/me/data");
  return data;
}

export async function deleteMyAccount(): Promise<void> {
  await api.delete("/auth/me");
}

export async function getOrchestratorMetrics(): Promise<OrchestratorMetrics> {
  const { data } = await api.get<OrchestratorMetrics>("/api/orchestrator/saga/admin/metrics");
  return data;
}

export async function getReportMetrics(): Promise<ReportMetrics> {
  const { data } = await api.get<ReportMetrics>("/api/reports/reports/admin/metrics");
  return data;
}

export interface ServiceHealth {
  name: string;
  url: string;
  healthy: boolean;
}

export async function checkServiceHealth(): Promise<ServiceHealth[]> {
  const services = [
    { name: "Gateway", url: "/health" },
    { name: "Upload", url: "/api/upload/health" },
    { name: "Orchestrator", url: "/api/orchestrator/health" },
    { name: "Reports", url: "/api/reports/health" },
    { name: "AI Processing", url: "/api/ai/health" },
  ];

  const results = await Promise.allSettled(
    services.map(async (svc) => {
      try {
        await api.get(svc.url, { timeout: 5000 });
        return { ...svc, healthy: true };
      } catch (error: unknown) {
        return { ...svc, healthy: false, error: error instanceof Error ? error.message : "unreachable" };
      }
    })
  );

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { name: "Unknown", url: "", healthy: false }
  );
}

export interface PrometheusMetric {
  service: string;
  requestRate: number;
  errorRate: number;
  latencyP95: number;
  memoryMb: number;
  cpuPercent: number;
  activeConnections: number;
  exceptionsRate: number;
  status: "up" | "down";
}

export async function getPrometheusMetrics(): Promise<PrometheusMetric[]> {
  const services = [
    "archlens-gateway",
    "archlens-auth-service",
    "archlens-upload-service",
    "archlens-orchestrator-service",
    "archlens-report-service",
    "archlens-ai-processing",
  ];

  const q = {
    requestRate: (j: string) =>
      `sum(rate(archlens_http_server_request_duration_seconds_count{exported_job="${j}"}[5m]))`,
    errorRate: (j: string) =>
      `sum(rate(archlens_http_server_request_duration_seconds_count{exported_job="${j}",http_response_status_code=~"5.."}[5m])) / sum(rate(archlens_http_server_request_duration_seconds_count{exported_job="${j}"}[5m]))`,
    latencyP95: (j: string) =>
      `histogram_quantile(0.95, sum(rate(archlens_http_server_request_duration_seconds_bucket{exported_job="${j}"}[5m])) by (le))`,
    memory: (j: string) =>
      `sum(archlens_dotnet_process_memory_working_set_bytes{exported_job="${j}"})`,
    cpu: (j: string) =>
      `sum(rate(archlens_dotnet_process_cpu_time_seconds_total{exported_job="${j}"}[5m])) * 100`,
    connections: (j: string) =>
      `sum(archlens_kestrel_active_connections{exported_job="${j}"})`,
    exceptions: (j: string) =>
      `sum(rate(archlens_dotnet_exceptions_total{exported_job="${j}"}[5m]))`,
    up: (j: string) =>
      `sum(archlens_http_server_active_requests{exported_job="${j}"}) or vector(0)`,
  };

  const prom = (query: string) =>
    axios.get(`/api/prometheus`, { params: { query }, timeout: 5000 });

  const extractValue = (res: PromiseSettledResult<unknown>): number => {
    if (res.status !== "fulfilled") return 0;
    const data = (res.value as { data: { data: { result: { value: [number, string] }[] } } }).data;
    const result = data?.data?.result?.[0]?.value?.[1];
    const val = Number.parseFloat(result ?? "0");
    return Number.isNaN(val) ? 0 : val;
  };

  const results: PrometheusMetric[] = [];

  for (const svc of services) {
    try {
      const all = await Promise.allSettled([
        prom(q.requestRate(svc)),
        prom(q.errorRate(svc)),
        prom(q.latencyP95(svc)),
        prom(q.memory(svc)),
        prom(q.cpu(svc)),
        prom(q.connections(svc)),
        prom(q.exceptions(svc)),
        prom(q.up(svc)),
      ]);

      const hasData = all.some((r) => r.status === "fulfilled");

      results.push({
        service: svc.replace("archlens-", ""),
        requestRate: extractValue(all[0]),
        errorRate: extractValue(all[1]) * 100,
        latencyP95: extractValue(all[2]) * 1000,
        memoryMb: extractValue(all[3]) / (1024 * 1024),
        cpuPercent: extractValue(all[4]),
        activeConnections: extractValue(all[5]),
        exceptionsRate: extractValue(all[6]),
        status: hasData && extractValue(all[0]) >= 0 ? "up" : "down",
      });
    } catch {
      results.push({
        service: svc.replace("archlens-", ""),
        requestRate: 0, errorRate: 0, latencyP95: 0,
        memoryMb: 0, cpuPercent: 0, activeConnections: 0, exceptionsRate: 0, status: "down",
      });
    }
  }

  return results;
}

export interface JaegerTrace {
  traceId: string;
  rootService: string;
  rootOperation: string;
  durationMs: number;
  spanCount: number;
  services: string[];
  hasError: boolean;
  timestamp: number;
}

export async function getRecentTraces(): Promise<JaegerTrace[]> {
  const results: JaegerTrace[] = [];

  try {
    const { data: svcData } = await axios.get("/api/jaeger/api/services", { timeout: 5000 });
    const services: string[] = svcData?.data ?? [];

    const tracePromises = services
      .filter((s: string) => s !== "jaeger-all-in-one")
      .slice(0, 4)
      .map((svc: string) =>
        axios.get("/api/jaeger/api/traces", {
          params: { service: svc, limit: 5, lookback: "2h" },
          timeout: 5000,
        }).catch(() => null)
      );

    const responses = await Promise.all(tracePromises);
    const seen = new Set<string>();

    for (const res of responses) {
      if (!res?.data?.data) continue;
      for (const t of res.data.data) {
        if (seen.has(t.traceID)) continue;
        seen.add(t.traceID);

        const spans = t.spans ?? [];
        const processes = t.processes ?? {};
        const svcNames = [...new Set(Object.values(processes).map((p: unknown) => (p as { serviceName: string }).serviceName))];

        const rootSpan = spans.find((s: { references: unknown[] }) => !s.references?.length) ?? spans[0];
        if (!rootSpan) continue;

        const hasError = spans.some((s: { tags: { key: string; value: unknown }[] }) =>
          s.tags?.some((tag: { key: string; value: unknown }) => tag.key === "otel.status_code" && tag.value === "ERROR")
          || s.tags?.some((tag: { key: string; value: unknown }) => tag.key === "error" && tag.value === true)
        );

        const rootProcess = processes[rootSpan.processID];

        results.push({
          traceId: t.traceID,
          rootService: rootProcess?.serviceName?.replace("archlens-", "") ?? "unknown",
          rootOperation: rootSpan.operationName,
          durationMs: rootSpan.duration / 1000,
          spanCount: spans.length,
          services: svcNames.map((s: string) => s.replace("archlens-", "")),
          hasError,
          timestamp: rootSpan.startTime / 1000,
        });
      }
    }
  } catch {
    return [];
  }

  results.sort((a, b) => b.timestamp - a.timestamp);
  return results.slice(0, 10);
}

export async function getDiagramFileBlob(diagramId: string): Promise<string> {
  const { data } = await api.get(`/api/upload/diagrams/${diagramId}/file`, {
    responseType: "blob",
  });
  return URL.createObjectURL(data);
}

export async function generateFixedDiagram(
  analysisId: string,
  diagramName?: string | null,
  reportData?: object | null
): Promise<{ mermaid: string; provider: string }> {
  const { data } = await api.post<{ mermaid: string; provider: string }>(
    "/api/ai/api/generate-fixed-diagram",
    { analysis_id: analysisId, diagram_name: diagramName, report_data: reportData ?? null }
  );
  return data;
}

export default api;

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Gauge,
  Loader2,
  RefreshCw,
  Server,
  Shield,
  TrendingUp,
  Wifi,
  XCircle,
} from "lucide-react";
import {
  getOrchestratorMetrics,
  getReportMetrics,
  checkServiceHealth,
  getPrometheusMetrics,
  getRecentTraces,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ServiceHealth, PrometheusMetric, JaegerTrace } from "@/lib/api";
import { AdminAIInsights } from "@/components/admin-ai-insights";
import type { OrchestratorMetrics, ReportMetrics } from "@/types";

const stateColorMap: Record<string, string> = {
  Completed: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Failed: "bg-red-500/15 text-red-500 border-red-500/30",
  Processing: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
};

const stateBgMap: Record<string, string> = {
  Completed: "bg-emerald-500",
  Failed: "bg-red-500",
  Processing: "bg-yellow-500",
};

function errorRateColor(rate: number): string {
  if (rate > 5) return "text-red-500 dark:text-red-400";
  if (rate > 1) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function latencyColor(latency: number): string {
  if (latency > 5000) return "text-red-500 dark:text-red-400";
  if (latency > 1000) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function memoryColor(mb: number): string {
  if (mb > 500) return "text-red-500 dark:text-red-400";
  if (mb > 300) return "text-amber-600 dark:text-amber-400";
  if (mb > 0) return "text-sky-600 dark:text-sky-400";
  return "text-muted-foreground";
}

function cpuColor(pct: number): string {
  if (pct > 80) return "text-red-500 dark:text-red-400";
  if (pct > 50) return "text-amber-600 dark:text-amber-400";
  if (pct > 0) return "text-violet-600 dark:text-violet-400";
  return "text-muted-foreground";
}

function reqRateColor(rate: number): string {
  if (rate > 10) return "text-cyan-600 dark:text-cyan-300 font-semibold";
  if (rate > 1) return "text-cyan-600 dark:text-cyan-400";
  if (rate > 0) return "text-cyan-500/70 dark:text-cyan-500/70";
  return "text-muted-foreground";
}

function connectionsColor(n: number): string {
  if (n > 50) return "text-amber-600 dark:text-amber-400";
  if (n > 0) return "text-sky-600 dark:text-sky-400";
  return "text-muted-foreground";
}

function exceptionsColor(rate: number): string {
  if (rate > 1) return "text-red-500 dark:text-red-400 font-semibold";
  if (rate > 0) return "text-red-400 dark:text-red-400";
  return "text-emerald-600/60 dark:text-emerald-500/60";
}

function ServiceHealthSection({ health }: { health: ReturnType<typeof useQuery<ServiceHealth[]>> }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Server className="h-4 w-4" />
          Service Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        {health.isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {health.data?.map((svc: ServiceHealth) => (
              <div
                key={svc.name}
                className={`flex items-center gap-2 rounded-lg border p-3 transition-all ${
                  svc.healthy
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                {svc.healthy ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <p className="text-xs font-semibold">{svc.name}</p>
                  <p className={`text-[10px] ${svc.healthy ? "text-emerald-500" : "text-red-500"}`}>
                    {svc.healthy ? "Healthy" : "Unreachable"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricsCardsSection({
  om,
  successRate,
  rm,
}: {
  om: OrchestratorMetrics;
  successRate: string;
  rm: ReportMetrics | undefined;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
        <CardContent className="flex flex-col items-center pt-5 pb-4">
          <BarChart3 className="h-6 w-6 text-primary mb-1" />
          <span className="text-3xl font-bold">{om.totalAnalyses}</span>
          <span className="text-xs text-muted-foreground mt-1">Total Analyses</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center pt-5 pb-4">
          <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-1" />
          <span className="text-3xl font-bold text-emerald-400">{successRate}%</span>
          <span className="text-xs text-muted-foreground mt-1">Success Rate</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center pt-5 pb-4">
          <Clock className="h-6 w-6 text-cyan-400 mb-1" />
          <span className="text-3xl font-bold">
            {om.averageProcessingTimeMs > 0
              ? (om.averageProcessingTimeMs / 1000).toFixed(1)
              : "—"}
          </span>
          <span className="text-xs text-muted-foreground mt-1">Avg Time (s)</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center pt-5 pb-4">
          <TrendingUp className="h-6 w-6 text-purple-400 mb-1" />
          <span className="text-3xl font-bold">
            {rm ? rm.averageOverallScore.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-muted-foreground mt-1">Avg Score</span>
        </CardContent>
      </Card>
    </div>
  );
}

function PrometheusSection({ prometheus }: { prometheus: ReturnType<typeof useQuery<PrometheusMetric[]>> }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Gauge className="h-4 w-4" />
          Infrastructure Metrics
          <Badge variant="secondary" className="text-[10px]">OpenTelemetry + Prometheus</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {prometheus.isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!prometheus.isLoading && prometheus.data && !prometheus.isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Service</th>
                  <th className="pb-2 pr-3 font-medium text-center w-14">Status</th>
                  <th className="pb-2 pr-3 font-medium text-right">Req/s</th>
                  <th className="pb-2 pr-3 font-medium text-right">Error Rate</th>
                  <th className="pb-2 pr-3 font-medium text-right">P95</th>
                  <th className="pb-2 pr-3 font-medium text-right">Memory</th>
                  <th className="pb-2 pr-3 font-medium text-right">CPU</th>
                  <th className="pb-2 pr-3 font-medium text-right">Conns</th>
                  <th className="pb-2 font-medium text-right">Exceptions/s</th>
                </tr>
              </thead>
              <tbody>
                {prometheus.data.map((m: PrometheusMetric) => (
                  <tr key={m.service} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <Wifi className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{m.service}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex justify-center">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${m.status === "up" ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"}`} />
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono">
                      <span className={reqRateColor(m.requestRate)}>{m.requestRate.toFixed(2)}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <span className={`font-mono ${errorRateColor(m.errorRate)}`}>
                        {m.errorRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono">
                      <span className={latencyColor(m.latencyP95)}>
                        {m.latencyP95 > 1000
                          ? `${(m.latencyP95 / 1000).toFixed(2)}s`
                          : `${m.latencyP95.toFixed(0)}ms`}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono">
                      <span className={memoryColor(m.memoryMb)}>
                        {m.memoryMb > 0 ? `${m.memoryMb.toFixed(0)}MB` : "-"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono">
                      <span className={cpuColor(m.cpuPercent)}>
                        {m.cpuPercent > 0 ? `${m.cpuPercent.toFixed(1)}%` : "-"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono">
                      <span className={connectionsColor(m.activeConnections)}>
                        {m.activeConnections > 0 ? m.activeConnections.toFixed(0) : "-"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono">
                      <span className={exceptionsColor(m.exceptionsRate)}>
                        {m.exceptionsRate > 0 ? m.exceptionsRate.toFixed(2) : "0"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!prometheus.isLoading && (!prometheus.data || prometheus.isError) && (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Gauge className="h-8 w-8 opacity-30" />
            <p className="text-xs">
              Prometheus not available. Start the observability stack:
            </p>
            <code className="rounded bg-muted px-2 py-1 text-[10px]">
              docker compose --profile obs up -d
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysesByStateSection({ om, rm }: { om: OrchestratorMetrics; rm: ReportMetrics | undefined }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Analyses by State
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(om.analysesByState).map(([state, count]) => {
            const total = om.totalAnalyses || 1;
            const pct = ((count / total) * 100).toFixed(0);
            const color = stateBgMap[state] ?? "bg-blue-500";
            return (
              <div key={state} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{state}</span>
                  <span className="text-muted-foreground">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${color} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cpu className="h-4 w-4" />
            Provider Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rm ? (
            <div className="space-y-3">
              {Object.entries(rm.providerUsage).map(([provider, count]) => {
                const total = Object.values(rm.providerUsage).reduce((a, b) => a + b, 0) || 1;
                const pct = ((count / total) * 100).toFixed(0);
                const colors: Record<string, string> = {
                  gemini: "bg-blue-500",
                  "gpt-4o": "bg-green-500",
                  "gpt-4o-mini": "bg-purple-500",
                };
                return (
                  <div key={provider} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="secondary" className="text-[10px]">
                        {provider}
                      </Badge>
                      <span className="text-muted-foreground">
                        {count} reports ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${colors[provider] ?? "bg-primary"} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: "Scalability", value: rm.averageScores.scalability, color: "text-cyan-400" },
                  { label: "Security", value: rm.averageScores.security, color: "text-purple-400" },
                  { label: "Reliability", value: rm.averageScores.reliability, color: "text-pink-400" },
                  { label: "Maintainability", value: rm.averageScores.maintainability, color: "text-emerald-400" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className={`font-bold ${s.color}`}>{s.value.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No report data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RecentAnalysesSection({ om }: { om: OrchestratorMetrics }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          Recent Analyses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">File</th>
                <th className="pb-2 pr-4 font-medium">State</th>
                <th className="pb-2 pr-4 font-medium">Time</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {om.recentAnalyses.map((a) => {
                const stateColor = stateColorMap[a.currentState] ?? "bg-blue-500/15 text-blue-500 border-blue-500/30";
                return (
                  <tr key={a.analysisId} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium">
                      {a.fileName
                        ? a.fileName
                            .replace(/\.[^/.]+$/, "")
                            .replaceAll(/[-_]/g, " ")
                            .replaceAll(/\b\w/g, (c) => c.toUpperCase())
                        : a.analysisId.slice(0, 8)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant="outline" className={`text-[10px] ${stateColor}`}>
                        {a.currentState}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {a.processingTimeMs != null && a.processingTimeMs > 0
                        ? `${(a.processingTimeMs / 1000).toFixed(1)}s`
                        : "—"}
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
              {om.recentAnalyses.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    No analyses yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemHealthSummary({ prometheus, health }: {
  prometheus: ReturnType<typeof useQuery<PrometheusMetric[]>>;
  health: ReturnType<typeof useQuery<ServiceHealth[]>>;
}) {
  const metrics = prometheus.data;
  const services = health.data;
  if (!metrics || !services) return null;

  const healthyCount = services.filter((s) => s.healthy).length;
  const totalCount = services.length;
  const totalExceptions = metrics.reduce((sum, m) => sum + m.exceptionsRate, 0);
  const avgLatency = metrics.reduce((sum, m) => sum + m.latencyP95, 0) / (metrics.length || 1);
  const totalReqs = metrics.reduce((sum, m) => sum + m.requestRate, 0);
  const allHealthy = healthyCount === totalCount;

  return (
    <Card className={`border ${allHealthy ? "border-emerald-500/30 bg-emerald-500/[0.03]" : "border-amber-500/30 bg-amber-500/[0.03]"}`}>
      <CardContent className="flex items-center gap-4 py-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${allHealthy ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
          {allHealthy
            ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            : <AlertTriangle className="h-5 w-5 text-amber-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${allHealthy ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {allHealthy
              ? `All ${totalCount} services healthy`
              : `${healthyCount}/${totalCount} services healthy`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalReqs.toFixed(1)} req/s total
            {" · "}avg latency {avgLatency.toFixed(0)}ms
            {" · "}{totalExceptions > 0 ? <span className="text-red-500">{totalExceptions.toFixed(1)} exceptions/s</span> : "0 exceptions"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function TracesSection({ traces }: { traces: ReturnType<typeof useQuery<JaegerTrace[]>> }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          Distributed Traces
          <Badge variant="secondary" className="text-[10px]">Jaeger + OpenTelemetry</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {traces.isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!traces.isLoading && traces.data && traces.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium text-center w-14">Status</th>
                  <th className="pb-2 pr-3 font-medium">Service</th>
                  <th className="pb-2 pr-3 font-medium">Operation</th>
                  <th className="pb-2 pr-3 font-medium text-right">Duration</th>
                  <th className="pb-2 pr-3 font-medium text-right">Spans</th>
                  <th className="pb-2 pr-3 font-medium">Services Involved</th>
                  <th className="pb-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {traces.data.map((t: JaegerTrace) => (
                  <tr key={t.traceId} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-3">
                      <div className="flex justify-center">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${t.hasError ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" : "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"}`} />
                      </div>
                    </td>
                    <td className="py-2 pr-3 font-medium">{t.rootService}</td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground truncate max-w-[200px]">{t.rootOperation}</td>
                    <td className="py-2 pr-3 text-right font-mono">
                      <span className={t.durationMs > 1000 ? "text-amber-600 dark:text-amber-400" : t.durationMs > 5000 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
                        {t.durationMs > 1000 ? `${(t.durationMs / 1000).toFixed(2)}s` : `${t.durationMs.toFixed(1)}ms`}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <Badge variant="outline" className="text-[10px] font-mono">{t.spanCount}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {t.services.map((s) => (
                          <span key={s} className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 text-right text-muted-foreground whitespace-nowrap">
                      {new Date(t.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!traces.isLoading && (!traces.data || traces.data.length === 0) && !traces.isError && (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Activity className="h-8 w-8 opacity-30" />
            <p className="text-xs">No traces found. Make some requests to generate traces.</p>
          </div>
        )}
        {!traces.isLoading && traces.isError && (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Activity className="h-8 w-8 opacity-30" />
            <p className="text-xs">
              Jaeger not available. Start the observability stack:
            </p>
            <code className="rounded bg-muted px-2 py-1 text-[10px]">
              docker compose --profile obs up -d
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getUser();
    if (user?.role !== "Admin") {
      router.replace("/");
    }
  }, [router]);

  const orchestrator = useQuery({
    queryKey: ["admin-orchestrator-metrics"],
    queryFn: getOrchestratorMetrics,
    refetchInterval: 15000,
  });

  const reports = useQuery({
    queryKey: ["admin-report-metrics"],
    queryFn: getReportMetrics,
    refetchInterval: 15000,
  });

  const health = useQuery({
    queryKey: ["admin-service-health"],
    queryFn: checkServiceHealth,
    refetchInterval: 30000,
  });

  const prometheus = useQuery({
    queryKey: ["admin-prometheus-metrics"],
    queryFn: getPrometheusMetrics,
    refetchInterval: 15000,
  });

  const traces = useQuery({
    queryKey: ["admin-recent-traces"],
    queryFn: getRecentTraces,
    refetchInterval: 15000,
  });

  const om = orchestrator.data;
  const rm = reports.data;

  const successRate =
    om && om.totalAnalyses > 0
      ? ((om.completed / om.totalAnalyses) * 100).toFixed(1)
      : "0";

  const refreshAll = () => {
    orchestrator.refetch();
    reports.refetch();
    health.refetch();
    prometheus.refetch();
    traces.refetch();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.05] via-transparent to-purple-500/[0.05] pointer-events-none" />
        <CardContent className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">ADMIN</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Platform metrics and service health</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            className="gap-1.5"
            disabled={orchestrator.isFetching || reports.isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${orchestrator.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      <ServiceHealthSection health={health} />
      <SystemHealthSummary prometheus={prometheus} health={health} />

      {orchestrator.isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {!orchestrator.isLoading && om && (
        <>
          <MetricsCardsSection om={om} successRate={successRate} rm={rm} />
          <AdminAIInsights
            orchestratorMetrics={om}
            reportMetrics={rm}
            healthData={health.data}
            prometheusData={prometheus.data}
          />
          <PrometheusSection prometheus={prometheus} />
          <TracesSection traces={traces} />
          <AnalysesByStateSection om={om} rm={rm} />
          <RecentAnalysesSection om={om} />
        </>
      )}
      {!orchestrator.isLoading && !om && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Failed to load metrics. Make sure the backend services are running.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

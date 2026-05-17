"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { formatMarkdown } from "@/lib/markdown";
import { extractResponseContent } from "@/lib/sse";
import type { ServiceHealth, PrometheusMetric } from "@/lib/api";
import type { OrchestratorMetrics, ReportMetrics } from "@/types";

interface AdminAIInsightsProps {
  readonly orchestratorMetrics: OrchestratorMetrics;
  readonly reportMetrics: ReportMetrics | undefined;
  readonly healthData: ServiceHealth[] | undefined;
  readonly prometheusData: PrometheusMetric[] | undefined;
}

function formatInsightsMarkdown(text: string): string {
  return formatMarkdown(text);
}

function buildMetricsPrompt(
  om: OrchestratorMetrics,
  rm: ReportMetrics | undefined,
  healthData: ServiceHealth[] | undefined,
  prometheusData: PrometheusMetric[] | undefined,
): string {
  const healthLines = healthData
    ? healthData
        .map((s) => `- ${s.name}: ${s.healthy ? "Healthy" : "Unreachable"}`)
        .join("\n")
    : "- Health data unavailable";

  const successRate =
    om.totalAnalyses > 0
      ? ((om.completed / om.totalAnalyses) * 100).toFixed(1)
      : "0";

  const failedByState = Object.entries(om.analysesByState)
    .filter(([state]) => state === "Failed" || state === "Error" || state === "Processing")
    .map(([state, count]) => `${state}: ${count}`)
    .join(", ");

  const reportLines = rm
    ? `- Average score: ${rm.averageOverallScore.toFixed(1)}/10
- Provider usage: ${Object.entries(rm.providerUsage)
        .map(([provider, cnt]) => {
          const total = Object.values(rm.providerUsage).reduce((a, b) => a + b, 0) || 1;
          return `${provider} (${((Number(cnt) / total) * 100).toFixed(0)}%)`;
        })
        .join(", ")}
- Score breakdown: Scalability ${rm.averageScores.scalability.toFixed(1)}, Security ${rm.averageScores.security.toFixed(1)}, Reliability ${rm.averageScores.reliability.toFixed(1)}, Maintainability ${rm.averageScores.maintainability.toFixed(1)}`
    : "- No report data available";

  const infraLines = prometheusData
    ? prometheusData
        .map(
          (m) =>
            `- ${m.service}: ${m.requestRate.toFixed(2)} req/s, error rate ${m.errorRate.toFixed(1)}%, P95 latency ${
              m.latencyP95 > 1000
                ? `${(m.latencyP95 / 1000).toFixed(2)}s`
                : `${m.latencyP95.toFixed(0)}ms`
            }`,
        )
        .join("\n")
    : "- Prometheus data unavailable";

  return `You are ArchLens AI Operations Analyst. Analyze these system metrics and provide actionable insights:

## System Health
${healthLines}

## Analysis Metrics
- Total analyses: ${om.totalAnalyses}
- Success rate: ${successRate}%
- Average processing time: ${om.averageProcessingTimeMs > 0 ? (om.averageProcessingTimeMs / 1000).toFixed(1) : "N/A"}s
- Failed/In-progress: ${failedByState || "None"}

## Report Metrics
${reportLines}

## Infrastructure (Prometheus)
${infraLines}

Provide 3-5 concise observations about:
1. System health issues or concerns
2. Performance trends
3. Recommendations for improvement
Format as bullet points. Be specific and actionable. Use plain language.`;
}

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function AdminAIInsights({
  orchestratorMetrics,
  reportMetrics,
  healthData,
  prometheusData,
}: AdminAIInsightsProps) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateInsights = useCallback(async () => {
    setLoading(true);
    try {
      const prompt = buildMetricsPrompt(
        orchestratorMetrics,
        reportMetrics,
        healthData,
        prometheusData,
      );

      const { data } = await api.post("/api/ai/api/chat", {
        analysis_id: "admin-dashboard",
        question: prompt,
        history: [],
      });

      const content = extractResponseContent(data);

      setInsights(content);
      setLastUpdated(new Date());
    } catch {
      setInsights(
        "Unable to generate insights. Make sure the AI Processing service is running.",
      );
    } finally {
      setLoading(false);
    }
  }, [orchestratorMetrics, reportMetrics, healthData, prometheusData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(generateInsights, AUTO_REFRESH_INTERVAL);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, generateInsights]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            AI Operations Insights
            <Badge variant="secondary" className="text-[10px]">
              Powered by GPT-4o
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            <Button
              variant={autoRefresh ? "default" : "ghost"}
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
              className="gap-1 h-7 text-[10px] px-2"
            >
              <RefreshCw className={`h-2.5 w-2.5 ${autoRefresh ? "animate-spin" : ""}`} />
              Auto (5m)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={generateInsights}
              disabled={loading}
              className="gap-1.5 h-7 text-xs"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              {insights ? "Refresh Insights" : "Generate Insights"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !insights && (
          <div className="flex flex-col items-center gap-2 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
            <p className="text-xs text-muted-foreground">
              Analyzing dashboard metrics...
            </p>
          </div>
        )}

        {insights && (
          <div className="space-y-3">
            <div
              className={`rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed max-h-[300px] overflow-y-auto ${
                loading ? "opacity-50" : ""
              }`}
            >
              <div
                className="prose prose-sm dark:prose-invert max-w-none [&_strong]:font-semibold [&_br]:my-1"
                dangerouslySetInnerHTML={{ __html: formatInsightsMarkdown(insights) }}
              />
            </div>
            {lastUpdated && (
              <p className="text-[10px] text-muted-foreground text-right">
                Last updated:{" "}
                {lastUpdated.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            )}
          </div>
        )}

        {!loading && !insights && (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 opacity-30" />
            <p className="text-xs">
              Click &quot;Generate Insights&quot; to get AI-powered analysis of
              your system metrics.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

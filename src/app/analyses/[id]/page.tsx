"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import Link from "next/link";
import {
  Loader2,
  Component,
  AlertTriangle,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
  Clock,
  Cpu,
  Shield,
  TrendingUp,
  Server,
  CheckCircle2,
  Target,
  Wand2,
  ImageIcon,
} from "lucide-react";
import { getSagaStatus, getReportByAnalysis, getDiagramFileBlob } from "@/lib/api";
import { useSignalR } from "@/providers/signalr-provider";
import { StatusBadge } from "@/components/status-badge";
import { ScoreRadar } from "@/components/score-radar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReportResponse } from "@/types";

const severityColor: Record<string, string> = {
  critical: "bg-red-500/15 text-red-500 border-red-500/30",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-500 border-blue-500/30",
};

const severityIcon: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
};

const statusSteps = [
  { label: "Received", icon: Server },
  { label: "Processing", icon: Cpu },
  { label: "Analyzed", icon: TrendingUp },
  { label: "Completed", icon: CheckCircle2 },
];

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-green-400";
  if (confidence >= 0.6) return "text-yellow-400";
  return "text-orange-400";
}

function getStepStyle(isFailed: boolean, isActive: boolean): string {
  if (isFailed) return "bg-destructive text-white";
  if (isActive) return "bg-primary text-primary-foreground shadow-lg shadow-primary/25";
  return "bg-muted text-muted-foreground";
}

function friendlyName(fileName?: string, analysisId?: string): string {
  if (fileName) {
    return fileName
      .replace(/\.[^/.]+$/, "")
      .replaceAll(/[-_]/g, " ")
      .replaceAll(/\b\w/g, (c) => c.toUpperCase());
  }
  return `Analysis ${analysisId?.slice(0, 8) ?? ""}`;
}

function DiagramPreviewTab({ diagramUrl, fileType }: Readonly<{ diagramUrl: string | null; fileType?: string }>) {
  if (!diagramUrl) {
    return (
      <TabsContent value="original" className="mt-4">
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <ImageIcon className="h-8 w-8 opacity-40" />
          <p className="text-sm">Loading original diagram...</p>
        </div>
      </TabsContent>
    );
  }

  const isPdf = fileType?.toLowerCase() === "pdf" || fileType?.toLowerCase() === "application/pdf";

  return (
    <TabsContent value="original" className="mt-4">
      <div className="overflow-hidden rounded-lg border bg-muted/30">
        {isPdf ? (
          <iframe
            src={diagramUrl}
            className="h-[70vh] w-full"
            title="Original diagram"
          />
        ) : (
          <img
            src={diagramUrl}
            alt="Original diagram"
            className="mx-auto max-h-[70vh] w-auto object-contain p-4"
          />
        )}
      </div>
    </TabsContent>
  );
}

function StatusSteps({ currentState, currentStepIdx }: Readonly<{ currentState: string; currentStepIdx: number }>) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-center max-w-2xl mx-auto">
          {statusSteps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i <= currentStepIdx;
            const isCurrent = i === currentStepIdx;
            const isFailed = currentState === "Failed" && i === currentStepIdx + 1;

            return (
              <div key={step.label} className="flex items-center gap-0 flex-1">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                      getStepStyle(isFailed, isActive)
                    } ${isCurrent && currentState === "Processing" ? "animate-pulse" : ""}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
                {i < statusSteps.length - 1 && (
                  <div className={`mx-2 h-0.5 flex-1 rounded-full transition-all ${
                    i < currentStepIdx ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportScoreCards({ r }: Readonly<{ r: ReportResponse }>) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
        <CardContent className="flex flex-col items-center pt-5 pb-4">
          <span className="text-4xl font-bold text-primary">
            {r.overallScore.toFixed(1)}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">/ 10</span>
          <span className="text-xs font-medium text-muted-foreground mt-1">Overall Score</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center pt-5 pb-4">
          <Component className="h-6 w-6 text-cyan-400 mb-1" />
          <span className="text-2xl font-bold">{r.components.length}</span>
          <span className="text-xs text-muted-foreground mt-1">Components</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center pt-5 pb-4">
          <Shield className="h-6 w-6 text-orange-400 mb-1" />
          <span className="text-2xl font-bold">{r.risks.length}</span>
          <span className="text-xs text-muted-foreground mt-1">Risks</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center pt-5 pb-4">
          <Target className={`h-6 w-6 mb-1 ${confidenceColor(r.confidence)}`} />
          <span className={`text-2xl font-bold ${confidenceColor(r.confidence)}`}>
            {Math.round(r.confidence * 100)}%
          </span>
          <span className="text-xs text-muted-foreground mt-1">Confidence</span>
        </CardContent>
      </Card>
    </div>
  );
}

function ComponentsTab({ r }: Readonly<{ r: ReportResponse }>) {
  return (
    <TabsContent value="components" className="mt-4">
      <div className="grid gap-3 md:grid-cols-2">
        {r.components.map((c) => (
          <Card key={`${c.name}-${c.type}`} className="transition-all hover:border-primary/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{c.name}</CardTitle>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                  {c.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {c.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </TabsContent>
  );
}

function RisksTab({ r }: Readonly<{ r: ReportResponse }>) {
  return (
    <TabsContent value="risks" className="mt-4 space-y-3">
      {r.risks.map((risk) => (
        <Card key={`${risk.title}-${risk.severity}`} className="transition-all hover:border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span>{severityIcon[risk.severity] ?? "⚪"}</span>
                {risk.title}
              </CardTitle>
              <Badge
                variant="outline"
                className={severityColor[risk.severity] ?? ""}
              >
                {risk.severity}
              </Badge>
            </div>
            <Badge variant="secondary" className="w-fit text-[10px]">
              {risk.category}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {risk.description}
            </p>
            {risk.mitigation && (
              <div className="flex gap-2 rounded-lg bg-primary/5 border border-primary/10 p-2.5 text-xs">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="text-muted-foreground">{risk.mitigation}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </TabsContent>
  );
}

function RecommendationsTab({ r }: Readonly<{ r: ReportResponse }>) {
  return (
    <TabsContent value="recommendations" className="mt-4 space-y-2">
      {r.recommendations.map((rec) => (
        <div
          key={rec}
          className="flex items-start gap-3 rounded-lg border p-3 transition-all hover:border-primary/30 hover:bg-primary/[0.02]"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm leading-relaxed">{rec}</span>
        </div>
      ))}
    </TabsContent>
  );
}

function ScoresTab({ r }: Readonly<{ r: ReportResponse }>) {
  return (
    <TabsContent value="scores" className="mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Architecture Quality Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreRadar scores={r.scores} />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Scalability", value: r.scores.scalability, color: "text-cyan-400" },
              { label: "Security", value: r.scores.security, color: "text-purple-400" },
              { label: "Reliability", value: r.scores.reliability, color: "text-pink-400" },
              { label: "Maintainability", value: r.scores.maintainability, color: "text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center rounded-lg bg-muted/50 p-2.5">
                <span className={`text-lg font-bold ${s.color}`}>{s.value.toFixed(1)}</span>
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { onStatusChanged } = useSignalR();

  const saga = useQuery({
    queryKey: ["saga", id],
    queryFn: () => getSagaStatus(id),
    retry: 10,
    retryDelay: 2000,
    refetchInterval: (query) => {
      const state = query.state.data?.currentState;
      return state === "Completed" || state === "Failed" ? false : 3000;
    },
  });

  const report = useQuery({
    queryKey: ["report-by-analysis", saga.data?.analysisId],
    queryFn: () => getReportByAnalysis(saga.data?.analysisId ?? ""),
    enabled: !!saga.data?.analysisId && saga.data.currentState === "Completed",
  });

  const diagramBlob = useQuery({
    queryKey: ["diagram-blob", saga.data?.diagramId],
    queryFn: () => getDiagramFileBlob(saga.data?.diagramId ?? ""),
    enabled: !!saga.data?.diagramId,
    staleTime: Infinity,
  });

  useEffect(() => {
    const unsub = onStatusChanged((payload) => {
      if (payload.analysisId === saga.data?.analysisId) {
        saga.refetch();
        if (payload.newStatus === "Completed") {
          report.refetch();
        }
      }
    });
    return unsub;
  }, [onStatusChanged, saga.data?.analysisId, saga.refetch, report.refetch]);

  if (saga.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (saga.error || !saga.data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <AlertTriangle className="h-10 w-10" />
        <p>Analysis not found.</p>
        <Link href="/analyses">
          <Button variant="outline" size="sm">Back to Analyses</Button>
        </Link>
      </div>
    );
  }

  const s = saga.data;
  const r = report.data;
  const currentStepIdx = statusSteps.findIndex(
    (step) => step.label === s.currentState
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.05] via-transparent to-purple-500/[0.05] pointer-events-none" />
        <CardContent className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <Link href="/analyses">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {friendlyName(s.fileName, s.analysisId)}
                <StatusBadge status={s.currentState} />
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.fileName && (
                  <span className="mr-3">{s.fileName}</span>
                )}
                {s.processingTimeMs != null && s.processingTimeMs > 0 && (
                  <span className="inline-flex items-center gap-1 mr-3">
                    <Clock className="h-3 w-3" />
                    {(s.processingTimeMs / 1000).toFixed(1)}s
                  </span>
                )}
              </p>
            </div>
          </div>
          {r && r.components.length > 0 && (
            <div className="flex items-center gap-2">
              <Link href={`/analyses/${id}/diagram`}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Component className="h-4 w-4" />
                  View Diagram
                </Button>
              </Link>
              <Link href={`/analyses/${id}/fix?analysisId=${saga.data?.analysisId}&name=${encodeURIComponent(s.fileName ?? "")}`}>
                <Button size="sm" className="gap-1.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white">
                  <Wand2 className="h-4 w-4" />
                  Fix & Export
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <StatusSteps currentState={s.currentState} currentStepIdx={currentStepIdx} />

      {s.currentState === "Failed" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold text-destructive">Analysis Failed</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Something went wrong while analyzing your diagram. This can happen due to AI provider issues or unsupported diagram formats. Please try uploading again.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {s.currentState === "Processing" && (
        <Card className="border-primary/20">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-primary/10" />
            </div>
            <p className="text-sm text-muted-foreground">
              AI providers are analyzing your diagram...
            </p>
          </CardContent>
        </Card>
      )}

      {r && (
        <>
          <ReportScoreCards r={r} />

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground px-1">
            <Cpu className="h-3.5 w-3.5" />
            <span className="font-medium">Providers:</span>
            {r.providersUsed.map((p) => (
              <Badge key={p} variant="secondary" className="text-xs">
                {p}
              </Badge>
            ))}
            <span className="text-muted-foreground/60">|</span>
            <Clock className="h-3.5 w-3.5" />
            {(r.processingTimeMs / 1000).toFixed(1)}s
          </div>

          <Tabs defaultValue="components">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="components" className="gap-1.5">
                <Component className="h-3.5 w-3.5" />
                Components ({r.components.length})
              </TabsTrigger>
              <TabsTrigger value="risks" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Risks ({r.risks.length})
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" />
                Tips ({r.recommendations.length})
              </TabsTrigger>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="original" className="gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Original
              </TabsTrigger>
            </TabsList>

            <ComponentsTab r={r} />
            <RisksTab r={r} />
            <RecommendationsTab r={r} />
            <ScoresTab r={r} />
            <DiagramPreviewTab diagramUrl={diagramBlob.data ?? null} fileType={s.fileName?.split(".").pop()} />
          </Tabs>
        </>
      )}

    </div>
  );
}

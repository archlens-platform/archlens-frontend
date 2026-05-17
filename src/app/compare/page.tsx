"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { GitCompare, Loader2, ChevronDown } from "lucide-react";
import { listReports, getReport, listSagas } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { ScoreRadar } from "@/components/score-radar";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReportResponse, ReportSummary } from "@/types";

function friendlyName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replaceAll(/[-_]/g, " ")
    .replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

function reportLabel(r: ReportSummary, nameMap: Map<string, string>): string {
  const name = nameMap.get(r.diagramId);
  if (name) {
    return `${friendlyName(name)} — Score ${r.overallScore.toFixed(1)}`;
  }
  return `Score ${r.overallScore.toFixed(1)} — ${r.componentCount} components, ${r.riskCount} risks`;
}

export default function ComparePage() {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<[string | null, string | null]>([
    null,
    null,
  ]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  const reports = useQuery({
    queryKey: ["reports-list"],
    queryFn: () => listReports(1, 50),
  });

  const sagas = useQuery({
    queryKey: ["sagas-list"],
    queryFn: () => listSagas(1, 50),
  });

  const nameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (sagas.data?.items) {
      for (const s of sagas.data.items) {
        if (s.fileName && s.diagramId) {
          map.set(s.diagramId, s.fileName);
        }
      }
    }
    return map;
  }, [sagas.data]);

  const reportA = useQuery({
    queryKey: ["report", selectedIds[0]],
    queryFn: () => getReport(selectedIds[0] ?? ""),
    enabled: !!selectedIds[0],
  });

  const reportB = useQuery({
    queryKey: ["report", selectedIds[1]],
    queryFn: () => getReport(selectedIds[1] ?? ""),
    enabled: !!selectedIds[1],
  });

  const handleSelect = (idx: 0 | 1, reportId: string) => {
    setSelectedIds((prev) => {
      const next = [...prev] as [string | null, string | null];
      next[idx] = reportId;
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.05] via-transparent to-purple-500/[0.05] pointer-events-none" />
        <CardContent className="flex items-center gap-3 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <GitCompare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Compare Analyses</h1>
            <p className="text-xs text-muted-foreground">Select two reports to compare side by side</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(["A", "B"] as const).map((label, idx) => (
          <div key={label} className="space-y-2">
            <label className="text-sm font-medium">
              Analysis {label}
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border bg-background px-3 pr-10 py-2.5 text-sm font-medium transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={selectedIds[idx] ?? ""}
                onChange={(e) =>
                  handleSelect(idx as 0 | 1, e.target.value)
                }
              >
                <option value="">Select a report...</option>
                {(reports.data?.items ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {reportLabel(r, nameMap)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>

      {reportA.data && reportB.data && (
        <ComparisonView a={reportA.data} b={reportB.data} />
      )}

      {(reportA.isLoading || reportB.isLoading) && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

const riskBadgeColor: Record<string, string> = {
  critical: "border-red-500/50 text-red-500",
  high: "border-orange-500/50 text-orange-500",
  medium: "border-yellow-500/50 text-yellow-500",
  low: "border-blue-500/50 text-blue-500",
};

function ComparisonView({ a, b }: { a: ReportResponse; b: ReportResponse }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {([{ report: a, label: "A" }, { report: b, label: "B" }] as const).map(({ report: r, label }) => (
        <Card key={label} className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-sm font-semibold">
              Analysis {label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-bold text-primary">
                  {r.overallScore.toFixed(1)}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">/ 10</span>
              </div>
              <ConfidenceBadge value={r.confidence} />
            </div>

            <ScoreRadar scores={r.scores} />

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Scalability", value: r.scores.scalability, color: "text-cyan-500" },
                { label: "Security", value: r.scores.security, color: "text-purple-500" },
                { label: "Reliability", value: r.scores.reliability, color: "text-pink-500" },
                { label: "Maintainability", value: r.scores.maintainability, color: "text-emerald-500" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className={`font-bold ${s.color}`}>{s.value.toFixed(1)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Components</span>
                <span className="font-semibold">{r.components.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Risks</span>
                <span className="font-semibold">{r.risks.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Recommendations</span>
                <span className="font-semibold">{r.recommendations.length}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Providers</span>
                <span className="font-semibold">{r.providersUsed.join(", ")}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold">Top Risks</span>
              {r.risks.slice(0, 3).map((risk) => (
                <div key={`${risk.title}-${risk.severity}`} className="flex items-center gap-2 text-xs">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${riskBadgeColor[risk.severity] ?? "border-blue-500/50 text-blue-500"}`}
                  >
                    {risk.severity}
                  </Badge>
                  <span className="truncate">{risk.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

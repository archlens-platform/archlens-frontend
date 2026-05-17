"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, RotateCw, Cpu, Trash2, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge } from "./status-badge";
import { deleteAnalysis, getReportByAnalysis } from "@/lib/api";
import type { SagaStatus } from "@/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function friendlyName(saga: SagaStatus): string {
  if (saga.fileName) {
    return saga.fileName
      .replace(/\.[^/.]+$/, "")
      .replaceAll(/[-_]/g, " ")
      .replaceAll(/\b\w/g, (c) => c.toUpperCase());
  }
  return `Analysis ${saga.analysisId.slice(0, 8)}`;
}

interface ReportCardProps {
  saga: SagaStatus;
  onDeleted?: () => void;
}

function scoreColor(score: number): string {
  if (score >= 7) return "text-emerald-500";
  if (score >= 5) return "text-yellow-500";
  return "text-destructive";
}

export function ReportCard({ saga, onDeleted }: ReportCardProps) {
  const isComplete = saga.currentState === "Completed";
  const [dialogOpen, setDialogOpen] = useState(false);

  const report = useQuery({
    queryKey: ["report-card", saga.analysisId],
    queryFn: () => getReportByAnalysis(saga.analysisId),
    enabled: isComplete,
    staleTime: 60_000,
  });
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAnalysis(saga.diagramId, saga.analysisId);
      toast.success("Analysis deleted successfully");
      setDialogOpen(false);
      onDeleted?.();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to delete analysis";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Link href={`/analyses/${saga.diagramId}`}>
        <Card className="group relative overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-purple-500/[0.03] pointer-events-none transition-opacity group-hover:from-primary/[0.08] group-hover:to-purple-500/[0.06]" />
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary to-purple-500 opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="truncate text-sm font-semibold">
              {friendlyName(saga)}
            </CardTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={saga.currentState} />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.data && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className={`h-3.5 w-3.5 ${scoreColor(report.data.overallScore)}`} />
                  <span className={`text-lg font-bold ${scoreColor(report.data.overallScore)}`}>
                    {report.data.overallScore.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">/10</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {report.data.components.length} components, {report.data.risks.length} risks
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(saga.createdAt)}
              </span>
              {saga.processingTimeMs != null && saga.processingTimeMs > 0 && (
                <span className="flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  {(saga.processingTimeMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>

            {saga.errorMessage && (
              <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
                <span className="truncate">{saga.errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {saga.retryCount > 0 && (
                  <span className="flex items-center gap-1">
                    <RotateCw className="h-3 w-3" />
                    {saga.retryCount} retries
                  </span>
                )}
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium text-primary transition-all ${isComplete ? "opacity-0 translate-x-0 group-hover:opacity-100 group-hover:translate-x-1" : "opacity-0"}`}>
                View Report
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">Delete Analysis</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete <strong>{friendlyName(saga)}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

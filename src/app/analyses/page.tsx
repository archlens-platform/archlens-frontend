"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listSagas } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { ReportCard } from "@/components/report-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSignalR } from "@/providers/signalr-provider";

export default function AnalysesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sagas", page],
    queryFn: () => listSagas(page, 12),
  });

  const { onStatusChanged } = useSignalR();

  useEffect(() => {
    const unsub = onStatusChanged((payload) => {
      refetch();
      if (payload.newStatus === "Completed") {
        toast.success("Analysis completed! Report is ready.");
      } else if (payload.newStatus === "Failed") {
        toast.error("Analysis failed. Please try again.");
      }
    });
    return unsub;
  }, [onStatusChanged, refetch]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.05] via-transparent to-purple-500/[0.05] pointer-events-none" />
        <CardContent className="flex items-center gap-3 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analyses</h1>
            {data && (
              <p className="text-xs text-muted-foreground">
                {data.totalCount} diagram{data.totalCount !== 1 ? "s" : ""} analyzed
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
          <LayoutDashboard className="h-12 w-12" />
          <p>No analyses yet. Upload a diagram to get started.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((saga) => (
              <ReportCard key={saga.correlationId} saga={saga} onDeleted={() => refetch()} />
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import type { AnalysisStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  Received: { label: "Received", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  Processing: { label: "Processing", className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 animate-pulse" },
  Analyzed: { label: "Analyzed", className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
  Completed: { label: "Completed", className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30" },
  Error: { label: "Error", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  Failed: { label: "Failed", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
};

export function StatusBadge({ status }: { status: AnalysisStatus | string }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

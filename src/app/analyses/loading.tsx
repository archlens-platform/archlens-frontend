import { Skeleton } from "@/components/ui/skeleton";

export default function AnalysesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {["s1","s2","s3","s4","s5","s6"].map((id) => (
          <Skeleton key={id} className="h-52 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

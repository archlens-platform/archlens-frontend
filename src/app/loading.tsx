import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {["s1","s2","s3","s4","s5","s6"].map((id) => (
          <Skeleton key={id} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

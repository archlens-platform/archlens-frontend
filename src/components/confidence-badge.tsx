import { cn } from "@/lib/utils";

function getColor(value: number): string {
  if (value >= 0.8) return "text-green-600 dark:text-green-400";
  if (value >= 0.6) return "text-yellow-600 dark:text-yellow-400";
  if (value >= 0.4) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold",
        getColor(value)
      )}
    >
      <svg className="h-3 w-3" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <circle
          cx="8"
          cy="8"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${value * 44} 44`}
          strokeLinecap="round"
          transform="rotate(-90 8 8)"
        />
      </svg>
      {pct}%
    </span>
  );
}

import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusStyles } from "@/components/StatusBadge";
import type { JobStatus } from "@/types/jobTracker";

const allStatuses: JobStatus[] = ["saved", "applied", "screening", "interviewing", "offer", "rejected", "withdrawn", "closed"];

interface StatusSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export default function StatusSelect({ value, onValueChange, className }: StatusSelectProps) {
  const config = statusStyles[value as JobStatus];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "rounded-full border font-semibold uppercase tracking-wider text-[11px] h-7 w-auto min-w-[100px] px-2.5 gap-1 [&>svg]:h-3 [&>svg]:w-3",
          config?.className ?? "",
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allStatuses.map((s) => {
          const sc = statusStyles[s];
          return (
            <SelectItem key={s} value={s}>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                  sc.className
                )}
              >
                {sc.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

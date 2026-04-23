import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusStyles, statusToneMap, statusLabels } from "@/components/StatusBadge";
import { pillDotClass, pillTriggerClass } from "@/lib/pillStyles";
import type { JobStatus } from "@/types/jobTracker";

const allStatuses: JobStatus[] = ["saved", "applied", "screening", "interviewing", "offer", "rejected", "withdrawn", "closed"];

interface StatusSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export default function StatusSelect({ value, onValueChange, className }: StatusSelectProps) {
  const tone = statusToneMap[value as JobStatus];
  const config = statusStyles[value as JobStatus];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          // Pill-trigger recipe — same tone wash as the resting pill so the
          // trigger reads as the pill itself, not a separate control wrapper.
          tone ? pillTriggerClass(tone) : "rounded-full border h-7 min-w-[100px] px-2.5 text-[11px] uppercase tracking-wider",
          config?.label?.toLowerCase() === "closed" && "line-through",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allStatuses.map((s) => (
          <SelectItem key={s} value={s} className="text-[11px] font-semibold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5">
              <span className={pillDotClass(statusToneMap[s])} aria-hidden />
              {statusLabels[s]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

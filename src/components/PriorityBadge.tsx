import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { pillClass, pillDotClass, type PillTone } from "@/lib/pillStyles";

// Priority on the unified pill family. Spec: amber for warm/high,
// navy-muted for medium, slate for low/cold. No green/yellow/red.
const priorityConfig: Record<string, { label: string; tone: PillTone }> = {
  low:    { label: "Low",    tone: "slate" },
  medium: { label: "Medium", tone: "navy-muted" },
  high:   { label: "High",   tone: "amber-strong" },
};

interface PriorityBadgeProps {
  priority?: string;
  onChange: (priority: string) => void;
  mode?: "badge" | "select";
}

export default function PriorityBadge({ priority, onChange, mode = "select" }: PriorityBadgeProps) {
  if (mode === "badge" && priority && priorityConfig[priority]) {
    const { label, tone } = priorityConfig[priority];
    return <span className={pillClass(tone, "xs")}>{label}</span>;
  }

  const config = priority ? priorityConfig[priority] : null;

  return (
    <Select value={priority || ""} onValueChange={(v) => onChange(v)}>
      <SelectTrigger
        className="h-7 w-auto min-w-[90px] border-dashed border-border/60 bg-transparent px-2 shadow-none [&>svg]:h-3 [&>svg]:w-3 rounded-full"
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue>
          {config ? (
            <span className={pillClass(config.tone, "sm")}>{config.label}</span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Priority</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(priorityConfig) as Array<keyof typeof priorityConfig>).map((key) => {
          const { label, tone } = priorityConfig[key];
          return (
            <SelectItem key={key} value={key}>
              <span className="inline-flex items-center gap-2">
                <span className={cn(pillDotClass(tone))} aria-hidden />
                {label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const priorityConfig: Record<string, { label: string; emoji: string; className: string }> = {
  low: { label: "Low", emoji: "🟢", className: "bg-green-500/15 text-green-700 border-green-500/30" },
  medium: { label: "Medium", emoji: "🟡", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  high: { label: "High", emoji: "🟠", className: "bg-orange-500/15 text-orange-700 border-orange-500/30" },
};

interface PriorityBadgeProps {
  priority?: string;
  onChange: (priority: string) => void;
  mode?: "badge" | "select";
}

export default function PriorityBadge({ priority, onChange, mode = "select" }: PriorityBadgeProps) {
  if (mode === "badge" && priority && priorityConfig[priority]) {
    return (
      <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", priorityConfig[priority].className)}>
        {priorityConfig[priority].label}
      </Badge>
    );
  }

  const config = priority ? priorityConfig[priority] : null;

  return (
    <Select value={priority || ""} onValueChange={v => onChange(v)}>
      <SelectTrigger
        className="h-7 w-auto min-w-[90px] border-dashed border-border/60 bg-transparent px-2 shadow-none [&>svg]:h-3 [&>svg]:w-3 rounded-full"
        onClick={e => e.stopPropagation()}
      >
        <SelectValue>
          {config ? (
            <Badge variant="outline" className={cn("text-xs", config.className)}>
              {config.emoji} {config.label}
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground">⚡ Priority</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">🟢 Low</SelectItem>
        <SelectItem value="medium">🟡 Medium</SelectItem>
        <SelectItem value="high">🟠 High</SelectItem>
      </SelectContent>
    </Select>
  );
}

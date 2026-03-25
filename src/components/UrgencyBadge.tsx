import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const urgencyConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-green-500/15 text-green-700 border-green-500/30" },
  medium: { label: "Medium", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  high: { label: "High", className: "bg-orange-500/15 text-orange-700 border-orange-500/30" },
  critical: { label: "Critical", className: "bg-red-500/15 text-red-700 border-red-500/30" },
};

interface UrgencyBadgeProps {
  urgency?: string;
  onChange: (urgency: string) => void;
  mode?: "badge" | "select";
}

export default function UrgencyBadge({ urgency, onChange, mode = "select" }: UrgencyBadgeProps) {
  if (mode === "badge" && urgency && urgencyConfig[urgency]) {
    return (
      <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", urgencyConfig[urgency].className)}>
        {urgencyConfig[urgency].label}
      </Badge>
    );
  }

  return (
    <Select value={urgency || ""} onValueChange={v => onChange(v)}>
      <SelectTrigger className="h-7 w-24 text-xs" onClick={e => e.stopPropagation()}>
        <SelectValue placeholder="Urgency" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">🟢 Low</SelectItem>
        <SelectItem value="medium">🟡 Medium</SelectItem>
        <SelectItem value="high">🟠 High</SelectItem>
        <SelectItem value="critical">🔴 Critical</SelectItem>
      </SelectContent>
    </Select>
  );
}

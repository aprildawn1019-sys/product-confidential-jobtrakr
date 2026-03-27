import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const warmthConfig: Record<string, { label: string; className: string }> = {
  cold: { label: "Cold", className: "bg-info/20 text-info border-info/30" },
  warm: { label: "Warm", className: "bg-warning/20 text-warning border-warning/30" },
  hot: { label: "Hot", className: "bg-destructive/20 text-destructive border-destructive/30" },
  champion: { label: "Champion", className: "bg-success/20 text-success border-success/30" },
};

interface WarmthBadgeProps {
  warmth?: string;
  onChange: (warmth: string) => void;
}

export default function WarmthBadge({ warmth, onChange }: WarmthBadgeProps) {
  const config = warmth ? warmthConfig[warmth] : null;

  return (
    <Select value={warmth || ""} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-auto min-w-[90px] border-dashed border-border/60 bg-transparent px-2 shadow-none [&>svg]:h-3 [&>svg]:w-3 rounded-full">
        <SelectValue>
          {config ? (
            <Badge variant="outline" className={`text-xs ${config.className}`}>{config.label}</Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground">🌡️ Warmth</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">Relationship Warmth</p>
        <SelectItem value="cold">❄️ Cold — No recent contact</SelectItem>
        <SelectItem value="warm">🌤️ Warm — Occasional contact</SelectItem>
        <SelectItem value="hot">🔥 Hot — Active relationship</SelectItem>
        <SelectItem value="champion">🏆 Champion — Strong advocate</SelectItem>
      </SelectContent>
    </Select>
  );
}

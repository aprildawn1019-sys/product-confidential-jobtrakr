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
      <SelectTrigger className="h-7 w-auto min-w-[90px] border-none bg-transparent p-0 shadow-none [&>svg]:h-3 [&>svg]:w-3">
        <SelectValue>
          {config ? (
            <Badge variant="outline" className={`text-xs ${config.className}`}>{config.label}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Set warmth</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cold">❄️ Cold</SelectItem>
        <SelectItem value="warm">🌤️ Warm</SelectItem>
        <SelectItem value="hot">🔥 Hot</SelectItem>
        <SelectItem value="champion">🏆 Champion</SelectItem>
      </SelectContent>
    </Select>
  );
}

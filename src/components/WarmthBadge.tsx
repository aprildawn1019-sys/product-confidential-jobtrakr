import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { pillClass, pillDotClass, type PillTone } from "@/lib/pillStyles";

// Warmth on the unified pill family. Hot/Champion = amber (warm), Warm =
// amber-soft (warm intent), Cold = slate. No blue/green/red.
const warmthConfig: Record<string, { label: string; description: string; tone: PillTone }> = {
  cold:     { label: "Cold",     description: "No recent contact",   tone: "slate" },
  warm:     { label: "Warm",     description: "Occasional contact",  tone: "amber-soft" },
  hot:      { label: "Hot",      description: "Active relationship", tone: "amber-strong" },
  champion: { label: "Champion", description: "Strong advocate",     tone: "amber-strong" },
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
            <span className={pillClass(config.tone, "sm")}>{config.label}</span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Warmth</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">Relationship Warmth</p>
        {(Object.keys(warmthConfig) as Array<keyof typeof warmthConfig>).map((key) => {
          const { label, description, tone } = warmthConfig[key];
          return (
            <SelectItem key={key} value={key}>
              <span className="inline-flex items-center gap-2">
                <span className={cn(pillDotClass(tone))} aria-hidden />
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground text-[11px]">— {description}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

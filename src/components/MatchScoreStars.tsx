import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface MatchScoreStarsProps {
  score?: number;
  onChange?: (score: number) => void;
  size?: "sm" | "md";
}

const labels: Record<number, string> = {
  0: "No match rating",
  1: "Poor match",
  2: "Below average match",
  3: "Average match",
  4: "Good match",
  5: "Excellent match",
};

export default function MatchScoreStars({ score, onChange, size = "md" }: MatchScoreStarsProps) {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const current = score || 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <button
              key={i}
              type="button"
              onClick={e => { e.stopPropagation(); onChange?.(score === i ? 0 : i); }}
              className="p-0 border-0 bg-transparent cursor-pointer hover:scale-110 transition-transform"
            >
              <Star
                className={cn(
                  iconSize,
                  i <= current
                    ? "fill-accent text-accent"
                    : "text-muted-foreground/40"
                )}
              />
            </button>
          ))}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Match: {labels[current]}
      </TooltipContent>
    </Tooltip>
  );
}

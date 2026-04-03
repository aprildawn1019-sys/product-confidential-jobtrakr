import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface FitScoreStarsProps {
  score?: number;
  onChange?: (score: number) => void;
  size?: "sm" | "md";
}

const labels: Record<number, string> = {
  0: "No fit rating",
  1: "Poor fit",
  2: "Below average fit",
  3: "Average fit",
  4: "Good fit",
  5: "Excellent fit",
};

export default function FitScoreStars({ score, onChange, size = "md" }: FitScoreStarsProps) {
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
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground/40"
                )}
              />
            </button>
          ))}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Fit Score: {labels[current]}
      </TooltipContent>
    </Tooltip>
  );
}

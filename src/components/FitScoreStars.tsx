import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface FitScoreStarsProps {
  score?: number;
  onChange: (score: number) => void;
  size?: "sm" | "md";
}

export default function FitScoreStars({ score, onChange, size = "md" }: FitScoreStarsProps) {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={e => { e.stopPropagation(); onChange(score === i ? 0 : i); }}
          className="p-0 border-0 bg-transparent cursor-pointer hover:scale-110 transition-transform"
        >
          <Star
            className={cn(
              iconSize,
              i <= (score || 0)
                ? "fill-yellow-500 text-yellow-500"
                : "text-muted-foreground/40"
            )}
          />
        </button>
      ))}
    </div>
  );
}

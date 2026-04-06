import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TargetCompany } from "@/types/jobTracker";

interface TargetCompanyBadgeProps {
  target?: TargetCompany;
  size?: "sm" | "md";
}

const priorityEmoji: Record<string, string> = {
  dream: "🌟",
  strong: "💪",
  interested: "👀",
};

export default function TargetCompanyBadge({ target, size = "sm" }: TargetCompanyBadgeProps) {
  if (!target || target.status === "archived") return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`gap-1 border-amber-300 bg-amber-50 text-amber-700 ${size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"}`}
        >
          <Star className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
          Target
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{priorityEmoji[target.priority] || ""} {target.priority.charAt(0).toUpperCase() + target.priority.slice(1)} target company</p>
      </TooltipContent>
    </Tooltip>
  );
}

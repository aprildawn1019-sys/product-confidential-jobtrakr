import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, MoreHorizontal, Sparkles, Lightbulb, Bell, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DerivedAction } from "@/lib/actionEngine";
import type { SnoozeDuration } from "@/hooks/useActionSnoozes";

interface ActionCardProps {
  action: DerivedAction;
  onSnooze: (signature: string, duration: SnoozeDuration) => void;
  compact?: boolean;
}

const urgencyStyles: Record<DerivedAction["urgency"], string> = {
  overdue: "border-destructive/40 bg-destructive/5",
  today: "border-warning/40 bg-warning/5",
  soon: "border-info/30 bg-info/5",
  later: "border-border",
};

const urgencyBadge: Record<DerivedAction["urgency"], { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "text-destructive border-destructive/30" },
  today: { label: "Today", className: "text-warning border-warning/30" },
  soon: { label: "Soon", className: "text-info border-info/30" },
  later: { label: "Later", className: "text-muted-foreground" },
};

const sourceIcon: Record<DerivedAction["source"], { icon: typeof Bell; label: string; className: string }> = {
  signal: { icon: Bell, label: "Signal", className: "text-muted-foreground" },
  nudge: { icon: Lightbulb, label: "Nudge", className: "text-info" },
  ai: { icon: Sparkles, label: "AI suggestion", className: "text-primary" },
};

export default function ActionCard({ action, onSnooze, compact }: ActionCardProps) {
  const navigate = useNavigate();
  const SourceIcon = sourceIcon[action.source].icon;
  const badge = urgencyBadge[action.urgency];

  const handleOpen = () => {
    if (action.href) navigate(action.href);
  };

  return (
    <div
      className={cn(
        "group rounded-lg border p-3 transition-colors hover:bg-muted/40",
        urgencyStyles[action.urgency],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={handleOpen}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2 mb-1">
            <SourceIcon className={cn("h-3.5 w-3.5 shrink-0", sourceIcon[action.source].className)} aria-label={sourceIcon[action.source].label} />
            <p className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>{action.title}</p>
          </div>
          {action.subtitle && (
            <p className={cn("text-muted-foreground truncate", compact ? "text-[11px]" : "text-xs")}>
              {action.subtitle}
            </p>
          )}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className={cn("text-[10px] h-5", badge.className)}>
            {badge.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Action options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSnooze(action.signature, "1d")}>
                <Clock className="h-3.5 w-3.5 mr-2" /> Snooze 1 day
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(action.signature, "3d")}>
                <Clock className="h-3.5 w-3.5 mr-2" /> Snooze 3 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(action.signature, "1w")}>
                <Clock className="h-3.5 w-3.5 mr-2" /> Snooze 1 week
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground capitalize">{action.lane}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1 text-primary hover:text-primary"
          onClick={handleOpen}
        >
          {action.actionLabel} <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

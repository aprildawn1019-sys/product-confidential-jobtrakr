import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CompanyAvatar from "@/components/CompanyAvatar";
import { cn } from "@/lib/utils";
import type { DerivedAction } from "@/lib/actionEngine";
import type { SnoozeDuration } from "@/hooks/useActionSnoozes";

interface NextStepRowProps {
  action: DerivedAction;
  isCompleted?: boolean;
  onComplete: (signature: string) => void;
  onSnooze: (signature: string, duration: SnoozeDuration) => void;
}

const urgencyBadge: Record<DerivedAction["urgency"], { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive border-destructive/20" },
  today: { label: "Today", className: "bg-warning/10 text-warning border-warning/30" },
  soon: { label: "Soon", className: "bg-info/10 text-info border-info/30" },
  later: { label: "Later", className: "bg-muted text-muted-foreground border-transparent" },
};

/**
 * Pick a deterministic avatar seed: prefer the contact name, fall back to the
 * target company, then to the action title. Keeps avatars stable across renders.
 */
function avatarSeed(action: DerivedAction): string {
  return (
    action.outreachContext?.contactName ||
    action.outreachContext?.targetCompany ||
    action.title
  );
}

export default function NextStepRow({
  action,
  isCompleted = false,
  onComplete,
  onSnooze,
}: NextStepRowProps) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const badge = urgencyBadge[action.urgency];
  const checked = isCompleted || pending;

  const handleOpen = () => {
    if (action.href) navigate(action.href);
  };

  const handleToggle = (next: boolean | "indeterminate") => {
    if (next === true && !checked) {
      setPending(true);
      onComplete(action.signature);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40",
        checked && "opacity-60",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={handleToggle}
        aria-label={`Mark "${action.title}" complete`}
        className="h-5 w-5 shrink-0"
      />
      <CompanyAvatar company={avatarSeed(action)} size="sm" />
      <button
        type="button"
        onClick={handleOpen}
        className="min-w-0 flex-1 text-left"
      >
        <p className={cn("text-sm font-medium truncate", checked && "line-through")}>
          {action.title}
        </p>
        {action.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{action.subtitle}</p>
        )}
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <Badge
          variant="outline"
          className={cn("text-[10px] h-5 px-1.5 font-medium", badge.className)}
        >
          {badge.label}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleOpen}
          aria-label={action.actionLabel}
          disabled={!action.href}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="More options"
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
  );
}

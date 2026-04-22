import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Clock,
  MoreHorizontal,
  Users,
  Handshake,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { differenceInCalendarDays, isPast, isToday } from "date-fns";
import { parseLocalDate } from "@/lib/localDate";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { DerivedAction, ActionLane } from "@/lib/actionEngine";
import type { SnoozeDuration } from "@/hooks/useActionSnoozes";

interface NextStepRowProps {
  action: DerivedAction;
  isCompleted?: boolean;
  onComplete: (signature: string) => void;
  onSnooze: (signature: string, duration: SnoozeDuration) => void;
  /** When false (Today / Later cohorts), suppress the right-side urgency chip
   *  because the cohort header already conveys the same temporal signal. */
  showUrgencyChip?: boolean;
}

/**
 * Lane glyph tile — replaces the meaningless initial-chip avatar.
 *
 * Why: post-logo-fetch-disable, the leading column showed "T" / "F" letters
 * carrying zero signal. A glyph keyed to the action's lane lets the eye
 * scan the leftmost column and immediately see "all networking work" or
 * "all referral asks" without reading titles. AI-suggested actions get a
 * Sparkles override so machine output is visually distinguishable from
 * deterministic engine output.
 */
function LaneGlyphTile({ action }: { action: DerivedAction }) {
  const isAi = action.source === "ai";
  const Icon = isAi
    ? Sparkles
    : action.lane === "networking"
      ? Users
      : action.lane === "referrals"
        ? Handshake
        : Briefcase;

  // Tone-by-lane: keep palette restrained — slate for networking, amber for
  // referrals (highest leverage), navy for applications. AI inherits the
  // amber accent to keep it tied to the brand's "intelligence" surface.
  const tone =
    isAi || action.lane === "referrals"
      ? "bg-accent/15 text-accent-foreground"
      : action.lane === "applications"
        ? "bg-primary/10 text-primary"
        : "bg-muted text-muted-foreground";

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
        tone,
      )}
      aria-hidden="true"
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </div>
  );
}

/**
 * Compact "when is this due" chip. Only rendered inside the Overdue cohort
 * (Today / Later cohorts already imply the answer via their headers).
 */
function UrgencyChip({ dueDate }: { dueDate?: string }) {
  if (!dueDate) return null;
  const parsed = parseLocalDate(dueDate);
  if (!parsed) return null;

  if (isPast(parsed) && !isToday(parsed)) {
    const days = Math.max(1, differenceInCalendarDays(new Date(), parsed));
    return (
      <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive whitespace-nowrap">
        Overdue {days}d
      </span>
    );
  }
  return null;
}

/**
 * Spec source: src/assets/brand/spec/dashboard-mockup.jpg + spec-command-center-v2.jpg.
 * Row composition: lane glyph · title/subtitle · actionLabel tail · checkbox.
 */
export default function NextStepRow({
  action,
  isCompleted = false,
  onComplete,
  onSnooze,
  showUrgencyChip = false,
}: NextStepRowProps) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const checked = isCompleted || pending;

  const handleOpen = () => {
    if (action.href) navigate(action.href);
  };

  const handleRowKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen();
    }
  };

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (checked) return;
    setPending(true);
    onComplete(action.signature);
  };

  return (
    <div
      role={action.href ? "button" : undefined}
      tabIndex={action.href ? 0 : -1}
      onClick={action.href ? handleOpen : undefined}
      onKeyDown={action.href ? handleRowKey : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors",
        action.href && "cursor-pointer hover:bg-muted/40 focus:outline-none focus:bg-muted/40",
        checked && "opacity-60",
      )}
    >
      <LaneGlyphTile action={action} />

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium truncate", checked && "line-through")}>
          {action.title}
        </p>
        {action.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{action.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Tail meta: what *would I actually do?* — surfaces actionLabel
            ("Send a nudge", "Prep & open") so users know the move before
            opening the deep link. Hidden when completed to keep the row quiet. */}
        {!checked && action.actionLabel && (
          <span className="hidden sm:inline text-[11px] text-muted-foreground">
            {action.actionLabel}
          </span>
        )}

        {!checked && showUrgencyChip && <UrgencyChip dueDate={action.dueDate} />}

        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={checked ? `"${action.title}" completed` : `Mark "${action.title}" done`}
          disabled={checked}
          onClick={handleToggle}
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            checked
              ? "border-accent bg-accent text-accent-foreground cursor-default"
              : "border-muted-foreground/40 group-hover:border-accent",
          )}
        >
          {checked && <Check className="h-3 w-3" strokeWidth={3} />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="More options"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
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

export type { ActionLane };

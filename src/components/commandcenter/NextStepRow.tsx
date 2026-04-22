import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Clock, MoreHorizontal } from "lucide-react";
import { differenceInDays, isPast, isToday, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CompanyAvatar from "@/components/CompanyAvatar";
import { cn } from "@/lib/utils";
import type { DerivedAction, ActionUrgency } from "@/lib/actionEngine";
import type { SnoozeDuration } from "@/hooks/useActionSnoozes";

interface NextStepRowProps {
  action: DerivedAction;
  isCompleted?: boolean;
  onComplete: (signature: string) => void;
  onSnooze: (signature: string, duration: SnoozeDuration) => void;
}

/**
 * Compact "when is this due" chip rendered on the right of every Next Steps row.
 *
 * Why this exists: rows previously showed times with no date and no signal of
 * what was past-due vs. upcoming. The chip answers three questions at a glance:
 *  • Is this overdue? (red) — with how many days
 *  • Is this today? (amber)
 *  • Otherwise: when is it due? (muted, e.g. "Fri Apr 25")
 *
 * For nudges with no concrete due date we render a faint urgency word so the
 * column stays aligned and the user knows nothing is technically late.
 */
function UrgencyChip({ urgency, dueDate }: { urgency: ActionUrgency; dueDate?: string }) {
  if (!dueDate) {
    if (urgency === "later") return null;
    return (
      <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {urgency}
      </span>
    );
  }

  let parsed: Date;
  try {
    parsed = dueDate.length <= 10 ? parseISO(dueDate) : new Date(dueDate);
  } catch {
    return null;
  }
  if (isNaN(parsed.getTime())) return null;

  let label: string;
  let toneClass: string;

  if (isPast(parsed) && !isToday(parsed)) {
    const days = Math.max(1, differenceInDays(new Date(), parsed));
    label = `Overdue ${days}d`;
    toneClass = "bg-destructive/10 text-destructive";
  } else if (isToday(parsed)) {
    label = "Today";
    toneClass = "bg-accent/15 text-accent-foreground";
  } else {
    const days = differenceInDays(parsed, new Date());
    const dateLabel = parsed.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    label = days <= 3 ? `${dateLabel} · in ${days}d` : dateLabel;
    toneClass = "bg-muted text-muted-foreground";
  }

  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
        toneClass,
      )}
    >
      {label}
    </span>
  );
}

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

/**
 * Spec source: src/assets/dashboard-mockup.jpg + spec-command-center-v2.jpg.
 * Row composition: avatar · title/subtitle · amber stadium toggle.
 * No tinted urgency backgrounds, no left accent bars, no inline arrow.
 * The whole row is clickable to navigate; the toggle is the completion control.
 */
export default function NextStepRow({
  action,
  isCompleted = false,
  onComplete,
  onSnooze,
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
        "group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors",
        action.href && "cursor-pointer hover:bg-muted/40 focus:outline-none focus:bg-muted/40",
        checked && "opacity-60",
      )}
    >
      <CompanyAvatar company={avatarSeed(action)} size="md" tone="neutral" />

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium truncate", checked && "line-through")}>
          {action.title}
        </p>
        {action.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{action.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Due-date / urgency chip — answers "when?" and "is this overdue?"
            without making the user open the item. Hidden when no signal. */}
        {!checked && <UrgencyChip urgency={action.urgency} dueDate={action.dueDate} />}

        {/* Completion control — reads as "mark done", not a settings toggle.
            Empty circle with a "Done" label that becomes a filled amber
            check once clicked. Mirrors Linear/Things/Todoist task patterns. */}
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={checked ? `"${action.title}" completed` : `Mark "${action.title}" done`}
          disabled={checked}
          onClick={handleToggle}
          className={cn(
            "inline-flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 text-xs font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            checked
              ? "text-muted-foreground cursor-default"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <span
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
              checked
                ? "border-accent bg-accent text-accent-foreground"
                : "border-muted-foreground/40 group-hover:border-accent",
            )}
          >
            {checked && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
          <span className={cn(checked && "sr-only")}>Done</span>
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

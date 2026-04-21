import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
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

      <div className="flex items-center gap-1 shrink-0">
        {/* Hero spec: clean amber stadium outline. Empty when pending,
            filled amber when complete. No knob — that's the whole visual. */}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={`Mark "${action.title}" complete`}
          disabled={checked}
          onClick={handleToggle}
          className={cn(
            "inline-flex h-7 w-14 items-center justify-center rounded-full border-2 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            checked
              ? "border-accent bg-accent"
              : "border-accent bg-transparent hover:bg-accent/10",
          )}
        >
          {checked && (
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 text-accent-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 8.5 6.5 12 13 4.5" />
            </svg>
          )}
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

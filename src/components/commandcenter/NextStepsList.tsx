import { CheckCircle2 } from "lucide-react";
import NextStepRow from "./NextStepRow";
import type { DerivedAction } from "@/lib/actionEngine";
import type { SnoozeDuration } from "@/hooks/useActionSnoozes";

interface NextStepsListProps {
  actions: DerivedAction[];
  completed: Set<string>;
  onComplete: (signature: string) => void;
  onSnooze: (signature: string, duration: SnoozeDuration) => void;
  /** How many rows to show before "View all" — defaults to 6. */
  visibleCount?: number;
  onViewAll?: () => void;
}

export default function NextStepsList({
  actions,
  completed,
  onComplete,
  onSnooze,
  visibleCount = 6,
  onViewAll,
}: NextStepsListProps) {
  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 mb-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
        <p className="text-sm font-medium">Inbox zero</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          No overdue or upcoming actions. Nice work.
        </p>
      </div>
    );
  }

  const visible = actions.slice(0, visibleCount);
  const hidden = actions.length - visible.length;

  return (
    <div className="space-y-0.5">
      {visible.map((a) => (
        <NextStepRow
          key={a.signature}
          action={a}
          isCompleted={completed.has(a.signature)}
          onComplete={onComplete}
          onSnooze={onSnooze}
        />
      ))}
      {hidden > 0 && onViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className="mt-2 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
        >
          View all {actions.length} next steps →
        </button>
      )}
    </div>
  );
}

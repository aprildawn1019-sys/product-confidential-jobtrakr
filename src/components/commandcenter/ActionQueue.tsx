import { CheckCircle2 } from "lucide-react";
import ActionCard from "./ActionCard";
import type { DerivedAction } from "@/lib/actionEngine";
import type { SnoozeDuration } from "@/hooks/useActionSnoozes";

interface ActionQueueProps {
  actions: DerivedAction[];
  onSnooze: (signature: string, duration: SnoozeDuration) => void;
}

export default function ActionQueue({ actions, onSnooze }: ActionQueueProps) {
  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 mb-3">
          <CheckCircle2 className="h-6 w-6 text-success" />
        </div>
        <p className="text-sm font-medium">Inbox zero</p>
        <p className="text-xs text-muted-foreground mt-1">
          No overdue or upcoming actions. Nice work.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((a) => (
        <ActionCard key={a.signature} action={a} onSnooze={onSnooze} />
      ))}
    </div>
  );
}

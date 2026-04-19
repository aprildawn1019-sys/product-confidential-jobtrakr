import { Users, Handshake, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ActionCard from "./ActionCard";
import { groupByLane, type ActionLane, type DerivedAction } from "@/lib/actionEngine";
import type { SnoozeDuration } from "@/hooks/useActionSnoozes";

interface ActionSwimlaneProps {
  actions: DerivedAction[];
  onSnooze: (signature: string, duration: SnoozeDuration) => void;
}

const laneMeta: Record<ActionLane, { label: string; icon: typeof Users; description: string }> = {
  networking: { label: "Networking", icon: Users, description: "Build & warm relationships" },
  referrals: { label: "Referrals", icon: Handshake, description: "Champions & introductions" },
  applications: { label: "Applications", icon: Briefcase, description: "Active jobs & interviews" },
};

const LANES: ActionLane[] = ["referrals", "networking", "applications"];

export default function ActionSwimlane({ actions, onSnooze }: ActionSwimlaneProps) {
  const grouped = groupByLane(actions);

  return (
    <div className="grid gap-4 md:grid-cols-3 overflow-x-auto md:overflow-visible">
      {LANES.map((lane) => {
        const meta = laneMeta[lane];
        const Icon = meta.icon;
        const items = grouped[lane];
        return (
          <div
            key={lane}
            className="rounded-xl border border-border bg-card flex flex-col min-w-[260px]"
          >
            <div className="p-3 border-b border-border flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">{meta.label}</p>
                <p className="text-[11px] text-muted-foreground">{meta.description}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5">{items.length}</Badge>
            </div>
            <div className="p-3 space-y-2 flex-1 max-h-[520px] overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No pending actions
                </p>
              ) : (
                items.map((a) => (
                  <ActionCard key={a.signature} action={a} onSnooze={onSnooze} compact />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

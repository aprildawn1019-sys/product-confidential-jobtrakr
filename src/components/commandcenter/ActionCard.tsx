import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, MoreHorizontal, Sparkles, Lightbulb, Bell, ArrowRight, MessageSquareQuote, ChevronDown, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DerivedAction } from "@/lib/actionEngine";
import type { SnoozeDuration } from "@/hooks/useActionSnoozes";
import { getOutreachTemplates } from "@/lib/outreachTemplates";

interface ActionCardProps {
  action: DerivedAction;
  onSnooze: (signature: string, duration: SnoozeDuration) => void;
  compact?: boolean;
}

const urgencyAccent: Record<DerivedAction["urgency"], string> = {
  overdue: "before:bg-destructive",
  today: "before:bg-warning",
  soon: "before:bg-info",
  later: "before:bg-transparent",
};

const urgencyBadge: Record<DerivedAction["urgency"], { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive border-destructive/20" },
  today: { label: "Today", className: "bg-warning/10 text-warning border-warning/30" },
  soon: { label: "Soon", className: "bg-info/10 text-info border-info/30" },
  later: { label: "Later", className: "bg-muted text-muted-foreground border-transparent" },
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
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const templates = useMemo(() => {
    if (!action.outreachContext) return [];
    return getOutreachTemplates(action.outreachContext.networkRole, {
      contactName: action.outreachContext.contactName,
      contactFirstName: action.outreachContext.contactName.split(" ")[0],
      targetCompany: action.outreachContext.targetCompany,
      jobTitle: action.outreachContext.jobTitle,
    });
  }, [action.outreachContext]);

  const handleOpen = () => {
    if (action.href) navigate(action.href);
  };

  const copy = async (id: string, body: string) => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedId(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-card p-3 pl-4 transition-colors hover:bg-muted/30",
        "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full",
        urgencyAccent[action.urgency],
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
          <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-medium", badge.className)}>
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
        <div className="flex items-center gap-1">
          {templates.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setTemplatesOpen((v) => !v)}
              aria-expanded={templatesOpen}
              aria-label={templatesOpen ? "Hide outreach templates" : "Show outreach templates"}
            >
              <MessageSquareQuote className="h-3 w-3" />
              {templatesOpen ? "Hide template" : "Use template"}
              <ChevronDown className={cn("h-3 w-3 transition-transform", templatesOpen && "rotate-180")} />
            </Button>
          )}
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

      {templatesOpen && templates.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2">
          {templates.map((t) => {
            const id = `${action.signature}-${t.id}`;
            return (
              <div key={t.id} className="rounded border border-dashed bg-muted/30 p-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{t.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 gap-1 text-xs"
                    onClick={() => copy(id, t.body)}
                  >
                    {copiedId === id ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                  </Button>
                </div>
                <p className="text-xs whitespace-pre-line text-foreground/90">{t.body}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

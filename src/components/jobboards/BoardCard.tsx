import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ExternalLink,
  Trash2,
  ShieldAlert,
  Globe,
  ArrowRight,
  Building2,
  // Link2/Link2Off were generic chain icons — they read as "URL link" not
  // "flag this board as a target company's careers page". Bookmark icons
  // convey the actual intent (save/shortlist this board against a target).
  BookmarkPlus,
  BookmarkMinus,
} from "lucide-react";

interface JobBoard {
  id: string;
  name: string;
  url: string | null;
  category: string;
  is_active: boolean;
  notes: string | null;
  is_gated: boolean;
  public_url: string | null;
  gate_checked_at: string | null;
  target_company_id: string | null;
}

interface BoardCardProps {
  board: JobBoard;
  categoryLabels: Record<string, string>;
  /** Map of target company id → name, used to render the link indicator. */
  targetCompanyNames?: Record<string, string>;
  onToggle: (board: JobBoard) => void;
  onDelete: (board: JobBoard) => void;
  onUsePublicUrl: (board: JobBoard) => void;
  onLinkTargetCompany: (board: JobBoard) => void;
  onUnlinkTargetCompany: (board: JobBoard) => void;
  inactive?: boolean;
}

export function BoardCard({
  board,
  categoryLabels,
  targetCompanyNames = {},
  onToggle,
  onDelete,
  onUsePublicUrl,
  onLinkTargetCompany,
  onUnlinkTargetCompany,
  inactive,
}: BoardCardProps) {
  const linkedCompanyName = board.target_company_id
    ? targetCompanyNames[board.target_company_id]
    : null;
  const isLinked = Boolean(board.target_company_id);

  return (
    <div
      className={`flex flex-col py-3 px-4 rounded-xl border bg-card ${
        inactive
          ? "opacity-60 border-border"
          : board.is_gated
            ? "border-destructive/40"
            : isLinked
              ? "border-accent/40"
              : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Switch checked={board.is_active} onCheckedChange={() => onToggle(board)} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{board.name}</span>
              <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                {categoryLabels[board.category] || board.category}
              </span>
              {isLinked && (
                <span
                  className="text-xs rounded-full bg-accent/10 text-accent-foreground border border-accent/30 px-2 py-0.5 flex items-center gap-1"
                  title={
                    linkedCompanyName
                      ? `Careers page for ${linkedCompanyName}`
                      : "Linked to a target company"
                  }
                >
                  <Building2 className="h-3 w-3" />
                  {linkedCompanyName ? `Careers · ${linkedCompanyName}` : "Target careers page"}
                </span>
              )}
              {board.is_gated && (
                <span className="text-xs rounded-full bg-destructive/10 text-destructive px-2 py-0.5 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Login Required
                </span>
              )}
            </div>
            {board.notes && <p className="text-xs text-muted-foreground mt-0.5">{board.notes}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isLinked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onUnlinkTargetCompany(board)}
                  aria-label="Unflag careers page for target company"
                >
                  <BookmarkMinus className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">Unflag careers page</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {linkedCompanyName
                    ? `Stop tracking this board as the careers page for ${linkedCompanyName}.`
                    : "Stop tracking this board as a target company's careers page."}
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onLinkTargetCompany(board)}
                  aria-label="Flag as a target company's careers page"
                >
                  <BookmarkPlus className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">Flag as careers page</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Link this board to a target company so it shows up as their
                  official careers page in your sourcing workflow.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          {board.url && (
            <Button variant="ghost" size="icon" asChild>
              <a href={board.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onDelete(board)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Gate warning with public URL suggestion */}
      {board.is_gated && board.is_active && (
        <div className="mt-2 ml-10 p-2 rounded-lg bg-destructive/5 border border-destructive/20 text-xs space-y-1.5">
          <p className="text-destructive font-medium">
            This board requires login — search results may be limited or empty.
          </p>
          {board.public_url ? (
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Public alternative available:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs gap-1"
                onClick={() => onUsePublicUrl(board)}
              >
                Switch to public URL <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No public alternative found. Consider deactivating this board or browsing it manually.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

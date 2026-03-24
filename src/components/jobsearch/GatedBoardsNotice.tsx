import { ExternalLink, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GatedBoard {
  name: string;
  url: string | null;
}

interface GatedBoardsNoticeProps {
  boards: GatedBoard[];
}

export function GatedBoardsNotice({ boards }: GatedBoardsNoticeProps) {
  if (boards.length === 0) return null;

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-destructive">
            {boards.length} board{boards.length > 1 ? "s" : ""} skipped — login required
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            These boards require authentication and couldn't be searched automatically. Browse them manually and paste any interesting job URLs below.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 ml-8">
        {boards.map(board => (
          <Button
            key={board.name}
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 border-destructive/20 text-destructive hover:bg-destructive/10"
            asChild={!!board.url}
            disabled={!board.url}
          >
            {board.url ? (
              <a href={board.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                {board.name}
              </a>
            ) : (
              <span>{board.name} (no URL)</span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}

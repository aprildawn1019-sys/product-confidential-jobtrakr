import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useHelp } from "./HelpProvider";
import { getArticleById } from "@/lib/helpContent";

interface HelpHintProps {
  articleId: string;
  /** Override the tooltip label. Defaults to the article title. */
  label?: string;
  className?: string;
}

/**
 * Small inline `?` button that opens the Help Center to a specific article.
 * Use inline next to page titles or section headers.
 */
export default function HelpHint({ articleId, label, className }: HelpHintProps) {
  const { openHelp } = useHelp();
  const article = getArticleById(articleId);
  const tooltipLabel = label ?? (article ? `Help: ${article.title}` : "Open help");

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openHelp(articleId);
            }}
            aria-label={tooltipLabel}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/15 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}
          >
            <span aria-hidden="true" className="text-sm font-semibold leading-none">?</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

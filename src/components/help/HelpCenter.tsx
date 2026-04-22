import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LifeBuoy, Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  searchHelpArticles,
  type HelpArticle,
  type HelpCategory,
} from "@/lib/helpContent";

interface HelpCenterProps {
  open: boolean;
  initialArticleId: string | null;
  initialRoute?: string | null;
  onOpenChange: (open: boolean) => void;
}

function routeMatches(article: HelpArticle, pathname: string): boolean {
  if (!article.relatedRoutes || article.relatedRoutes.length === 0) return false;
  return article.relatedRoutes.some((route) => {
    if (route === pathname) return true;
    // Treat "/jobs" as matching "/jobs/123" etc.
    return pathname.startsWith(route + "/");
  });
}

export default function HelpCenter({ open, initialArticleId, initialRoute, onOpenChange }: HelpCenterProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<HelpCategory | "All">("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [routeFilter, setRouteFilter] = useState<string | null>(null);
  const articleRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // When opened with a specific article, expand it and scroll to it.
  // When opened with no article but with a route, pre-filter to route-relevant articles.
  useEffect(() => {
    if (!open) return;
    if (initialArticleId) {
      setExpandedId(initialArticleId);
      setQuery("");
      setActiveCategory("All");
      setRouteFilter(null);
      requestAnimationFrame(() => {
        const node = articleRefs.current[initialArticleId];
        node?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else if (initialRoute) {
      // Only apply route pre-filter if at least one article matches; otherwise show all.
      const hasMatch = HELP_ARTICLES.some((a) => routeMatches(a, initialRoute));
      setRouteFilter(hasMatch ? initialRoute : null);
      setQuery("");
      setActiveCategory("All");
      setExpandedId(null);
    }
  }, [open, initialArticleId, initialRoute]);

  const filtered = useMemo<HelpArticle[]>(() => {
    let results = searchHelpArticles(query);
    if (activeCategory !== "All") {
      results = results.filter((a) => a.category === activeCategory);
    }
    // Route pre-filter only applies when the user hasn't started searching or chosen a category.
    if (routeFilter && !query.trim() && activeCategory === "All") {
      results = results.filter((a) => routeMatches(a, routeFilter));
    }
    return results;
  }, [query, activeCategory, routeFilter]);

  const routeFilterActive = Boolean(routeFilter) && !query.trim() && activeCategory === "All";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="space-y-3 border-b border-border bg-card px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
              <LifeBuoy className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1">
              <SheetTitle className="font-display text-lg">Help &amp; Resources</SheetTitle>
              <SheetDescription className="text-xs">
                Search guides for every part of Koudou.
              </SheetDescription>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles, tags, keywords…"
              className="pl-9 pr-9"
              aria-label="Search help articles"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="-mx-1 flex flex-wrap gap-1.5">
            <CategoryChip
              label="All"
              active={activeCategory === "All"}
              onClick={() => setActiveCategory("All")}
            />
            {HELP_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-2 px-6 py-5">
            {routeFilterActive && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
                <p className="text-xs text-foreground/80">
                  Showing articles for this page.
                </p>
                <button
                  type="button"
                  onClick={() => setRouteFilter(null)}
                  className="text-xs font-medium text-accent-foreground underline-offset-2 hover:underline"
                >
                  Show all articles
                </button>
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
                <p className="text-sm font-medium text-foreground">No matching articles</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try a different keyword or clear the category filter.
                </p>
              </div>
            ) : (
              filtered.map((article) => {
                const isExpanded = expandedId === article.id;
                return (
                  <div
                    key={article.id}
                    ref={(el) => {
                      articleRefs.current[article.id] = el;
                    }}
                    className={cn(
                      "rounded-xl border border-border bg-card transition-colors",
                      isExpanded && "border-accent/40 bg-accent/5",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : article.id)}
                      className="flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {article.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="border-border bg-muted/40 text-[10px] font-medium text-muted-foreground"
                          >
                            {article.category}
                          </Badge>
                        </div>
                        {!isExpanded && (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {firstLine(article.body)}
                          </p>
                        )}
                      </div>
                      <ChevronDown
                        className={cn(
                          "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border px-4 py-4">
                        <ArticleBody body={article.body} />
                        {article.tags.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {article.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-muted/30 px-6 py-3 text-xs text-muted-foreground">
          {HELP_ARTICLES.length} articles · Updated with each release
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      className={cn(
        "h-7 rounded-full px-2.5 text-[11px] font-medium",
        active
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Button>
  );
}

function firstLine(body: string): string {
  const firstPara = body.split(/\n\s*\n/)[0] ?? "";
  return firstPara.replace(/^##\s*/, "").trim();
}

function ArticleBody({ body }: { body: string }) {
  const blocks = body.split(/\n\s*\n/);
  return (
    <div className="space-y-3 text-sm leading-6 text-foreground/90">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        // Subheading
        if (lines[0]?.startsWith("## ")) {
          const heading = lines[0].replace(/^##\s*/, "");
          const rest = lines.slice(1).join("\n").trim();
          return (
            <div key={i} className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {heading}
              </div>
              {rest && <RenderBlock text={rest} />}
            </div>
          );
        }
        return <RenderBlock key={i} text={block} />;
      })}
    </div>
  );
}

function RenderBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const isList = lines.every((l) => l.trim().startsWith("- "));
  if (isList) {
    return (
      <ul className="space-y-1.5">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
            <span>{l.replace(/^-\s*/, "")}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p>{text}</p>;
}

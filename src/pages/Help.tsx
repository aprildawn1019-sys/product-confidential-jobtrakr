import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Briefcase, CalendarDays, ChevronRight, ListChecks, Search, Workflow } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  searchHelpArticles,
  type HelpArticle,
  type HelpCategory,
} from "@/lib/helpContent";
import StatusBadge from "@/components/StatusBadge";
import { statusLabels } from "@/components/StatusBadge";
import type { JobStatus } from "@/types/jobTracker";

/**
 * Full-route documentation page for Koudou.
 *
 * Lives alongside the slide-out HelpCenter (which surfaces context-aware
 * articles per route). This page is the canonical, browsable index of every
 * help article + a workflow walkthrough for the Jobs Pipeline → Statuses →
 * Interviews loop, which is the spine of how the product is used day-to-day.
 */
export default function Help() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<HelpCategory | "All">("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo<HelpArticle[]>(() => {
    let results = searchHelpArticles(query);
    if (activeCategory !== "All") {
      results = results.filter((a) => a.category === activeCategory);
    }
    return results;
  }, [query, activeCategory]);

  // Group filtered articles by category for the index view
  const grouped = useMemo(() => {
    const map = new Map<HelpCategory, HelpArticle[]>();
    for (const article of filtered) {
      const list = map.get(article.category) ?? [];
      list.push(article);
      map.set(article.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          Documentation
        </div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Help &amp; Resources</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Everything you need to run your job search inside Koudou — from the pipeline taxonomy to the
          interview workflow. Use the search below or browse by category.
        </p>
      </div>

      {/* Workflow walkthrough — the spine of the product */}
      <Card className="mb-10 overflow-hidden border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-accent-foreground" />
            <h2 className="font-display text-base font-semibold text-foreground">
              The core workflow: Jobs → Pipeline → Interviews
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            How the three central surfaces connect. Each step links to the relevant tool.
          </p>
        </div>

        <div className="grid gap-px bg-border md:grid-cols-3">
          <WorkflowStep
            stepNumber={1}
            icon={Briefcase}
            title="Add a job"
            to="/jobs"
            ctaLabel="Open Jobs"
            body={
              <>
                <p>
                  Capture roles via <strong>AI Job Search</strong>, paste a URL into the scraper,
                  bulk-upload a CSV/XLSX, or add manually. Every role lands in the Jobs Pipeline.
                </p>
                <p className="mt-2 text-muted-foreground">
                  Set <em>Priority</em> (Low / Medium / High) and <em>Match Score</em> (1–5 stars,
                  always manual) so the dashboard can rank what to work on next.
                </p>
              </>
            }
          />
          <WorkflowStep
            stepNumber={2}
            icon={ListChecks}
            title="Move it through statuses"
            to="/jobs"
            ctaLabel="View Pipeline"
            body={
              <>
                <p>
                  Drag cards in Kanban view or use the status dropdown in list view. The pill colours
                  encode pipeline state at a glance:
                </p>
                <div className="mt-3 space-y-1.5">
                  {(
                    [
                      "saved",
                      "applied",
                      "screening",
                      "interviewing",
                      "offer",
                      "rejected",
                      "withdrawn",
                      "closed",
                    ] as JobStatus[]
                  ).map((s) => (
                    <div key={s} className="flex items-center gap-2 text-xs">
                      <StatusBadge status={s} />
                      <span className="text-muted-foreground">{statusDescription(s)}</span>
                    </div>
                  ))}
                </div>
              </>
            }
          />
          <WorkflowStep
            stepNumber={3}
            icon={CalendarDays}
            title="Schedule the interview"
            to="/interviews"
            ctaLabel="Open Interviews"
            body={
              <>
                <p>
                  Once a role hits <strong>Screening</strong> or <strong>Interviewing</strong>, schedule
                  the conversation from the Interviews page or the job&rsquo;s CRM panel.
                </p>
                <p className="mt-2 text-muted-foreground">
                  Each interview generates a Google Calendar link with the title, time, and notes
                  pre-filled. Add a follow-up date so it surfaces on your Schedule timeline.
                </p>
              </>
            }
          />
        </div>
      </Card>

      {/* Search + category filters */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles, tags, or keywords…"
            className="pl-9"
            aria-label="Search help articles"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
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
      </div>

      {/* Article index, grouped by category */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm font-medium text-foreground">No matching articles</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different keyword or clear the category filter.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([category, articles]) => (
            <section key={category}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </h3>
              <div className="space-y-2">
                {articles.map((article) => {
                  const isExpanded = expandedId === article.id;
                  return (
                    <Card
                      key={article.id}
                      className={cn(
                        "border-border bg-card transition-colors",
                        isExpanded && "border-accent/40 bg-accent/5",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : article.id)}
                        className="flex w-full items-start gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              {article.title}
                            </span>
                            {article.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="border-border bg-muted/40 text-[10px] font-medium text-muted-foreground"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          {!isExpanded && (
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              {firstLine(article.body)}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          className={cn(
                            "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                            isExpanded && "rotate-90",
                          )}
                        />
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border px-5 py-4">
                          <ArticleBody body={article.body} />
                          {article.relatedRoutes && article.relatedRoutes.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {article.relatedRoutes.map((route) => (
                                <Link
                                  key={route}
                                  to={route}
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted hover:text-accent-foreground"
                                >
                                  Open {route}
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground">
        {HELP_ARTICLES.length} articles · Updated with each release
      </div>
    </div>
  );
}

function statusDescription(status: JobStatus): string {
  switch (status) {
    case "saved":
      return "Captured but not yet applied — pipeline neutral.";
    case "applied":
      return "Application sent, awaiting response.";
    case "screening":
      return "In recruiter screen / phone screen stage.";
    case "interviewing":
      return "Actively in interview rounds.";
    case "offer":
      return "Offer extended — decide and respond.";
    case "rejected":
      return "Closed by employer — terminal.";
    case "withdrawn":
      return "You withdrew — terminal.";
    case "closed":
      return "Archived (struck through) — terminal and out of view.";
  }
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function WorkflowStep({
  stepNumber,
  icon: Icon,
  title,
  body,
  to,
  ctaLabel,
}: {
  stepNumber: number;
  icon: typeof Briefcase;
  title: string;
  body: React.ReactNode;
  to: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-[11px] font-semibold text-accent-foreground">
          {stepNumber}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="text-sm leading-6 text-foreground/90">{body}</div>
      <Link
        to={to}
        className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-accent-foreground hover:underline"
      >
        {ctaLabel}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
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
  // Inline markdown: very light — bold for **x**, italics for *x*
  return <p dangerouslySetInnerHTML={{ __html: inlineFormat(text) }} />;
}

function inlineFormat(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
}

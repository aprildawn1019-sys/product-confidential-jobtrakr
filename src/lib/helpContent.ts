export type HelpCategory =
  | "Getting Started"
  | "Job Search"
  | "Pipeline"
  | "Networking"
  | "Cover Letters"
  | "Profile"
  | "Target Companies"
  | "Interviews"
  | "Skills"
  | "Account";

export interface HelpArticle {
  id: string;
  title: string;
  category: HelpCategory;
  tags: string[];
  /** Markdown-lite: paragraphs separated by blank lines, "- " prefix for bullets, "## " for subheadings. */
  body: string;
  relatedRoutes?: string[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  "Getting Started",
  "Job Search",
  "Pipeline",
  "Networking",
  "Cover Letters",
  "Profile",
  "Target Companies",
  "Interviews",
  "Skills",
  "Account",
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "getting-started-overview",
    title: "How Jobtrakr is organized",
    category: "Getting Started",
    tags: ["intro", "overview", "tour", "navigation"],
    relatedRoutes: ["/getting-started"],
    body: `Jobtrakr is built around four entry paths so you can start the way that fits how you actually job hunt:

- Build your foundation — fill out your Search Profile so AI features can personalize results.
- Search for live roles — use AI Job Search and Job Boards to surface openings.
- Lead with relationships — track contacts, follow-ups, and warm intros.
- Target dream companies — shortlist organizations and work backward from them.

All four paths feed the same unified pipeline, so progress in one area shows up everywhere else. Take the guided tour from Getting Started any time to revisit the layout.`,
  },
  {
    id: "ai-job-search-tips",
    title: "Getting better results from AI Job Search",
    category: "Job Search",
    tags: ["ai", "search", "matching", "filters", "results"],
    relatedRoutes: ["/job-search"],
    body: `AI Job Search blends your Search Profile with live web results to surface roles you’d actually consider.

## Tips for stronger results
- Fill out target roles, locations, and skills in your Search Profile first — sparse profiles get generic matches.
- Use the "Search Settings" panel to raise the minimum match score if you’re getting too much noise.
- Dismiss irrelevant roles — dismissed jobs are excluded from future searches automatically.
- Add roles you like to the tracker; "Recommended for You" rescores tracked roles using priority, fit, and contacts.

## What it won't do
- Match scoring is always shown as numbers, but adding a role to the tracker uses your manual 1–5 star rating, not AI.
- Gated boards (those requiring login) are excluded from automated searches — see the Job Boards help article.`,
  },
  {
    id: "pipeline-stages",
    title: "Working the job pipeline",
    category: "Pipeline",
    tags: ["pipeline", "kanban", "status", "applications", "tracker"],
    relatedRoutes: ["/jobs"],
    body: `The Job Pipeline shows every role you’re tracking, with list and Kanban views.

## Stages
- Saved → Applied → Screening → Interviewing → Offer → Closed.
- Drag cards across columns in Kanban view, or use the status dropdown in list view.

## Match Score vs Priority
- Match Score (1–5 stars) is your manual judgment of how well the role fits you.
- Priority (Low / Medium / High) is how aggressively you want to pursue it. There is no "Critical" — keep priorities meaningful.

## Drill in
Click any job to open its CRM page with linked contacts, interviews, activity log, and a Salesforce-style timeline.`,
  },
  {
    id: "match-scoring",
    title: "How match scoring works",
    category: "Pipeline",
    tags: ["match", "score", "stars", "rating"],
    relatedRoutes: ["/jobs"],
    body: `Match Score is intentionally manual: you assign 1–5 stars based on your judgment.

We deliberately don’t use AI to auto-score matches because fit involves tradeoffs (compensation, growth, manager, team, commute) that you weight differently than a model would. Use the stars to capture your gut read after reviewing the JD.`,
  },
  {
    id: "import-jobs",
    title: "Importing jobs in bulk",
    category: "Pipeline",
    tags: ["import", "bulk", "csv", "xlsx", "spreadsheet"],
    relatedRoutes: ["/jobs"],
    body: `Use the Bulk Upload option from the Job Pipeline to import CSV or XLSX files.

- Headers don’t need to match exactly — an AI step maps your columns to Jobtrakr fields.
- Review the preview before confirming the import; you can fix mappings inline.
- Required: title and company. Everything else (location, salary, status, notes) is optional.`,
  },
  {
    id: "target-companies",
    title: "Building your target company list",
    category: "Target Companies",
    tags: ["targets", "companies", "priority", "dream"],
    relatedRoutes: ["/target-companies"],
    body: `Target Companies is for the org-first job hunt: pick the places you want to work, then track roles and people inside them.

## Priorities
- Dream — top of the list, work backward from these.
- Strong — would gladly accept the right role.
- Interested — worth monitoring.

## How it connects
- Roles you add to the pipeline that match a target company get badged automatically (fuzzy name matching).
- Job Boards can be linked to a target company so its careers page is treated as that company’s source.
- Duplicate detection flags near-identical company names so you can merge them.`,
  },
  {
    id: "network-map",
    title: "Reading the Network Map",
    category: "Networking",
    tags: ["network", "graph", "contacts", "connections", "referrals"],
    relatedRoutes: ["/network-map"],
    body: `The Network Map visualizes contacts, the companies they work at, and the jobs you’re tracking — so you can spot referral paths.

## Interactions
- Click a node to open its detail panel.
- Double-click to navigate to its full record.
- Drag from one contact to another to record a connection between them.
- Use the filter bar to focus on a company, warmth level, or role.

## Tips
- Add relationship warmth (cold / warm / hot / champion) on each contact to color-code the graph.
- Toggle "Show jobs" to overlay tracked roles and see which contacts sit inside target orgs.`,
  },
  {
    id: "contact-warmth",
    title: "Tracking relationship warmth",
    category: "Networking",
    tags: ["warmth", "contacts", "crm", "relationship"],
    relatedRoutes: ["/contacts"],
    body: `Each contact has a relationship warmth level so you know who to lean on:

- Cold — no real relationship yet.
- Warm — you’ve had real conversations.
- Hot — actively engaged, would happily help.
- Champion — would proactively advocate for you.

Log activities (calls, messages, intros) on the contact page to keep warmth honest. The dashboard surfaces overdue follow-ups based on these activities.`,
  },
  {
    id: "cover-letter-generator",
    title: "Generating cover letters",
    category: "Cover Letters",
    tags: ["cover letter", "ai", "generate", "writing"],
    relatedRoutes: ["/cover-letters"],
    body: `The Cover Letters page generates tailored letters using your Search Profile and a job description.

## Workflow
1. Pick a tracked job (or paste a JD manually).
2. If the job has a URL, click "Extract from URL" to scrape the description.
3. Generate — the AI uses your profile summary, skills, and the JD to draft a letter.
4. Edit inline using the rich text editor; copy as plain text or HTML.

## Limits
Cover letter generation is rate-limited per user (currently 20/hour) to keep costs under control. You’ll see a friendly error if you hit the cap.`,
  },
  {
    id: "resume-parsing",
    title: "Uploading and parsing your resume",
    category: "Profile",
    tags: ["resume", "cv", "parse", "upload", "profile"],
    relatedRoutes: ["/profile"],
    body: `Upload a PDF, DOCX, or text resume on the Search Profile page and Jobtrakr will auto-fill your profile fields.

## What gets extracted
- Summary, target roles, years of experience.
- Skills (technical, soft, tools).
- Industries, certifications, spoken languages.

## Tips
- Review the parsed values before saving — AI extraction is fast but not perfect.
- You can re-parse the stored text without re-uploading using "Re-parse Resume".
- Resume parsing is rate-limited (currently 10/hour per user).`,
  },
  {
    id: "search-profile",
    title: "Why your Search Profile matters",
    category: "Profile",
    tags: ["profile", "preferences", "personalization"],
    relatedRoutes: ["/profile"],
    body: `Your Search Profile is the single source of truth for personalization. AI Job Search, cover letter generation, skill gap analysis, and recommendations all read from it.

## Five fields drive the completeness score (20% each)
- Target roles
- Locations
- Skills
- Summary
- Minimum base salary

A fully filled profile makes every other AI feature noticeably sharper.`,
  },
  {
    id: "scheduling-interviews",
    title: "Scheduling interviews and follow-ups",
    category: "Interviews",
    tags: ["schedule", "interviews", "calendar", "reminders", "follow-up"],
    relatedRoutes: ["/interviews"],
    body: `The Schedule page combines interviews and contact follow-ups into a single timeline.

## Add an interview
- Click "Schedule Interview", pick the job, type, date, and time.
- Add notes — they show up on the job’s CRM page too.

## Add to your calendar
Each interview has a Google Calendar link generated dynamically from its details — click it to add the event with title, time, and notes prefilled.

## Follow-ups
Set a follow-up date on a contact and it appears on this page automatically. Filter by Interviews / Follow-ups / All using the chips above the list.`,
  },
  {
    id: "skills-insights",
    title: "Reading the Skills Insights dashboard",
    category: "Skills",
    tags: ["skills", "insights", "trends", "demand", "gap"],
    relatedRoutes: ["/skills-insights"],
    body: `Skills Insights aggregates skills extracted from every job description you’ve looked at.

## What you can see
- Top Skills — most-mentioned skills across your tracked JDs.
- Trends — how demand for each skill changes over time.
- Skill Gap — skills appearing in JDs that aren’t on your profile yet.
- Resume Keywords / LinkedIn Headlines — AI suggestions tuned to the in-demand skills.

## Refreshing
Use "Refresh All Skills" to re-extract skills from all current jobs (useful after editing JDs). Filter by source and date range to focus the view.`,
  },
  {
    id: "gated-job-boards",
    title: "Why some job boards are flagged as gated",
    category: "Job Search",
    tags: ["job boards", "gated", "login", "scraping"],
    relatedRoutes: ["/job-boards"],
    body: `Some boards (LinkedIn, ExecThread, certain ATS pages) require a login to view roles. The "Test Access" scanner flags these as gated.

## What gating means
- Gated boards are excluded from AI Job Search runs because the scraper can’t see results behind a login wall.
- A red banner appears on the Job Boards page when active boards are gated.

## Workflow
- Switch to the public URL when one is available (the scanner suggests this).
- Manually browse gated boards and add interesting roles via "Add Job" or paste a URL into the scraper.
- Deactivate boards you can’t access so they stop counting against the active total.`,
  },
  {
    id: "linking-board-to-target",
    title: "Linking a job board to a target company",
    category: "Target Companies",
    tags: ["job boards", "careers page", "target companies"],
    relatedRoutes: ["/job-boards", "/target-companies"],
    body: `If a job board is actually a company’s careers page, link it to the corresponding Target Company.

- On the Job Boards page, open the board and use "Link to Target Company".
- Linked boards show an indicator on the card and inherit context from the company.
- Useful for tracking ATS pages (Greenhouse, Lever, Workday) belonging to specific dream employers.`,
  },
  {
    id: "auth-and-passwords",
    title: "Account, passwords, and security",
    category: "Account",
    tags: ["password", "security", "hibp", "auth", "account"],
    relatedRoutes: ["/auth"],
    body: `Jobtrakr uses email + password auth with leaked-password protection enabled.

## Password rules
- Passwords are checked against the Have I Been Pwned database during signup and password change. Breached passwords are rejected with a clear error.
- Choose a unique passphrase — never reuse a password from another site.

## Sign in / out
- Sign out from the sidebar footer.
- Self-hosted instances may have registrations disabled by default — contact your admin if signup fails.`,
  },
  {
    id: "rate-limits",
    title: "AI rate limits explained",
    category: "Account",
    tags: ["rate limit", "ai", "quota", "limits"],
    relatedRoutes: [],
    body: `To keep AI features fast and affordable, Jobtrakr caps how often each user can call certain functions per hour:

- Resume parsing — 10 per hour.
- Cover letter generation — 20 per hour.
- Job description skill extraction — 60 per hour.

If you hit a limit you’ll see a 429 error toast with the per-hour cap. The window slides — wait a few minutes and you can call again.`,
  },
  {
    id: "dashboard-overview",
    title: "Reading the Dashboard",
    category: "Getting Started",
    tags: ["dashboard", "overview", "active opportunities"],
    relatedRoutes: ["/"],
    body: `The Dashboard is your home base after login.

## Active Opportunities
A unified panel showing your in-flight roles ordered by upcoming interview / follow-up date, then priority. Click any row to jump to its CRM page.

## Quick stats
Counts of jobs by status, contacts by warmth, and target companies by priority — all clickable to filter the underlying list.`,
  },
];

/** Substring search with light tag boost. Returns articles in relevance order. */
export function searchHelpArticles(query: string, articles = HELP_ARTICLES): HelpArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return articles;

  const scored = articles.map((a) => {
    let score = 0;
    if (a.title.toLowerCase().includes(q)) score += 10;
    if (a.tags.some((t) => t.toLowerCase().includes(q))) score += 6;
    if (a.category.toLowerCase().includes(q)) score += 4;
    if (a.body.toLowerCase().includes(q)) score += 1;
    return { a, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((s) => s.a);
}

export function getArticleById(id: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.id === id);
}

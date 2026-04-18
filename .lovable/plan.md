
## Help & Resources System

Add a searchable in-app help center accessible from the sidebar plus contextual help triggers embedded throughout the workflow.

### 1. Help content data source

Create `src/lib/helpContent.ts` — a typed array of help articles. Each article has:
- `id` (slug, used for deep-linking)
- `title`
- `category` (Getting Started, Job Search, Pipeline, Networking, Cover Letters, Profile, Target Companies, Interviews, Skills, Account)
- `tags` (for search ranking)
- `body` (markdown-lite: paragraphs + bullet lists)
- `relatedRoutes` (e.g. `["/job-search"]`) so we can surface contextually

Seed ~15-20 articles covering core flows: importing jobs, AI Job Search tips, pipeline stages, match scoring, target companies, network map, cover letter generation, resume parsing, scheduling interviews, password/security, etc.

### 2. Global Help Center (`HelpCenter.tsx`)

A `Sheet` (right-side drawer) component opened via context.
- Search input at top filters articles by title/tags/body (simple substring + tag boost).
- Category filter chips.
- Article list → click expands inline to read full body.
- Supports opening to a specific `articleId` via a `HelpProvider` context (`openHelp(id?)`).

Mount `HelpProvider` at the top of `Index.tsx` so all pages can call `useHelp()`.

### 3. Sidebar entry point

In `AppSidebar.tsx`, add a "Help & Resources" button in the bottom action area (above Restart walkthrough / Sign Out). Icon: `LifeBuoy` from lucide. Clicking it calls `openHelp()`.

### 4. Embedded contextual help

Create a small reusable `<HelpHint articleId="..." />` button — a subtle `?` icon (using `HelpCircle`) wrapped in a Tooltip that, when clicked, opens the Help Center to that article. Place at:

- **Job Search page** header → `articleId: "ai-job-search-tips"`
- **Profile Editor** resume upload card → `articleId: "resume-parsing"`
- **Cover Letters** generate dialog header → `articleId: "cover-letter-generator"`
- **Target Companies** page header → `articleId: "target-companies"`
- **Network Map** page header → `articleId: "network-map"`
- **Pipeline (Jobs)** page header → `articleId: "pipeline-stages"`
- **Skills Insights** header → `articleId: "skills-insights"`
- **Job Boards** page (near gated boards section) → `articleId: "gated-job-boards"`
- **Schedule (Interviews)** header → `articleId: "scheduling-interviews"`
- **Getting Started** below the hero → small "Browse all help articles" link calling `openHelp()`

### 5. Mobile

Sheet already responsive. Sidebar Help button works from mobile menu. `HelpHint` icons render inline next to page titles on mobile too.

### Files to create
- `src/lib/helpContent.ts`
- `src/components/help/HelpProvider.tsx` (context + provider)
- `src/components/help/HelpCenter.tsx` (Sheet UI with search)
- `src/components/help/HelpHint.tsx` (inline `?` trigger)

### Files to edit
- `src/pages/Index.tsx` — wrap children in `HelpProvider`, render `HelpCenter`
- `src/components/AppSidebar.tsx` — add "Help & Resources" button
- 9 page files listed above — add `<HelpHint />` next to relevant headers/sections
- `src/pages/GettingStarted.tsx` — add "Browse all help articles" link

### Out of scope
- No AI-powered help search (deterministic substring search keeps it fast and offline).
- No persistence of "viewed articles" — can be added later if useful.
- No external knowledge base integration; everything lives in code so it ships with the app and stays in version control.

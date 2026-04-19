

## Dashboard vs. Command Center — what to keep, split, or cut

Good question to ask now, before the Command Center cements itself as the only landing surface. Let me lay out what's actually on the current Command Center, what was on the old Dashboard, and where each piece belongs.

### What's on the Command Center today

1. **Header** — title, action count summary, "Suggest next steps" (AI), "Take the tour"
2. **4 stat cards** — Total Jobs, Active Applications, Interviews Scheduled, Target Companies
3. **Next steps panel** — Queue / Swimlane toggle (the core of the redesign)
4. **Pipeline Overview** — funnel visualization

Items 2 and 4 are **overview/metrics** content. Items 1 and 3 are **action-oriented** content. They're currently coexisting on one page, which works at 1108px but starts to feel busy and dilutes the "what do I do next?" intent.

### The tension

A command center answers: **"What should I do right now?"**
A dashboard answers: **"How is my search going overall?"**

Both are valid; they serve different moments:
- **Morning / between sessions** → command center (action mode)
- **Weekly review / status check / sharing with a coach** → dashboard (reflection mode)

Right now we're forcing both moments onto one screen, and the metrics cards + funnel aren't doing much work in action mode (you don't decide what to do based on "Total Jobs: 47").

### Three options

#### Option A — Pure Command Center, move metrics elsewhere
Strip the stat cards and Pipeline Overview off the Command Center. The page becomes purely about next actions. Metrics move to:
- Stat cards → top of `/jobs` (where they're contextual)
- Pipeline funnel → `/reports` (where weekly-review content lives)

**Pro**: Cleanest action surface, no visual noise competing with the queue.
**Con**: You lose the at-a-glance feel of "the dashboard." First-login users land on a list of tasks, not a snapshot.

#### Option B — Split into two pages: `/` (Command Center) + `/dashboard` (Overview)
Command Center stays the default landing page (action focus). A separate Overview page at `/dashboard` keeps the stat cards, pipeline funnel, and gains room for richer analytics (weekly velocity, response rates, lane health).

**Pro**: Each surface has a clear job. Power users get both. Sidebar gains a "Dashboard" link below "Command Center."
**Con**: Two top-level surfaces to maintain. Some users won't discover the second one.

#### Option C — Keep as-is but tighten (recommended starting point)
Keep stat cards (they're tiny and provide context) but **remove the Pipeline Overview** from the Command Center — it's the heaviest piece and least action-relevant. Move the funnel to a small sidebar widget on `/jobs` or to `/reports`. Stat cards stay because they're scannable in <1 second and don't compete with the queue.

**Pro**: Minimum disruption, preserves the lightweight overview, removes the one panel that competes most for attention.
**Con**: Doesn't fully resolve the action-vs-reflection split — just defers it.

### What I'd recommend

**Option C now, Option B later.** Here's why:

1. The Command Center is brand new. Users need to learn the queue/swimlane pattern. Removing the funnel reduces competing visual weight without amputating the overview entirely.
2. Stat cards (4 small numbers) are cheap real estate and orient new users — they answer "is this app showing me my data?" in a glance.
3. A dedicated `/dashboard` Overview page is the right long-term shape, but it deserves its own design pass with **richer** analytics than what's there today (response rate per lane, time-to-first-interview, conversion funnel by source). Building it as a token-effort copy-paste of the old dashboard would underdeliver.

### Concrete plan if you pick Option C

- Remove the **Pipeline Overview** card from `src/pages/Dashboard.tsx`
- Add the funnel to **`src/pages/Reports.tsx`** as a top-of-page section (it's already an analytics surface)
- Keep the 4 stat cards on the Command Center
- Header subtitle stays as the action summary
- No routing changes, no sidebar changes

### Concrete plan if you pick Option B

- Create new `src/pages/Overview.tsx` with stat cards + pipeline funnel + room for new analytics widgets
- Add `/dashboard` route → Overview component
- Keep `/` → Command Center (current `Dashboard.tsx`, slim down by removing stat cards + funnel)
- Add "Overview" sidebar link below "Command Center" in `AppSidebar.tsx`'s Discover group
- Defer richer analytics widgets (response rate, velocity) to a follow-up

### Things I want your call on

1. **Which option (A / B / C / something else)?**
2. **If C**: should the funnel land on `/reports` or in a sidebar widget on `/jobs`?
3. **If B**: any specific metrics you want on the Overview page beyond what's there today (response rate by lane, time-to-first-interview, weekly application velocity)?
4. **First-login experience**: should brand-new users land on Command Center (current behavior) or on Overview (more "welcome" feel)?


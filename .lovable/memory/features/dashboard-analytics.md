---
name: Command Center & Dashboard
description: Two surfaces — Command Center at / (prioritized next steps + widgets) and Dashboard at /dashboard (search-funnel analytics). Reports demoted to /settings/data-export.
type: feature
---
The app exposes two top-level surfaces in the sidebar:

## Command Center — `/` (file: `src/pages/Dashboard.tsx`, H1: "Command Center")
Layout (top to bottom):
1. Header — title + actions count subtitle, "Suggest next steps" (AI) and "Take the tour" buttons.
2. Four stat cards: Total Jobs, Active Applications, Interviews Scheduled, Target Companies.
3. **WeeklyReview** (collapsible, collapsed by default, persisted in `localStorage` key `jobtrakr.weeklyReview.expanded`). Four tiles for the current Mon–Sun week with vs-last-week deltas:
   - Applications sent — `jobs.appliedDate` in window
   - Follow-ups done — `contact_activities` of types `email|call|linkedin_message|message|follow_up`
   - Interviews scheduled — interviews with `date` in window and not cancelled
   - Networking meetings — `contact_activities.activity_type === 'meeting'`
4. **UpcomingInterviewsStrip** — next 3 scheduled interviews, deep-linked to `/jobs/:id`.
5. Two-column grid: **ActiveOpportunitiesPanel** + **TargetCoverageSnapshot** (Booster/Connector/Recruiter/Cold counts, each filter-linked to `/target-companies?coverage=…`).
6. **TargetsNeedingSourcing** — Dream/Strong companies with no Booster, deep-linked to `/target-companies?sourcing={id}` to auto-open the SourcingPanel.
7. Next steps panel — Queue/Swimlane toggle backed by `ActionCard` (renders inline role-based outreach templates).

## Dashboard — `/dashboard` (file: `src/pages/Overview.tsx`, H1: "Dashboard")
Search-funnel analytics powered by Recharts:
- Response rate by lane (BarChart)
- Time to first interview per job (vertical BarChart)
- Weekly velocity over the last 8 weeks (LineChart): applications, interviews, outreach
Each metric carries a `PlaceholderHint` flagging that the formula may evolve.

Reports page lives at `/settings/data-export` (file `src/pages/Reports.tsx`, header "Settings → Data & Export"). Hard redirects from `/reports` and `/settings`.

Sidebar order: **Command Center** → **Dashboard** → **Getting Started** → grouped sections.

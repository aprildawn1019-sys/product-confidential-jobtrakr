---
name: Dashboard Analytics
description: Unified Dashboard at /. Stat cards + collapsible Weekly Review + Upcoming Interviews + Active Opportunities + Target Coverage + Action Queue/Swimlane. Reports demoted to /settings/data-export.
type: feature
---
The Dashboard is the single primary surface at `/` (file: `src/pages/Dashboard.tsx`, header label: "Dashboard"). The wording "Command Center" was retired in favor of one consistent name.

Layout (top to bottom):
1. Header — title + actions count subtitle, "Suggest next steps" (AI) and "Take the tour" buttons.
2. Four stat cards: Total Jobs, Active Applications, Interviews Scheduled, Target Companies.
3. **WeeklyReview** (collapsible, collapsed by default, persisted in `localStorage` key `jobtrakr.weeklyReview.expanded`). Four tiles for the current Mon–Sun week with vs-last-week deltas:
   - Applications sent — `jobs.appliedDate` in window
   - Follow-ups done — `contact_activities` of types `email|call|linkedin_message|message|follow_up`
   - Interviews scheduled — interviews with `date` in window and not cancelled (the type has no `createdAt`)
   - Networking meetings — `contact_activities.activity_type === 'meeting'`
4. **UpcomingInterviewsStrip** — next 3 scheduled interviews, deep-linked to `/jobs/:id`.
5. Two-column grid: **ActiveOpportunitiesPanel** (top 6 jobs in applied/screening/interviewing/offer, sorted by `statusUpdatedAt`) and **TargetCoverageSnapshot** (Booster/Connector/Recruiter/Cold counts from the coverage taxonomy, each filter-linked to `/target-companies?coverage=…`).
6. Next steps panel — Queue/Swimlane toggle (existing).

Reports page lives at `/settings/data-export` (file `src/pages/Reports.tsx`, header "Settings → Data & Export"). Hard redirects from `/reports` and `/settings`. Sidebar exposes it under Settings.

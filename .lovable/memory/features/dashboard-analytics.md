---
name: Command Center & Dashboard
description: Two surfaces — Command Center at / (canonical spec = src/assets/dashboard-mockup.jpg + spec-command-center-v2.jpg) and Insights at /insights (search-funnel analytics). Reports demoted to /settings/data-export.
type: feature
---

The app exposes two top-level analytics surfaces in the sidebar.

## Command Center — `/` (file: `src/pages/Dashboard.tsx`, H1: "Command Center")

**Binding spec:** `src/assets/dashboard-mockup.jpg` and `src/assets/spec-command-center-v2.jpg`. Read both before changing this page. See `mem://style/visual-theme-v2` for the cross-app rules.

Layout, top to bottom:

1. **Header** — `font-display text-3xl sm:text-4xl font-bold` "Command Center" title + one-line subtitle following the pattern `{n} next steps · {n} overdue · {n} today`. **No buttons in the header.**
2. **Four minimal StatCards** (`variant="minimal"`): Total Jobs, Active Applications, Interviews Scheduled, Target Companies. Pure white, big numeral, label in caps. No icons, no accent fills.
3. **Next steps panel** — promoted directly under stats. Panel header carries the "Suggest next steps" AI button. Rows render via `NextStepRow`: avatar + title/subtitle + amber stadium toggle. No urgency bars, no badges, no inline arrows. Hover reveals a snooze dropdown only. Visible cap of 6 with "View all" expansion.
4. **Two-column secondary row:** `WeeklyReview` + `UpcomingInterviewsStrip`.
5. **Collapsible `<details>` "Pipeline & sourcing signals"** (collapsed by default): `ActiveOpportunitiesPanel` + `TargetCoverageSnapshot` and `TargetsNeedingSourcing`.

WeeklyReview tiles cover the current Mon–Sun window with vs-last-week deltas: Applications sent (`jobs.appliedDate`), Follow-ups (`contact_activities` of types `email|call|linkedin_message|message|follow_up`), Interviews scheduled (interviews not cancelled), Networking meetings (`contact_activities.activity_type === 'meeting'`).

## Insights — `/insights` (file: `src/pages/Overview.tsx`, H1: "Dashboard")

Search-funnel analytics powered by Recharts:
- Response rate by lane (BarChart)
- Time to first interview per job (vertical BarChart)
- Weekly velocity over the last 8 weeks (LineChart): applications, interviews, outreach

Each metric carries a `PlaceholderHint` flagging that the formula may evolve.

Reports lives at `/settings/data-export` (file `src/pages/Reports.tsx`). Hard redirects from `/reports` and `/settings`.

Sidebar order: **Command Center** → **Insights** under TODAY/INSIGHTS groups respectively.

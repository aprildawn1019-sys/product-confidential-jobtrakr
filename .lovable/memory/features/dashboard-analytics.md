---
name: Command Center & Dashboard
description: Two surfaces — Command Center at / (Calm Operations: minimal stats + promoted Next steps + collapsible secondary panels) and Dashboard at /dashboard (search-funnel analytics). Reports demoted to /settings/data-export.
type: feature
---
The app exposes two top-level surfaces in the sidebar:

## Command Center — `/` (file: `src/pages/Dashboard.tsx`, H1: "Command Center")
Calm Operations layout (top to bottom). The prior hero shot (`src/assets/dashboard-mockup.jpg`) is the canonical UX reference; do not reintroduce rainbow stat-card fills, icons inside stat cards, or heavy urgency tints on action rows.
1. Header — title + actions count subtitle, "Suggest next steps" (AI) and "Take the tour" buttons.
2. Four **minimal StatCards** (`variant="minimal"`, default): white card, big Space Grotesk numeral (text-4xl/5xl), label below in caps. **No icons, no accent fills.** Total Jobs, Active Applications, Interviews Scheduled, Target Companies.
3. **Next steps panel** — promoted directly under stats (it's the page's hero). Queue/Swimlane toggle backed by `ActionCard`. ActionCard uses a thin colored left bar (`before::` pseudo-element) for urgency + a small pill badge — no background tints.
4. Two-column secondary row: **WeeklyReview** + **UpcomingInterviewsStrip** side by side.
5. Collapsible `<details>` "Pipeline & sourcing signals" (collapsed by default): **ActiveOpportunitiesPanel** + **TargetCoverageSnapshot** (Booster/Connector/Recruiter/Cold) and **TargetsNeedingSourcing** (Dream/Strong companies with no Booster, deep-linked to `/target-companies?sourcing={id}`).

WeeklyReview tiles cover the current Mon–Sun window with vs-last-week deltas: Applications sent (`jobs.appliedDate`), Follow-ups (`contact_activities` of types `email|call|linkedin_message|message|follow_up`), Interviews scheduled (interviews not cancelled), Networking meetings (`contact_activities.activity_type === 'meeting'`).

## Dashboard — `/dashboard` (file: `src/pages/Overview.tsx`, H1: "Dashboard")
Search-funnel analytics powered by Recharts:
- Response rate by lane (BarChart)
- Time to first interview per job (vertical BarChart)
- Weekly velocity over the last 8 weeks (LineChart): applications, interviews, outreach
Each metric carries a `PlaceholderHint` flagging that the formula may evolve.

Reports page lives at `/settings/data-export` (file `src/pages/Reports.tsx`, header "Settings → Data & Export"). Hard redirects from `/reports` and `/settings`.

Sidebar order: **Command Center** → **Dashboard** → **Getting Started** → grouped sections.

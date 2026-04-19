

## Reframing A — single Dashboard surface with inline Weekly Review

### Decisions locked in
- **One surface, one name**: "Dashboard" everywhere (page header, sidebar, memory). Drop "Command Center" wording.
- **Add Weekly Review** inline on the Dashboard (collapsed by default to protect action focus).
- **Reports page**: demote — move CSV exports + pipeline funnel into a Settings area; remove `/reports` as a top-level sidebar entry.

### Weekly Review metrics (this week, Mon-Sun)
1. **Applications sent** — count of `jobs` whose `status_updated_at` moved to `applied` this week (proxy: jobs with `applied_date` in current week).
2. **Follow-ups done** — count of `contact_activities` rows with `activity_type` in {`email`, `call`, `linkedin_message`, `meeting`} this week.
3. **Interviews scheduled** — count of `interviews` with `created_at` this week (when the interview was booked, regardless of when it occurs).
4. **Networking meetings completed** — count of `contact_activities` with `activity_type = 'meeting'` and `activity_date` ≤ today, this week.

Each metric: big number + small "vs last week" delta (↑ ↓ →). No charts in this pass — keep it scannable.

### File-level changes

**Rename / cleanup**
- Rename page header in `src/pages/Dashboard.tsx` from "Command Center" → "Dashboard". Keep filename `Dashboard.tsx` (no route change).
- Update `src/components/AppSidebar.tsx` label to "Dashboard".
- Update `mem://index.md` and `mem://features/dashboard-analytics` to reflect the unified naming + Weekly Review.

**New component**
- `src/components/dashboard/WeeklyReview.tsx` — collapsible card with the 4 metrics + week-over-week deltas. Pure derivation from existing store data; no new tables, no edge functions.

**Dashboard wiring**
- `src/pages/Dashboard.tsx`: insert `<WeeklyReview ... />` between the 4 stat cards and the "Next steps" panel. Collapsed by default; remembers state in `localStorage` (`jobtrakr.weeklyReview.expanded`).

**Reports demotion**
- Remove `/reports` link from `src/components/AppSidebar.tsx`.
- Move the `Reports` page contents into a new `src/pages/SettingsData.tsx` mounted at `/settings/data` (CSV exports + pipeline funnel preserved as-is).
- Keep `/reports` route as a redirect to `/settings/data` so any bookmarked link still works.
- Add a "Data & Export" entry in the Settings sidebar group (or wherever the existing Settings link lives) so it's discoverable.

### What's intentionally NOT in this pass
- No new analytics charts (response rate by lane, time-to-interview trends) — those belong to a later, dedicated analytics pass if ever needed.
- No DB changes; all metrics derive from existing tables.
- No change to the Action Queue / Swimlane behavior.

### Open question for you (the prompt you asked for)

Once Weekly Review lands, the Dashboard will have: header → 4 stat cards → Weekly Review (collapsible) → Next steps (Queue/Swimlane). The old Dashboard had a few more elements that we removed or never carried over. **Which of these would you like to re-introduce, if any?**

1. **Pipeline Funnel** (currently on Reports → moving to Settings/Data) — re-add a compact version to the Dashboard?
2. **Active Opportunities panel** — list of jobs in `applied` / `interviewing` / `offer` with quick status updates (was on the old dashboard per memory).
3. **Upcoming Interviews strip** — next 3 interviews with date + company, deep-linked to the interview row.
4. **Recent Activity timeline** — last 5 contact activities + job activities, mixed feed.
5. **Target Coverage snapshot** — "3 Boosters · 4 Connectors · 5 Cold targets" mini-bar from the new sourcing taxonomy, deep-linked to filtered Target Companies.
6. **Nothing — keep it lean** (just stats + Weekly Review + Next steps).

Pick any combination; I'll prioritize them under the Next steps panel in the order you specify.


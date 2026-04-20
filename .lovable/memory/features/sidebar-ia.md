---
name: Sidebar IA & surfaces
description: Sidebar grouped TODAY / PIPELINE / LIBRARY / INSIGHTS. Command Center at /, Insights at /insights (renamed from /dashboard), Resumes (versioned) + Cover Letters in Library, Settings is a tabbed hub.
type: feature
---

The sidebar is organized into four groups, ordered by daily-use frequency.
Footer cluster (Settings, Help, Restart walkthrough, Sign out) is pinned to the bottom.
Getting Started auto-hides once the user has any jobs, contacts, or target companies.
Sidebar supports a collapsed icon-only state (56px) toggled via a floating chevron button on the right edge; choice persists in `localStorage` under `jobtrakr.sidebar.collapsed`.

## Groups

- **Today** — `/` Command Center, `/jobs`, `/contacts`, `/interviews`
- **Pipeline** — `/target-companies`, `/job-boards`, `/job-search`
- **Library** — `/resumes`, `/cover-letters`
- **Insights** — `/insights`, `/skills-insights`, `/network-map`

## Surfaces

- **Command Center — `/`** (file: `src/pages/Dashboard.tsx`, H1 "Command Center")
  Operational homepage: stat strip, WeeklyReview, UpcomingInterviewsStrip, ActiveOpportunitiesPanel + TargetCoverageSnapshot, TargetsNeedingSourcing, then Next Steps queue/swimlane.

- **Insights — `/insights`** (file: `src/pages/Overview.tsx`, H1 "Dashboard")
  Search-funnel analytics: response rate by lane, time-to-first-interview per job, weekly velocity (8 weeks). `/dashboard` redirects here.

- **Resumes — `/resumes`** (file: `src/pages/Resumes.tsx`)
  List of resume versions backed by `resume_versions` table. Each row: name, primary badge, copy/edit/duplicate/delete. One row per user can be `is_primary` (enforced by partial unique index + BEFORE INSERT/UPDATE trigger `demote_other_primary_resumes` that auto-clears any previous primary). The primary version is read by `generate-cover-letter` (and any future AI matching), falling back to `job_search_profile.resume_text` if no version exists.

- **Cover Letters — `/cover-letters`** unchanged behavior, just regrouped under Library.

- **Settings — `/settings`** (file: `src/pages/Settings.tsx`)
  Tabbed hub: `profile` (wraps `ProfileEditor`) and `data-export` (wraps `Reports`). Both inner pages render no top-level H1 to avoid duplicates inside tabs. `/settings` redirects to `/settings/profile`. `/profile` redirects to `/settings/profile`. `/reports` redirects to `/settings/data-export`.

## Resume versioning data model

`resume_versions` (RLS: user owns own rows):
- `name text NOT NULL` (e.g. "Base", "FinTech tilt", "Staff PM")
- `content text NOT NULL DEFAULT ''`
- `is_primary boolean NOT NULL DEFAULT false`
- `created_at`, `updated_at` (auto via `touch_updated_at` trigger)
- Unique partial index `resume_versions_one_primary_per_user` on `user_id WHERE is_primary = true`
- BEFORE INSERT/UPDATE trigger `demote_other_primary_resumes` clears the previous primary atomically before commit, so the user can mark a new primary without manually unsetting the old one.

When the primary resume is deleted, the Resumes page promotes the most recently updated remaining version to primary client-side.

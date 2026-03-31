

# Job Application CRM View

## Overview

Create a dedicated full-page view for each job application that consolidates all related activity into a single CRM-like interface. Accessible by clicking a job from the Jobs list or via a new route `/jobs/:id`.

## What exists today

- `JobDetailPanel` — an inline expandable panel within job cards showing job details, recruiter info, interviews, and linked contacts. It lacks activity history and networking actions.
- Store already has all needed data and functions: `getContactsForJob`, `getNetworkMatchesForJob`, `getActivitiesForContact`, `getInterviewsForJob`, linked contacts, etc.
- No per-job activity log exists — activities are tracked per-contact, not per-job.

## New database table

**`job_activities`** — tracks actions taken on a job application beyond status changes.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | not null |
| job_id | uuid | not null |
| activity_type | text | e.g. "shared_resume", "cold_outreach", "introduction", "referral_request", "informational_chat", "follow_up", "other" |
| activity_date | text | date string |
| contact_id | uuid | nullable — which contact was involved |
| notes | text | nullable |
| created_at | timestamptz | default now() |

RLS: authenticated users manage own rows.

## New page: `src/pages/JobCRM.tsx`

A full-page view organized into sections:

### Section 1 — Header
- Job title, company, location, type, status badge, fit score, urgency
- Inline status selector to change status
- Link to job posting, applied date

### Section 2 — Timeline / Activity Feed
- Merged chronological feed combining:
  - Status changes (derived from `statusUpdatedAt`)
  - Interviews (from `interviews` table)
  - Job activities (from new `job_activities` table)
  - Contact activities for linked contacts (from `contact_activities`)
- Each entry shows icon, date, description
- "Log Activity" button to add new `job_activity` entries with type selector

### Section 3 — Network & Contacts
- Linked contacts with last conversation snippet, warmth indicator, follow-up date
- Network matches (contacts at same company) with link action
- For each contact: "What we last spoke about" (from conversation_log), "Next step" (from follow-up date/notes)

### Section 4 — Interviews
- Reuse existing interview display + scheduling from `JobDetailPanel`

### Section 5 — Recruiter Info
- Reuse existing recruiter section from `JobDetailPanel`

### Section 6 — Notes & Description
- Job notes (editable)
- Job description (collapsible)

## Changes summary

| File | Change |
|------|--------|
| Migration SQL | Create `job_activities` table with RLS |
| `src/types/jobTracker.ts` | Add `JobActivity` interface |
| `src/stores/jobTrackerStore.ts` | Add CRUD for `job_activities`, fetch in `fetchAll` |
| `src/pages/JobCRM.tsx` | New page component |
| `src/pages/Index.tsx` | Add route `/jobs/:id` pointing to JobCRM, pass store props |
| `src/components/AppSidebar.tsx` | No change needed — accessed via Jobs list |
| `src/pages/Jobs.tsx` | Add click handler on job cards to navigate to `/jobs/:id` |

## Technical notes

- The timeline feed merges data from multiple sources client-side, sorted by date descending
- The "Log Activity" form offers predefined types: Shared Resume, Cold Outreach, Introduction, Referral Request, Informational Chat, Follow Up, Other
- Contact-id is optional on job activities so standalone actions (e.g. "researched company") are supported
- Reuses existing UI components (StatusBadge, StatusSelect, FitScoreStars, UrgencyBadge, WarmthBadge)


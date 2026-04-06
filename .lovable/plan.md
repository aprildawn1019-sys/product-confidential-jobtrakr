

## Plan: Target Organizations — "Org-First" Pipeline

### Concept

Add a **Target Companies** feature that lets users build a shortlist of dream employers, then track all activity (jobs, contacts, research notes) per company. This flips the workflow: instead of reacting to job postings, users proactively identify organizations and build a pipeline around them.

### How It Fits the Current Design

```text
Sidebar Navigation (updated)
─────────────────────────────
DISCOVER
  AI Job Search
  Job Boards
  Search Profile
  ★ Target Companies  ← NEW
  Recommendations
  Skills Insights

TRACK & APPLY
  Job Postings
  Applications
  Schedule

NETWORKING
  Connections
```

Target Companies sits in "Discover" because it's a proactive research activity — the user is identifying *where* they want to work before individual postings exist.

### Data Model

New `target_companies` table:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | RLS-scoped |
| name | text | Company name |
| website | text? | Company URL |
| careers_url | text? | Careers page URL |
| industry | text? | e.g. "Fintech" |
| size | text? | e.g. "1000-5000" |
| priority | text | "dream" / "strong" / "interested" (default "interested") |
| status | text | "researching" / "applied" / "connected" / "archived" (default "researching") |
| notes | text? | Free-form research notes |
| logo_url | text? | Optional logo |
| created_at | timestamptz | default now() |

RLS: standard `user_id = auth.uid()` ALL policy.

No new tables for linking — the existing `jobs.company` and `contacts.company` fields already carry company names. The UI will use fuzzy company-name matching (already exists as `companiesMatch()` in the store) to dynamically surface related jobs and contacts.

### Page Design: `/target-companies`

**Header**: "Target Companies" title + "Add Company" button

**View**: Card grid (default) with optional list toggle

**Each company card shows**:
- Company name, industry, priority badge (color-coded: dream=gold, strong=blue, interested=gray)
- Status chip (researching / applied / connected / archived)
- Auto-computed stats pulled from existing data:
  - Jobs tracked at this company (count from `jobs` table where company matches)
  - Contacts at this company (count from `contacts` table)
  - Open applications (jobs with active status)
- Quick actions: edit, change priority, change status, open careers URL, archive

**Add Company dialog**: Name (required), website, careers URL, industry, size, priority, notes. Minimal — users should be able to add a company in under 10 seconds.

**Filters**: Priority (dream/strong/interested), Status, search by name

### Integration Points

1. **Dashboard widget** — "Target Companies" stat card showing total targets + how many have no jobs tracked yet (nudge to take action).

2. **Job Search** — When AI Job Search returns results, highlight results from target companies with a ★ badge and "Target Company" label so they stand out.

3. **Job Postings** — On the Jobs list/Kanban, jobs whose company matches a target company get a small target icon. When adding a job, if the company matches a target, auto-link visually.

4. **Contacts** — On the Contacts page, contacts at target companies get a subtle indicator.

5. **Job CRM** — The individual job CRM page shows a "Target Company" badge if the job's company is in the target list.

### Workflow

```text
1. User goes to Target Companies → adds "Stripe", "Figma", "Notion"
2. Sets Stripe as "Dream", others as "Strong"
3. Runs AI Job Search → results from Stripe are highlighted with ★
4. Adds a Stripe PM role to tracker → Jobs page shows target badge
5. Finds a contact at Stripe → Contacts page shows target indicator
6. Dashboard shows "3 Target Companies, 1 with active applications"
```

### Implementation Steps

1. **Migration**: Create `target_companies` table with RLS policy
2. **Store**: Add target company CRUD to `jobTrackerStore.ts` (add, update, delete, fetch)
3. **Types**: Add `TargetCompany` interface to `jobTracker.ts`
4. **Page**: Create `src/pages/TargetCompanies.tsx` with card grid, filters, add/edit dialogs
5. **Routing**: Add route in `Index.tsx`, add nav item in `AppSidebar.tsx`
6. **Cross-feature integration**: Add target-company indicators to JobSearch results, Jobs list, Contacts page, Dashboard stat card, and JobCRM page
7. **README**: Add Target Companies to the features list

### Scope Control

Phase 1 (this plan): Core page + data model + cross-feature badges/highlights. No AI features, no auto-scraping of careers pages — just a clean, manual target list with smart linking to existing data via company name matching.

Phase 2 (future): AI-powered company research, auto-monitor careers pages for new postings, company culture insights from profile data.


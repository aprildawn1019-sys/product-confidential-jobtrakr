

## AI Product Management Role Feed + Skills Intelligence Dashboard

This feature adds three capabilities: (1) an automated AI-powered feed that discovers AI Product Management roles and imports them into Job Postings, (2) AI-driven skills extraction from job descriptions, and (3) a visual skills trend dashboard.

### Architecture

```text
┌─────────────────────────────────────────────────┐
│  New Edge Function: ai-pm-role-feed             │
│  - Searches for AI PM roles via Firecrawl       │
│  - Uses Lovable AI to extract structured data   │
│    (title, company, skills[], description)       │
│  - Returns normalized job + skills payload      │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  New DB Table: job_skills_snapshots             │
│  - job_id, user_id, skills[], captured_at       │
│  Tracks extracted skills per job over time       │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  New Page: /skills-insights                     │
│  - Top Skills bar chart (Recharts)              │
│  - Skills Trend line chart (skills over time)   │
│  - Filterable by date range                     │
└─────────────────────────────────────────────────┘
```

### Detailed Steps

**1. Database migration — `job_skills_snapshots` table**

```sql
CREATE TABLE public.job_skills_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  skills text[] NOT NULL DEFAULT '{}',
  captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_skills_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own snapshots" ON public.job_skills_snapshots
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

Also add a `source` column to `jobs` table to distinguish AI-feed jobs:
```sql
ALTER TABLE public.jobs ADD COLUMN source text NOT NULL DEFAULT 'manual';
```

**2. New edge function: `ai-pm-role-feed`**

- Accepts user profile context and optional keywords
- Uses Firecrawl search API to find "AI Product Manager" roles
- Sends results to Lovable AI (gemini-3-flash-preview) with a tool-call schema to extract: `title`, `company`, `location`, `type`, `salary`, `url`, `description`, `skills[]`
- Returns structured array of jobs + skills
- Handles 429/402 errors

**3. New edge function: `extract-job-skills`**

- Accepts a job description string
- Uses Lovable AI to extract a ranked list of skills via tool calling
- Returns `{ skills: string[] }` sorted by prominence
- Called when jobs are imported (from AI feed or manually) to populate `job_skills_snapshots`

**4. Frontend — AI PM Role Feed tab on Jobs page**

- Add a "AI PM Feed" tab/button on the Jobs page
- Clicking it calls the `ai-pm-role-feed` edge function
- Results display in a list with "Add to Tracker" buttons
- When added, jobs get `source: 'ai-feed'` and skills are extracted + stored
- Visual indicator (badge) on jobs from the AI feed

**5. Frontend — Skills Insights page (`/skills-insights`)**

- New route and sidebar entry under "Discover" group
- **Top Skills widget**: Horizontal bar chart showing top 15 skills ranked by frequency across all tracked job descriptions
- **Skills Trend widget**: Line chart with time on X-axis, showing how the top 5 skills' frequency changes over weekly/monthly buckets
- Uses `recharts` (already available via `chart.tsx`)
- Data sourced from `job_skills_snapshots` table
- Date range filter (last 30/60/90 days)

**6. Sidebar update**

Add "Skills Insights" under Discover group with a `TrendingUp` icon.

**7. Auto-extract skills on job add**

In `jobTrackerStore.ts`, after `addJob` succeeds, call `extract-job-skills` if the job has a description, and insert the result into `job_skills_snapshots`.

### Files Changed/Created

| File | Action |
|------|--------|
| `supabase/migrations/...` | New table + jobs source column |
| `supabase/functions/ai-pm-role-feed/index.ts` | New edge function |
| `supabase/functions/extract-job-skills/index.ts` | New edge function |
| `src/pages/SkillsInsights.tsx` | New page with charts |
| `src/pages/Jobs.tsx` | Add AI PM feed tab |
| `src/pages/Index.tsx` | Add route for /skills-insights |
| `src/components/AppSidebar.tsx` | Add Skills Insights nav item |
| `src/stores/jobTrackerStore.ts` | Auto-extract skills on job add, fetch snapshots |
| `src/types/jobTracker.ts` | Add `source` to Job type, add SkillsSnapshot type |


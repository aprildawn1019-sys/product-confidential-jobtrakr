

## Plan: Enhanced Skills Insights for Resume/LinkedIn Optimization

### Problem
Skills Insights currently only captures data from manually added jobs (via `addJob`). It misses bulk uploads, job search results, and updated descriptions. The visualizations show frequency but don't help users translate insights into actionable resume/LinkedIn keywords.

### Enhancements

**1. Broaden Data Coverage**

- **Backfill button**: Add a "Refresh All Skills" button on the Skills Insights page that scans all jobs with descriptions but no existing snapshot, and runs `extract-job-skills` for each (batched, with progress indicator).
- **Bulk upload extraction**: After `addJobsBulk` completes, fire off skill extraction for jobs that have descriptions (queued sequentially to avoid rate limits).
- **Job search results**: When AI Job Search or AI PM Feed results are displayed, extract skills from those descriptions too and save snapshots (even before the user adds them to the tracker), tagged with a `source` to distinguish market data from tracked jobs.

**2. Skill Gap Analysis Card**

- Compare the top extracted skills against the user's profile skills (from `job_search_profile.skills`).
- Display a two-column view: "You Have" (skills in your profile that match demand) and "Skills Gap" (high-demand skills missing from your profile).
- Color-code by frequency -- skills appearing in 50%+ of jobs get a "critical" badge.

**3. Copyable Keyword Snippets**

- Add a "Resume Keywords" card that renders the top 10-20 skills as a comma-separated string with a one-click copy button.
- Add a "LinkedIn Headline Builder" card that generates a suggested headline snippet like "Product Manager | AI/ML | Cross-functional Leadership | Data-Driven" based on top skills, with a copy button.

**4. Filter by Source/Company**

- Add filter controls to scope insights by: all jobs, tracked jobs only, search results only, or a specific company.
- This lets users tailor keywords to a specific company's job language when targeting that employer.

**5. Database Change**

- Add a `source` column to `job_skills_snapshots` (nullable text, default `'tracked'`) to distinguish where skills came from (`'tracked'`, `'search'`, `'feed'`).

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/` | Migration | Add `source` column to `job_skills_snapshots` |
| `src/pages/SkillsInsights.tsx` | Modify | Add Skill Gap card, Resume Keywords card, LinkedIn Headline card, source filter, backfill button |
| `src/stores/jobTrackerStore.ts` | Modify | Add skill extraction to `addJobsBulk`; expose backfill function |
| `src/pages/JobSearch.tsx` | Modify | Extract skills from search results and save with `source: 'search'` |
| `src/pages/Jobs.tsx` | Modify | Tag AI PM Feed skill snapshots with `source: 'feed'` |

### UI Layout (Skills Insights page)

```text
┌─────────────────────────────────────────────┐
│ Skills Insights          [Source ▾] [Range ▾] [Refresh All Skills] │
│ Analyze skills across N job descriptions    │
├─────────────────────────────────────────────┤
│ ┌─── Resume Keywords ──────────────────────┐│
│ │ Product Management, AI/ML, Stakeholder   ││
│ │ Management, Data Analysis, Agile...  [📋]││
│ └──────────────────────────────────────────┘│
│ ┌─── LinkedIn Headline ────────────────────┐│
│ │ Product Manager | AI/ML | Cross-func... [📋]│
│ └──────────────────────────────────────────┘│
│ ┌─── Skill Gap Analysis ──────────────────┐│
│ │ ✅ You Have: PM, Agile, SQL             ││
│ │ ⚠️ Gap: Machine Learning, Python, DBT   ││
│ └──────────────────────────────────────────┘│
│ ┌─── Top Skills in Demand (bar chart) ────┐│
│ └──────────────────────────────────────────┘│
│ ┌─── Skills Trend Over Time (line chart) ─┐│
│ └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```


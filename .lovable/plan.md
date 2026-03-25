

## Plan: Add Contact Linking, LinkedIn Auto-populate, Fit Rating & Urgency to Jobs

### What's Changing

**1. Database: Add `fit_score` and `urgency` columns to `jobs` table**
- `fit_score` (integer, nullable) — 1-5 star rating for how well the job fits
- `urgency` (text, nullable, default null) — values: `low`, `medium`, `high`, `critical`

**2. Add Job Dialog: Contact selection + LinkedIn auto-populate**
- Add a "Contact / Recruiter" section to `AddJobDialog` with:
  - A dropdown to select an existing contact from the user's contact list
  - OR a LinkedIn URL input field with a "Fetch" button that scrapes the LinkedIn profile page via the existing `scrape-job` edge function pattern (new `scrape-linkedin` edge function) to auto-fill poster name, role, company
  - Manual fields for poster name, email, phone, role (pre-filled if LinkedIn fetch succeeds)
- On submit, the poster fields are saved to the job, and if a contact was selected, it's automatically linked via `job_contacts`

**3. New Edge Function: `scrape-linkedin`**
- Accepts a LinkedIn profile URL
- Fetches the public page HTML, strips scripts/styles
- Uses Lovable AI (gemini-3-flash-preview) to extract: name, headline/role, company, profile URL
- Returns structured data to auto-fill the contact/poster fields
- Note: LinkedIn public profiles have limited data; this works best for `/in/username` URLs

**4. Job Tiles: Fit Score & Urgency indicators**
- **List view** (`Jobs.tsx`): Add a star rating (1-5 clickable stars) and an urgency badge (color-coded: green/yellow/orange/red) to each job card row
- **Kanban view** (`JobKanban.tsx`): Add compact star dots and urgency indicator to each card
- **Detail panel** (`JobDetailPanel.tsx`): Add fit score and urgency to the editable job details section
- All changes persist via `updateJob` → `jobs` table

**5. Types & Store updates**
- Add `fitScore?: number` and `urgency?: string` to the `Job` type
- Update `mapJob`, `addJob`, and `updateJob` in the store to handle the new fields

### Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/migrations/...` | Add `fit_score` and `urgency` columns to `jobs` |
| `supabase/functions/scrape-linkedin/index.ts` | New edge function for LinkedIn profile extraction |
| `src/types/jobTracker.ts` | Add `fitScore`, `urgency` to `Job` |
| `src/stores/jobTrackerStore.ts` | Map + persist new fields |
| `src/components/AddJobDialog.tsx` | Add contact picker, LinkedIn URL fetch, poster fields |
| `src/pages/Jobs.tsx` | Add star rating + urgency badge to list tiles |
| `src/components/JobKanban.tsx` | Add compact fit/urgency indicators to kanban cards |
| `src/components/JobDetailPanel.tsx` | Add fit/urgency to editable details |

### Technical Details

- **LinkedIn scraping**: The edge function fetches the public HTML and uses AI extraction, same pattern as `scrape-job`. LinkedIn may block some requests; the function will gracefully handle failures.
- **Fit score UI**: 5 clickable star icons (filled/unfilled), clickable directly on the tile without expanding. Uses `Star` from lucide-react.
- **Urgency UI**: A small colored badge (`low`=green, `medium`=yellow, `high`=orange, `critical`=red) with a dropdown to change it inline.
- **AddJobDialog** passes `contacts` as a new prop so the user can pick an existing contact or enter new poster info. After job creation, if an existing contact is selected, `linkContactToJob` is called.


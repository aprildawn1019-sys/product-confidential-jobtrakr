
## Goal
Detect duplicate companies in the user's data, alert them, and offer a guided merge flow with a preview of the post-merge record for approval.

## Scope question
"Companies" appear in two places:
- `target_companies` table — explicit company records (name, website, industry, priority, status, notes, etc.)
- `jobs.company` and `contacts.company` — free-text strings referencing companies

The most actionable surface is **`target_companies`** (real records with structured fields to merge). Jobs/contacts referencing the merged names should be re-pointed to the surviving company name so the Network Map and Target Companies pages stay consistent.

## Where it lives
- New surface on `src/pages/TargetCompanies.tsx` — a dismissible **alert banner** at the top when duplicates are detected, plus a "Review duplicates" button that opens a merge dialog.
- New component `src/components/targetcompanies/DuplicateCompaniesDialog.tsx` — lists duplicate clusters and runs the merge flow.
- New component `src/components/targetcompanies/MergePreviewDialog.tsx` — shows the post-merge record for user approval (field-by-field, editable).
- Detection helper `src/components/targetcompanies/duplicateDetection.ts` — pure function to cluster duplicates.

## Detection logic
Use the existing `companiesMatch` helper pattern from `src/stores/jobTrackerStore.ts` (already used elsewhere) to keep behavior consistent. Cluster `target_companies` by normalized name:
- Lowercase, strip punctuation, strip common suffixes (Inc, LLC, Ltd, Corp, Co, GmbH)
- Collapse whitespace
- Companies with the same normalized key form a cluster
- Optional secondary signal: same domain extracted from `website` field

Result: array of clusters where `cluster.length >= 2`.

## UX flow
1. On `TargetCompanies` page load, run detection on `targetCompanies` array.
2. If clusters exist, show an amber alert banner: *"3 potential duplicate companies detected"* with a **Review** button.
3. Clicking Review opens **DuplicateCompaniesDialog** listing each cluster with its members (name, priority, status, # jobs, # contacts, created date).
4. User picks a cluster and clicks **Merge** → opens **MergePreviewDialog**.
5. Merge preview shows:
   - A "primary record" selector (defaults to the oldest or highest-priority entry)
   - Each field side-by-side from all duplicates with the chosen value highlighted; user can override per field
   - Counts of jobs and contacts that will be re-linked
   - Notes are concatenated (deduplicated)
6. User clicks **Confirm merge**:
   - Update primary `target_companies` row with merged values
   - Update `jobs.company` and `contacts.company` rows whose company name matches any of the duplicate names → rename to primary name
   - Delete the other `target_companies` rows
   - Refresh data, toast success

## Store changes (`src/stores/jobTrackerStore.ts`)
Add a single `mergeTargetCompanies(primaryId, duplicateIds, mergedFields, renameMap)` function that:
- Updates the primary row
- Bulk updates `jobs` rows where `company` is in the duplicate name list → set to primary name
- Bulk updates `contacts` rows similarly
- Deletes the duplicate `target_companies` rows
- Refetches affected slices

All operations are scoped by `user_id = auth.uid()` (existing RLS handles this).

## Technical notes
- No schema changes needed — all merges are data-only updates on existing tables.
- No new edge functions; runs entirely client-side against Supabase.
- Detection is memoized with `useMemo` on `targetCompanies` so it re-runs cheaply.
- Banner is dismissible via local state for the session (not persisted) so users aren't nagged after acknowledgment but it returns next visit until merged.
- Match-scoring constraint is unrelated; no AI used for detection (rule-based normalization only), consistent with project preferences.

## Files to create / change
- `src/components/targetcompanies/duplicateDetection.ts` (new)
- `src/components/targetcompanies/DuplicateCompaniesDialog.tsx` (new)
- `src/components/targetcompanies/MergePreviewDialog.tsx` (new)
- `src/pages/TargetCompanies.tsx` (add banner + dialog wiring)
- `src/stores/jobTrackerStore.ts` (add `mergeTargetCompanies`)

## Out of scope (can follow up)
- Detecting duplicate contacts or jobs (same approach could apply later)
- Auto-merging without preview
- Fuzzy matching beyond normalization (e.g., Levenshtein) — can add if name-normalization misses cases the user cares about

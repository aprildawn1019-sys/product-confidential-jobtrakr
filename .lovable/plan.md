

# Inferred Network Feature

## Overview
Add an "Inferred Network" section to the Contacts page that automatically surfaces potential connections between contacts based on shared **company** or **linked jobs** (not campaigns, per your correction).

## How it works

Two inference rules:
1. **Same company** — contacts whose company names fuzzy-match (reuses existing `companiesMatch` utility)
2. **Shared job link** — contacts who are both linked to the same job via `job_contacts`

The feature computes these inferences client-side from data already in the store (no new DB tables or backend changes needed).

## Changes

### 1. New component: `src/components/InferredNetwork.tsx`
- Accepts `contacts`, `jobContacts`, `jobs`, `contactConnections`, and action callbacks as props
- Computes inferred pairs:
  - For each pair of contacts, check if they share a company (`companiesMatch`) or are both linked to the same job
  - Exclude pairs that already have an explicit `contact_connections` entry
- Renders a card/list of suggested connections, each showing:
  - Both contact names, companies, roles
  - Reason pill: "Same Company" or "Linked to [Job Title]"
  - "Connect" button → calls `onAddConnection(id1, id2, "inferred")`
  - "Dismiss" button → hides the suggestion (local state only, no DB)
- Empty state when no suggestions exist

### 2. Update `src/pages/Contacts.tsx`
- Import and render `InferredNetwork` above or below the contact list, toggled via a collapsible section or always-visible panel
- Pass required props from the existing `ContactsProps`

### 3. Update `src/stores/jobTrackerStore.ts`
- Export `companiesMatch` so the inference component can reuse it
- Expose `jobContacts` array in the store return (it's already in state but need to verify it's returned)

### 4. Update `src/pages/Index.tsx`
- Pass `jobContacts` and `contactConnections` to the Contacts route if not already available

## No database or migration changes required
All inference is computed client-side from existing data.


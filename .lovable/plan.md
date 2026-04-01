

# Add Job CRM Quick-Nav Dropdown to Sidebar

## Overview
Add a collapsible sub-menu under "Job Postings" in the sidebar that lists all tracked jobs as direct links to their CRM pages (`/jobs/:id`). This mirrors the Salesforce pattern where the list view shows opportunities and each item links to its detail page.

## Approach

The sidebar currently uses static config and has no access to job data. We need to:

1. **Pass jobs to AppSidebar** — update `Index.tsx` to pass `store.jobs` as a prop to `AppSidebar`.

2. **Add expandable sub-list under "Job Postings"** — in `AppSidebar.tsx`:
   - Accept a `jobs` prop (array of `{ id, title, company }`)
   - After the "Job Postings" NavLink, render a collapsible chevron toggle
   - When expanded, show a scrollable list of jobs as NavLinks to `/jobs/{id}`
   - Each entry displays: company name + job title (truncated)
   - Highlight the active CRM page if the user is on `/jobs/:id`
   - Cap the visible list height with `max-h` and `overflow-y-auto` for long lists

3. **Visual design**:
   - The "Job Postings" link itself remains clickable and navigates to the full list
   - A small caret/chevron to the right of "Job Postings" toggles the sub-list
   - Sub-items are further indented (pl-9) with smaller text (text-xs)
   - Active CRM page gets the standard active styling

## Files changed

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Accept `jobs` prop, render expandable sub-list under Job Postings with links to `/jobs/:id` |
| `src/pages/Index.tsx` | Pass `store.jobs` to `<AppSidebar />` |

## Technical notes
- The "Job Postings" item is currently part of the static `groups` config. The rendering loop will special-case the `/jobs` route to inject the sub-menu.
- The sub-list auto-opens when the user is on a `/jobs/:id` route.
- No new database tables or backend changes needed.




# Fix Kanban Detail View Layout

## Problem
The `JobDetailPanel` uses `grid-cols-2 md:grid-cols-4` for the job details grid (line 189). Inside a 272px-wide Kanban card, the `md:` breakpoint never triggers and even 2 columns is too cramped, causing overlapping text for Location, Applied, Stage Updated, and Type/Salary fields.

## Fix

### `src/components/JobDetailPanel.tsx`
- Change the read-only details grid (line 189) from `grid-cols-2 md:grid-cols-4` to `grid-cols-1 sm:grid-cols-2` so it stacks to a single column in narrow containers like Kanban cards
- Change the edit-mode grid (line 146) from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` for the same reason
- Change the interview schedule grid (line 59) from `grid-cols-3` to `grid-cols-1 sm:grid-cols-3`
- Change the recruiter edit grid (line 239) from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`

These grids are rendered inside the Kanban card which is always narrow, so container-aware single-column defaults ensure readability. On wider contexts (e.g., if the panel is ever used in a larger container), `sm:` breakpoints restore multi-column layout.


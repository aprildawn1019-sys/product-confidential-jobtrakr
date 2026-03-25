

## Sidebar Reorganization — Grouped by Workflow

Replace the flat navigation list with task-based groups separated by section headers.

### Proposed Structure

```text
──────────────────────────
  JobTrackr
──────────────────────────
  Dashboard
──────────────────────────
  DISCOVER
    AI Job Search
    Job Boards
    Search Profile
    Recommendations
──────────────────────────
  TRACK & APPLY
    Job Postings
    Applications
    Interviews
──────────────────────────
  NETWORKING
    Connections
──────────────────────────
  Sign Out
──────────────────────────
```

**Rationale:**
- **Dashboard** — top-level overview, always first
- **Discover** — finding jobs: AI search, boards, profile, recommendations
- **Track & Apply** — pipeline progression: postings → applications → interviews
- **Networking** — relationship management

### Technical Changes

**Single file: `src/components/AppSidebar.tsx`**
- Replace flat `links` array with a grouped structure: `{ label: string; items: { to, icon, label }[] }[]`
- Render Dashboard link separately above groups
- Each group gets an uppercase section label (`text-xs text-sidebar-muted uppercase tracking-wider px-3 pt-4 pb-1`)
- Nav items render identically to current implementation within each group
- No routing, page, or store changes needed


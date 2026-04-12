

# Network Map — Updated Plan with Interactivity Details

## Summary

Build an interactive Network Map page with a relationship taxonomy, rich node/edge interactions, contextual tooltips, click-to-focus navigation, and deep links to existing app pages.

---

## Database Changes

**Two new columns (migration):**
- `contacts.network_role TEXT` — taxonomy value: referral_source, hiring_manager, advocate, recruiter, peer, mentor, cold_lead
- `contact_connections.relationship_label TEXT` — edge label: introduced_by, referred_to, works_with, reports_to, former_colleague

---

## Node & Edge Interactivity

### Hover Tooltips

| Node Type | Tooltip Content |
|---|---|
| **Contact** | Name, company, network role, warmth badge, last contacted date, pending referral status |
| **Company** | Name, target priority (dream/strong/interested), number of linked contacts, number of open roles |
| **Job** | Title, company, status, fit score, applied date |

| Edge Type | Tooltip Content |
|---|---|
| **Knows** | Relationship label (e.g. "Introduced by"), connection date |
| **Works at** | Contact's role at that company |
| **Linked to job** | How they're connected (referral, hiring manager, recruiter) |
| **Referral path** | Recommendation status (pending/received/declined) |

Tooltips appear on hover with a 200ms delay, dismiss on mouse-out. Implemented using a custom React Flow tooltip layer (not Radix tooltips, which conflict with the canvas).

### Click Interactions

**Single-click a node:**
1. **Focus the graph** — Re-layouts to center the clicked node, highlights its 2-hop neighborhood, dims everything else
2. **Opens detail panel** — Right-side panel showing full details and actions:
   - Contact: engagement history, linked jobs, connections, quick actions (log activity, set follow-up, request referral, change network role)
   - Company: linked contacts, open roles, target status
   - Job: status, fit score, linked contacts, recruiter info

**Single-click an edge:**
- Highlights the edge and both connected nodes
- Shows edge tooltip persistently until dismissed

**Double-click a node — Deep link to app page:**

| Node Type | Navigates To |
|---|---|
| Contact | `/contacts` with that contact expanded (via URL param `?highlight=<id>`) |
| Company (target) | `/target-companies` with company highlighted |
| Job | `/job-crm/<jobId>` — the full CRM detail page |

**Click empty canvas:** Resets focus, clears filters, shows full graph.

### Keyboard & Canvas Controls

- **Escape** — Close detail panel, reset focus
- **Scroll** — Zoom in/out
- **Drag canvas** — Pan
- **Drag node** — Reposition (position persists during session)

### Filter-Driven Reorientation

When a filter is changed (company, warmth, network role, referral status), the graph smoothly animates to a new layout showing only matching nodes and their connections. Unmatched nodes fade to 10% opacity rather than disappearing, preserving spatial context.

---

## New Files

1. `src/pages/NetworkMap.tsx` — Page with filters, React Flow canvas, detail panel
2. `src/components/network/useNetworkGraph.ts` — Data → nodes/edges with dagre layout
3. `src/components/network/ContactNode.tsx` — Custom node with warmth color, role badge
4. `src/components/network/CompanyNode.tsx` — Target priority border styling
5. `src/components/network/JobNode.tsx` — Status-colored diamond
6. `src/components/network/NetworkDetailPanel.tsx` — Side panel with engagement history and actions
7. `src/components/network/NetworkFilters.tsx` — Filter bar
8. `src/components/network/NetworkTooltip.tsx` — Canvas-aware tooltip component

## Modified Files

1. `src/types/jobTracker.ts` — Add `networkRole`, `relationshipLabel` fields
2. `src/stores/jobTrackerStore.ts` — Map and persist new fields
3. `src/components/AddContactDialog.tsx` — Network role selector
4. `src/pages/Contacts.tsx` — Network role badge and filter
5. `src/pages/Index.tsx` — Add `/network-map` route
6. `src/components/AppSidebar.tsx` — Add sidebar link

## Dependencies

- `@xyflow/react` (React Flow v12)
- `dagre` (auto-layout)

## Implementation Order

1. Database migration
2. Install dependencies
3. Update types and store
4. Build custom nodes with tooltip support
5. Build useNetworkGraph hook
6. Build NetworkMap page with filters, click handlers, and detail panel
7. Wire deep-link navigation (double-click → app pages)
8. Add routing and sidebar entry
9. Update AddContactDialog and Contacts page


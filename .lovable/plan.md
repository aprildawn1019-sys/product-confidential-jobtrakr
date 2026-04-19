
## Connections views — overlap evaluation

The "Connections" surface currently exposes **5 distinct views** of the same underlying contact list. Most overlap heavily.

### What exists today

**On `/contacts` (Connections page) — 4 view modes via toggle:**
1. **Grid** (default) — card layout, 3 columns. Avatar + name + warmth + key badges. Best for *browsing*.
2. **Compact list** — 1-line row per contact (name, role, company, warmth, badges). Best for *scanning many contacts*.
3. **Detailed list** — multi-line row with email/phone/LinkedIn inline + every badge type (campaigns, same-org, jobs, connections, activities, recs). Best for *triage with full context*.
4. **Spreadsheet** — `ContactsSpreadsheet` component: sortable columns, inline editing, bulk warmth/campaign/delete actions. Best for *data cleanup and bulk ops*.

**On `/network-map` — 1 view:**
5. **Network Map** — xyflow graph: contacts clustered by company, with company + job nodes and connection edges. Best for *seeing relationships visually*.

### Overlap analysis

| View | Unique value | Overlaps with |
|------|--------------|---------------|
| Grid | Visual browsing, "showcase" feel | Compact (same data, denser) |
| **Compact list** | Fast scanning | Grid (same fields) AND Detailed (subset) AND Spreadsheet (subset, no editing) |
| Detailed list | All badges + inline contact methods | Grid + Compact (superset of both) — but expanding any card already shows this |
| **Spreadsheet** | Inline editing, sorting, **bulk actions** (only place to bulk-update warmth, add/remove campaigns, bulk delete) | None — uniquely capable |
| Network Map | Visual relationships, clustering | None — completely different mental model |

### Recommendation: collapse 4 → 2

**Keep:**
- **Cards** (rename Grid → Cards) — the default browsing experience.
- **Spreadsheet** — uniquely owns inline editing + bulk actions.
- **Network Map** — separate page, separate value.

**Remove:**
- **Compact list** — fully redundant with Grid (same fields, just denser; users who want density can use Spreadsheet).
- **Detailed list** — the expand-card affordance on the Grid view already reveals every badge and field shown here. Detailed = "everything always expanded", which is noise for most workflows.

### Why this works
- Removes 2 toggle buttons from a crowded toolbar.
- The 3 remaining surfaces map to **3 distinct intents**: browse (Cards), edit/bulk (Spreadsheet), explore relationships (Network Map).
- No data or capability is lost — Detailed view's content is reachable via Card expansion; Compact's density is reachable via Spreadsheet.

### Files to change (implementation pass)
- `src/pages/Contacts.tsx`:
  - Narrow `viewMode` type to `"grid" | "spreadsheet"`.
  - Remove the `Compact` and `Detailed` toggle buttons from the toolbar (lines ~750-754).
  - Delete `renderCompactRow` and `renderDetailedRow` functions and their imports (`List`, `LayoutList` icons).
  - Simplify the bottom render branch: just Cards or Spreadsheet.
  - Persist remaining viewMode preference (already in component state — fine to leave).
- No DB or routing changes. No memory updates needed (no rules currently lock these views in).

### Open question
One judgment call worth confirming before I implement: **rename "Grid" to "Cards"** in the tooltip, or keep "Grid"? I'll default to **Cards** since it's clearer, but flag it now in case you prefer Grid.


The user is asking for UX recommendations on where the Reports functionality should live in the app. Currently it's a standalone page (`src/pages/Reports.tsx`) reached via the sidebar — let me think about whether that's the right home and what alternatives or additions make sense.

Looking at what Reports does today: bulk CSV exports of Jobs, Contacts, Interviews. It's purely an export utility, not analytics/visualization.

UX principles to apply:
- **Proximity**: export should live near the data being exported (users think "I want to export *these* contacts" not "I want to go to Reports")
- **Discoverability**: a dedicated page is discoverable but rarely visited — exports often get forgotten in standalone pages
- **Context preservation**: exporting filtered/sorted data is more valuable than exporting everything
- **Progressive disclosure**: bulk "export everything" is a power-user need; per-list export is the common case

## Proposal

Three complementary surfaces, in priority order:

**1. Inline on each list page (primary)** — highest value
- **Jobs page**: "Export CSV" item in the existing toolbar/overflow menu, exports the *currently filtered* list
- **Contacts page**: same pattern, plus respects the new spreadsheet view's sort
- **Interviews page**: same pattern
- Why: matches user intent ("export what I'm looking at"), respects filters, zero navigation cost

**2. Settings → Data & Export (secondary)** — for full backups
- Move the current "export everything" page under a Settings section as "Data & Export"
- Group with future destructive/admin actions (delete account, import, backup)
- Why: bulk dumps are an admin/backup task, not a daily workflow — Settings is where users expect them

**3. Keep a lightweight Reports entry only if analytics are coming** 
- If Reports will eventually host charts/insights (pipeline velocity, response rates, time-to-offer), keep the sidebar entry and rename today's CSVs to a "Download data" subsection on that page
- If Reports stays export-only, **remove the sidebar item** — it's prime navigation real estate spent on a rarely-used utility

## Recommendation

Do **#1 + #2** now, decide #3 based on the analytics roadmap. Net effect: exports become discoverable in-context, the sidebar slot is freed for something used daily, and power users still have a single backup screen.

### Sidebar impact
```text
Before:                    After:
- Dashboard                - Dashboard
- Jobs                     - Jobs              [+ Export menu]
- Contacts                 - Contacts          [+ Export menu]
- Interviews               - Interviews        [+ Export menu]
- ...                      - ...
- Reports          ←remove - Settings
                             └ Data & Export   ←moved here
```

### Open question
Whether to keep a Reports nav item depends on whether you plan to add analytics dashboards (funnel conversion, response rates, etc.) on top of pure CSV export. That decision shapes #3.

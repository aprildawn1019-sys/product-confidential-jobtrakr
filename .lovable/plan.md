
The user wants a spreadsheet view of contacts/connections with bulk edit, sorting, and the new columns (campaign, company, target company). Edits cascade to linked data.

Let me think about scope:

1. **New view mode**: Add a fourth view mode "spreadsheet" to existing toggle (grid/compact/detailed → + spreadsheet)
2. **Spreadsheet UI**: Editable table with rows = contacts, columns = key fields
3. **Columns to include**:
   - Name
   - Company
   - Role
   - Email
   - Phone
   - LinkedIn
   - Warmth
   - Campaign(s) — multi-select
   - Target Company — read-only indicator (derived from company match)
   - Follow-up date
4. **Functionality**:
   - **Inline editing**: click cell → edit → save on blur/enter (calls `onUpdate`)
   - **Sorting**: click column header to sort asc/desc
   - **Bulk edit**: row selection with checkboxes, "Apply to selected" panel for warmth, campaign add/remove, delete
5. **Cascade**: Since contact data is the source of truth (jobs/network/target-company-match all derive from `contact.company` and `contact.id`), updating the contact via `onUpdate` already cascades. Campaign toggling uses `onToggleContactCampaign`.

**Approach**: Build a new component `src/components/ContactsSpreadsheet.tsx` to keep `Contacts.tsx` from growing further. Add it as a fourth view mode in the existing view switcher.

Don't need a custom grid library — a styled `<table>` with `<input>` cells is sufficient and matches the existing design system. Keep it lean.

**Out of scope**: Resizable columns, copy/paste of cell ranges, undo/redo, CSV paste import (CSV upload already exists via BulkContactUploadDialog). I'll mention these as follow-ups.

## Plan

**New file:**
- `src/components/ContactsSpreadsheet.tsx` — table-based spreadsheet view

**Edit:**
- `src/pages/Contacts.tsx`:
  - Add `"spreadsheet"` to `viewMode` union
  - Add a 4th button to the view switcher (Sheet icon)
  - Render `<ContactsSpreadsheet>` when active
  - Pass through: `filteredContacts`, `campaigns`, `contactCampaigns`, `targetCompanies`, `getTargetCompanyMatch`, `getCampaignsForContact`, `onUpdate`, `onDelete`, `onToggleContactCampaign`

**Spreadsheet component features:**
- Sticky header row
- Sortable column headers (click to toggle asc/desc, indicator arrow)
- Row checkboxes + select-all in header
- Inline editable cells:
  - **Text fields** (name, company, role, email, phone, linkedin): `<Input>` that commits onBlur/Enter
  - **Warmth**: `<Select>` (cold/warm/hot/strong/none)
  - **Follow-up**: `<Input type="date">`
  - **Campaigns**: small popover with checkboxes (multi-select)
  - **Target Company**: read-only ⭐ badge (derived)
- Bulk action bar (appears when rows selected):
  - "Set warmth" select → applies to all
  - "Add to campaign" select → applies to all
  - "Remove from campaign" select → applies to all
  - "Delete selected" button (with confirm)
- Sorting works on top of existing filters from parent
- Horizontal scroll for narrow viewports

**Cascade behavior** — verified:
- `onUpdate(id, { company: "New" })` → updates contact row → `getTargetCompanyMatch(contact.company)` automatically reflects new match → `getNetworkMatchesForJob` automatically reflects new company on next render → Network Map re-renders.
- `onToggleContactCampaign` → updates `contact_campaigns` table → all places querying `getCampaignsForContact` reflect change.
- No additional cascade logic needed; existing store handlers already do the right thing.

**Out of scope for this iteration:**
- Cell range copy/paste, undo, frozen columns, column resize, CSV paste
- Editing target-company status from contact row (that requires renaming target_companies, separate concern)

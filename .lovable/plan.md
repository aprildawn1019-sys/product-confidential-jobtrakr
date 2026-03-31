

# Integrating Follow-Up Reminders into Scheduling & Networking Workflows

## Current State

Follow-up reminders live as a `followUpDate` field on contacts. They appear in two places:
- **Dashboard widget** — shows upcoming/overdue reminders with inline edit (calendar popover) and delete
- **Contacts page** — set/clear date per contact

The problem: reminders are isolated from the scheduling workflow (Interviews page) and the networking workflow (Connections page). They feel like an afterthought rather than part of the user's activity planning.

## Proposed Changes

### 1. Unified "Schedule" page — merge follow-ups into the Interviews/Calendar view

Currently the Interviews page only shows interview events. We'll expand it into a combined scheduling view that includes both interviews and contact follow-up reminders on the same timeline.

**Changes to `src/pages/Interviews.tsx`:**
- Accept `contacts` and `onUpdateContact` props
- Add a filter toggle: "All" / "Interviews" / "Follow-ups"
- Render follow-up reminders as timeline items alongside interviews, with distinct styling (different icon/color)
- Each follow-up item shows the contact name, company, warmth badge, and due date
- Allow inline reschedule (calendar popover) and dismiss (clear date) directly from this view
- Clicking a follow-up navigates to the contact on the Connections page

**Changes to `src/pages/Index.tsx`:**
- Pass `contacts` and `store.updateContact` to `InterviewsPage`

### 2. Dashboard follow-up widget — deep-link to the contact

**Changes to `src/pages/Dashboard.tsx`:**
- Clicking a follow-up contact name navigates to `/contacts` with a query param to auto-expand that contact (e.g., `/contacts?highlight=<contactId>`)
- "View all →" link changes to `/interviews?filter=followups` to show the unified schedule view

### 3. Contacts page — surface scheduling context

**Changes to `src/pages/Contacts.tsx`:**
- Support a `?highlight=<contactId>` query param that auto-expands and scrolls to the specified contact
- This enables the dashboard → contact deep-link flow

### 4. Sidebar label update

**Changes to `src/components/AppSidebar.tsx`:**
- Rename the Interviews nav item label from "Interviews" to "Schedule" to reflect it now houses both interviews and follow-ups

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Interviews.tsx` | Add follow-up reminders alongside interviews with filter toggle |
| `src/pages/Index.tsx` | Pass contacts + updateContact to InterviewsPage |
| `src/pages/Dashboard.tsx` | Deep-link follow-ups to contacts; link "View all" to schedule page |
| `src/pages/Contacts.tsx` | Support `?highlight=contactId` for auto-expand |
| `src/components/AppSidebar.tsx` | Rename "Interviews" to "Schedule" |

## No database changes required

The existing `follow_up_date` column on `contacts` and the `interviews` table are sufficient.


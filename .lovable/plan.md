

## Plan: CRM Features for Contacts + Bidirectional Job Linking

### What's Changing

**1. Database: New columns on `contacts` + new `contact_activities` table**

- Add to `contacts`: `relationship_warmth` (text: cold/warm/hot/champion), `follow_up_date` (text), `conversation_log` (text)
- Create `contact_activities` table to track touch history:
  - `id`, `user_id`, `contact_id`, `activity_type` (email/call/meeting/linkedin/coffee/other), `activity_date`, `notes`, `created_at`
  - RLS: users manage own rows
- On insert to `contact_activities`, use a DB trigger to auto-update `contacts.last_contacted_at` with the latest activity date

**2. Types & Store Updates**

- Add `relationshipWarmth`, `followUpDate`, `conversationLog` to `Contact` type
- Add `ContactActivity` type
- Add store functions: `updateContact`, `addContactActivity`, `deleteContactActivity`, `getActivitiesForContact`, `getJobsForContact` (uses `jobContacts` join)
- `deleteJob` auto-cleans `job_contacts` (already cascades via DB); store should also remove from local state
- `deleteContact` auto-cleans `job_contacts`; store should also remove from local state

**3. Contacts Page: CRM Enhancements**

In the expanded contact card, add:
- **Warmth badge** (color-coded: cold=blue, warm=yellow, hot=orange, champion=green) with inline dropdown to change
- **Follow-up reminder** with date picker; show overdue/upcoming indicator on the card
- **Activity timeline**: list of past touches with type badge + date + notes; button to log new activity (auto-updates last contacted)
- **Conversation log**: editable textarea for free-form notes
- **Linked jobs section**: show jobs linked via `job_contacts` with title, company, status badge; dropdown to link a new job; button to unlink
- **Contact editing**: inline edit for name, company, role, email, phone, linkedin fields

**4. Job Detail Panel: Show Linked Contacts**

Already shows linked contacts. No major changes needed -- the existing `linkedContacts` section already displays contacts with unlink capability.

**5. Cascading Deletes**

- When a job is deleted: `job_contacts` rows are cleaned from local state (DB has no FK cascade currently, so add cleanup in `deleteJob` store function)
- When a contact is deleted: `job_contacts` and `contact_activities` rows are cleaned from local state, and delete from DB

### Files to Create/Edit

| File | Action |
|------|--------|
| Migration | Add columns to `contacts`, create `contact_activities` table + trigger |
| `src/types/jobTracker.ts` | Add `ContactActivity` type, update `Contact` type |
| `src/stores/jobTrackerStore.ts` | Add CRUD for activities, `updateContact`, `getJobsForContact`, cascade cleanup |
| `src/pages/Contacts.tsx` | CRM UI: warmth, follow-up, activity log, conversation notes, linked jobs |
| `src/components/AddContactDialog.tsx` | Add warmth and notes fields |

### Technical Details

- **Warmth indicator**: Small colored badge with dropdown, similar pattern to `UrgencyBadge`
- **Follow-up date**: Shadcn date picker popover; card shows "Follow up in 3 days" or "Overdue by 2 days" relative text
- **Activity log**: Compact timeline in expanded card; "Log Touch" button opens inline form with type select + date + notes
- **DB trigger**: `AFTER INSERT ON contact_activities` updates `contacts.last_contacted_at = NEW.activity_date` when it's the most recent
- **Linked jobs in contact**: Query `jobContacts` filtered by `contactId`, map to job objects from store; show as clickable badges with status
- **Cascade on delete**: In store's `deleteContact`, also delete from `job_contacts` and `contact_activities` where `contact_id` matches. In `deleteJob`, also delete from `job_contacts` where `job_id` matches.


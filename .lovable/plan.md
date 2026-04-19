

## Use case 1 — Referral pipeline tracking (Keith Collier scenario)

You answered the data + tracking questions but flagged that the "where it lives" choice should wait until we've walked through more use cases. That's the right call — surface placement is a navigation/IA decision and needs the full picture. So this plan locks in the **mechanics** of the workflow and defers the **surface** to a later use case.

### The scenario, mapped to entities we already have

```text
Keith Collier (Contact, networkRole=referral_source, warmth=champion)
   │
   ├── contact_connection ──→ Sarah Chen (Contact @ Acme)
   ├── contact_connection ──→ Marcus Lee (Contact @ Stripe)
   └── contact_connection ──→ Priya Shah (Contact @ Linear)

Acme (target_company, priority=dream)
   └── job: "Senior PM" (status=applied) ──linked to──> Sarah Chen (job_contact)

recommendation_request:
   contact_id = Keith     ← he's the champion making the ask
   job_id     = Acme PM   ← (NEW field) what he's being asked about
   status     = asked     ← (EXPANDED enum)
```

Everything except two small schema tweaks already exists. The "Keith → Sarah → Acme → PM job" chain is just `contact_connections` + `job_contacts` joined together.

### Locked-in decisions

1. **Data model: existing `contact_connections`.** Keith → Sarah is a connection with a `relationship_label`. To capture "Keith says he knows people at Acme but I don't know who yet," we'll allow you to create a placeholder contact (name = "Someone at Acme", role = "Unknown") and upgrade it later when Keith names the person. No new table.

2. **Action tracking: extend `recommendation_requests`.**
   - Add `job_id uuid NULL` (the specific role being asked about) and `target_company_id uuid NULL` (asks scoped to a company before a specific job exists).
   - Expand `status` enum from `pending | received | declined` → `identified | asked | intro_made | referred | responded | declined`. Maps cleanly onto the natural pipeline stages.
   - Add `due_date text NULL` so each ask is a trackable next-step.

### How the workflow plays out (UX-agnostic — works on any surface we pick later)

Six concrete moments, each tied to a specific UI affordance we'll need to build *somewhere*:

1. **Mark Keith as a champion** — set `networkRole = referral_source` and `warmth = champion` on his contact (already exists, no work).

2. **Capture Keith's connections** — "Keith knows Sarah at Acme, Marcus at Stripe, Priya at Linear." The Network Map already lets you draw connections via drag-and-drop; we'll also need a faster bulk capture path (a "Who does Keith know?" list editor on his profile).

3. **See the opportunity surface** — given Keith's connections, automatically show: *Target companies where Keith has a foothold* (Acme, Stripe, Linear) and *open jobs you've saved at those companies* (Senior PM at Acme). This is a pure derived view — `contact_connections JOIN contacts ON company JOIN jobs` and `JOIN target_companies`.

4. **Create a referral ask** — one click on "Senior PM at Acme" inside Keith's view creates a `recommendation_request` with `contact_id=Keith`, `job_id=Acme-PM`, `status=identified`.

5. **Move it through the pipeline** — `identified → asked → intro_made → referred → responded`. Each transition logs a `contact_activity` and a `job_activity` automatically so the timeline shows up in both places (Keith's profile + the Job CRM page for the Acme PM role).

6. **See what's next across all champions** — the "outstanding asks" view (asked > 7 days ago, no response) tells you who to nudge. This is the queue/inbox shape.

### What gets built once we pick the surface

Once you've walked through the other use cases and we've decided where this lives, the actual UI components will be roughly:

- A **"Referral opportunities" panel** for a contact: their connections grouped by company, each company showing its target-company status and open jobs, each row having a "Request referral" action.
- A **referral ask pipeline view** (kanban or list, TBD) showing all `recommendation_requests` grouped by status with overdue indicators.
- **Network Map enhancement**: a "Highlight referral paths" toggle that dims everything except `champion → connection → company → job` chains, so the Keith-style view is visible on the graph too.
- **Job CRM page enhancement**: a "Referral path" section that says *"Keith Collier (champion) → Sarah Chen (PM at Acme) — ask pending since Mar 12."*

### Schema work (defer until surface is picked, but locked in)

```sql
-- Migration (NOT executed in this plan — just specified):
ALTER TABLE recommendation_requests
  ADD COLUMN job_id uuid NULL,
  ADD COLUMN target_company_id uuid NULL,
  ADD COLUMN due_date text NULL;

-- status remains text; we'll just start writing the new values
-- ('identified', 'asked', 'intro_made', 'referred', 'responded')
-- and update any UI that filters on the old set.
```

No constraint changes needed beyond `NOT NULL user_id` which is already in place.

### Why I'm not recommending a surface yet

The four candidates (per-contact tab / dedicated page / both / Network Map only) each get more or less compelling depending on use cases I haven't seen yet. For example:
- If a later use case is "I want a daily 'who to nudge today' view," the **dedicated page** wins.
- If it's "I'm prepping for a coffee chat with Keith and want everything about him on one screen," the **per-contact tab** wins.
- If it's mostly visual exploration, the **Network Map** enhancement is enough.

So: **share use case #2 next**, and after we have 2–3 of them on the table I'll recommend the surface that serves all of them coherently rather than building one feature per page.

### Open questions to revisit after more use cases

- Should "champion" be a first-class promoted relationship (with its own UI affordances everywhere) or just the existing `warmth=champion` + `networkRole=referral_source` combo?
- For asks scoped to a company before a job exists ("Keith, keep an eye out at Acme"), should those auto-promote into a job-scoped ask once you save a job there?
- Do you want notification/reminder behavior (e.g. "5 days since you asked Keith, nudge?") or is the existing follow-up date system enough?


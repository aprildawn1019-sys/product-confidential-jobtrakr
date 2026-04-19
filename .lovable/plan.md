

## Use case 4 — Network role taxonomy aligned to job-search workflow

You're proposing to **redefine the network role taxonomy** so it directly mirrors the funnel goal: get a **Booster** inside every target company. Today's roles (referral_source / hiring_manager / advocate / recruiter / peer / mentor / cold_lead) are descriptive but workflow-agnostic. The new taxonomy is **outcome-oriented**: each role names a specific function in the referral chain.

### The mental model

```text
Cold target company
   │
   │ no contacts yet → need to find a path in
   ▼
CONNECTOR  ───introduces───▶  BOOSTER (inside target co)
(outside, knows                     │
 someone there)                     │ refers / makes intro
                                    ▼
                              Hiring Manager / Recruiter
                                    │
                                    ▼
                                INTERVIEW

RECRUITER (parallel path)
  ├─ Internal: works for one company → effectively a Booster
  └─ External/agency: works across many companies → own lane
```

The taxonomy names the **job each contact does for you**, which makes communication templates, next-action suggestions, and pipeline progression all derivable from the role.

### Proposed roles (replaces current `NETWORK_ROLES`)

| Role | Emoji | Definition | Inside target co? | Primary action |
|------|-------|------------|-------------------|----------------|
| **Booster** | 🚀 | Inside the target company; will refer you or intro to hiring manager | Yes | "Ask for referral" |
| **Connector** | 🌉 | Outside target co but knows people inside; can intro you to a future Booster | No | "Ask who they know at [co]" |
| **Recruiter (internal)** | 🎯 | In-house recruiter at one company | Yes | "Submit for role" |
| **Recruiter (external)** | 🎲 | Agency/independent recruiter working across many companies | No (cross-co) | "Share search criteria" |
| **Hiring Manager** | 👔 | Direct decision-maker for a role | Yes | "Direct pitch" |
| **Mentor / Peer** | 🧭 | Advice/support, not transactional | N/A | "Periodic check-in" |

Six roles instead of seven. The funnel intent is explicit: **Connector → Booster → Hiring Manager** is the canonical path.

### Locked-in design decisions (proposing — confirm in next turn)

1. **Role is per-contact, not per-relationship.** A contact has one primary `network_role`. If Sarah is a Booster at Acme but a Connector for Stripe, you'd model that with `contact_connections` (Sarah ↔ someone at Stripe), not by giving her two roles. Keeps the taxonomy clean.

2. **"Champion" stays as `warmth`, not as a role.** A Booster who's eager and responsive = `warmth=champion + role=booster`. A lukewarm Booster who hasn't replied in weeks = `warmth=cold + role=booster`. The two axes (function vs. temperature) stay independent — both filter the Network Map and Command Center independently.

3. **Recruiter split (internal vs. external)** matters because the workflow diverges:
   - Internal recruiter behaves like a Booster (push for one role at one company).
   - External recruiter is cross-company (share your overall search profile, get matched to multiple roles).
   The split unlocks different action templates and different placements in the Command Center swimlanes.

4. **Migration strategy: map old → new, don't lose data.**
   ```text
   referral_source  → booster
   hiring_manager   → hiring_manager
   advocate         → connector (closest match)
   recruiter        → recruiter_external (default; user re-classifies internal ones)
   peer             → mentor_peer
   mentor           → mentor_peer
   cold_lead        → connector (with warmth=cold)
   ```
   No data loss. Users see a one-time "review your contact roles" prompt.

### Where this shows up in the UX (cross-page impact)

- **Add/Edit Contact**: role selector now shows the 6 new roles with one-line descriptions inline (so users learn the taxonomy as they pick).
- **Contact card / list / spreadsheet**: role badge uses the new emojis; filter dropdowns updated.
- **Network Map**: role emojis change on existing ContactNode; legend updated; new "Show paths" mode highlights Connector→Booster chains for any selected target company.
- **Target Companies page**: each company shows a role rollup ("2 Boosters, 1 Connector, 0 Recruiters") and the empty state CTA changes from generic "Find people" to **"Find a Connector or Booster for [Acme]"**.
- **Command Center (use case #3)**: role drives action templates. A Booster contact triggers "Ask Keith for referral to Acme PM role"; a Connector triggers "Ask Keith if he knows anyone at Acme"; an external Recruiter triggers "Share your updated profile with Keith."
- **Referral pipeline (use case #1)**: `recommendation_requests` semantics now read clearly — a request against a Booster is a referral ask; a request against a Connector is an introduction ask. We can show this distinction in the pipeline view.

### Communication adaptation (the use-case payoff)

Each role gets a **suggested outreach template** stub the user can copy/customize. Not auto-sent; just surfaced when you click a contact and the system knows the context (target company + role). Examples:

- **Connector** → "Hi [name], I'm exploring opportunities at [Acme]. I noticed you may know folks there — would you be open to making an intro to anyone in [function]?"
- **Booster** → "Hi [name], I just applied to [role] at [Acme]. Would you be willing to refer me internally?"
- **Recruiter (external)** → "Hi [name], updating you on my search — looking for [role types] in [locations]. Here's my latest resume."

Templates live in a small lookup (`src/lib/outreachTemplates.ts`). No AI required for v1; AI rewrite is a later enhancement.

### Schema work

```sql
-- Migration: no column changes needed. network_role is already text.
-- Just a data migration to remap existing values:
UPDATE public.contacts SET network_role = 'booster'
  WHERE network_role = 'referral_source';
UPDATE public.contacts SET network_role = 'connector'
  WHERE network_role IN ('advocate', 'cold_lead');
UPDATE public.contacts SET network_role = 'recruiter_external'
  WHERE network_role = 'recruiter';
UPDATE public.contacts SET network_role = 'mentor_peer'
  WHERE network_role IN ('peer', 'mentor');
-- hiring_manager unchanged.
```

The TypeScript `NetworkRole` union in `src/types/jobTracker.ts` and the `NETWORK_ROLES` constant get rewritten. Every consumer (AddContactDialog, ContactsSpreadsheet, NetworkFilters, ContactNode, NetworkDetailPanel, useNetworkGraph) gets updated in the same pass.

### What I need confirmed before building

1. **Recruiter split** — split into internal/external (richer workflow, 2 roles) or keep one `recruiter` role and just note internal-vs-external in a free-text field?
2. **Outreach templates** — ship in v1 (static text snippets per role, copy-to-clipboard) or defer to a later use case?
3. **Migration prompt** — show users a one-time "review your contact roles" banner after the role rename, or silently remap and let them discover changes?
4. **Build sequencing** — ship this taxonomy refactor **before** the Command Center build (use case #3 depends on roles for action templates), or bundle them?

### Suggested order

Taxonomy first (this use case) → Command Center (use case #3) → Use case #2 (target-company sourcing). Roles are foundational; everything downstream gets cleaner if we lock the taxonomy now.




## Use case #2 — "Find a Booster or Connector for [company]" on Target Companies

The funnel goal is simple: **every target company should eventually have a Booster inside it**. Right now the Target Companies page tells you *what* you want (a shortlist) but doesn't help you *how* to get there. This use case closes that gap.

### What the page tells us today

Each card shows job count, contact count, active applications, priority, status, industry, notes, and quick links to filtered Jobs/Contacts. What's **missing** is a *sourcing signal*: at a glance you can't tell whether a target is "covered" (you have an inside referral path) or "cold" (zero connections), and you can't act on the cold ones in one click.

### The mental model: Coverage state per target

Each target company falls into one of four sourcing states, derived from the contacts you already have:

| State | Meaning | Visual |
|---|---|---|
| 🚀 **Has Booster** | ≥1 contact at the company tagged `booster` | Green chip "Booster: [name]" |
| 🌉 **Connector available** | No Booster, but ≥1 `connector` who could intro you | Blue chip "Ask Connector" |
| 👀 **Recruiter only** | No Booster/Connector, but `recruiter_internal` exists | Amber chip "Recruiter contact" |
| ❄️ **Cold** | No relevant contacts | Grey chip "No inside path" + primary CTA |

This taxonomy is the natural payoff of the network role refactor we just shipped.

### Three additions to the Target Companies page

#### 1. Coverage badge on each card
A clickable chip that shows the company's funnel state at a glance. Click → opens the sourcing panel.

#### 2. Sourcing summary bar + Coverage filter
Above the grid: "**12 targets · 3 Boosters · 4 Connectors · 5 Cold**" — each segment clickable as a filter. New filter dropdown "Coverage" pairs with the existing Priority + Status filters.

#### 3. Sourcing panel (the core deliverable)

A right-side **Sheet** titled **"Find a Booster at [company]"** with:

- **Section A — Inside path**: existing Boosters with one-tap "Open outreach" using the role-aware templates we already have. If no Boosters but Connectors exist, surface the Connectors with an "Ask for intro to {company}" pre-filled template.
- **Section B — Recruiter contacts**: internal recruiters at the company (parallel path).
- **Section C — Sourcing actions** (always visible):
  1. **Search LinkedIn for "{company}" + your role** — opens LinkedIn people search in a new tab (deep link, no scraping)
  2. **Check who you already know** — fuzzy scans your *entire* contact list for substring mentions of the target company in `notes`/`conversation_log` — surfaces forgotten 2nd-degree Connectors
  3. **Add a contact at {company}** — opens the existing AddContactDialog with `company` and `networkRole=booster` pre-filled
  4. **Visit careers page** — deep link if `careersUrl` set
- **Section D — Coverage history**: "First contact added [date]" or "No contacts yet" — frames progress.

#### 4. Sort option: "Coverage gap"
Ranks Dream/Strong companies with no Booster to the top. The morning-routine view: "what targets need sourcing today?"

### Why a Sheet (not Dialog or new page)

- Dialog blocks the grid; you'd lose context across multiple companies
- A new page is overkill — sourcing is a 30-second action
- A right-side Sheet keeps the grid visible and supports rapid hopping between targets

### Data model — no migration needed

Everything derives from existing fields: `contacts.network_role` (already populated by the role refactor), `contacts.company` matched via existing `companiesMatch` fuzzy matcher, and substring scan of `notes`/`conversation_log` for 2nd-degree candidates. **No new tables or columns** — this is purely UX.

### File-level changes

- New `src/components/targetcompanies/CoverageBadge.tsx`
- New `src/components/targetcompanies/SourcingPanel.tsx`
- New `src/components/targetcompanies/coverageUtils.ts` — pure functions: `getCoverageState`, `findSecondDegreeMatches`, `buildLinkedInSearchUrl`
- Edit `src/pages/TargetCompanies.tsx` — summary bar, filter, coverage badge, "Find a Booster" button, sort option. **Already 356 lines — I'll extract the card into `TargetCompanyCard.tsx` while in there.**
- No changes to outreach templates, AddContactDialog, or store — reuse as-is

### Intentionally NOT in this pass

- ❌ AI-suggested Boosters from external data (LinkedIn scraping, Apollo) — your constraint says no third-party scraping; LinkedIn deep links are the right primitive
- ❌ Auto-creating Connector intros without user review — the whole point is the user judges who to approach
- ❌ A separate "Sourcing" page — Target Companies already implies this job; a new page fragments intent

### Things I want your call on

1. **Coverage chip placement on the card** — replace the current "X jobs · Y contacts" line, or **add a new line above it**? (My take: add above, keep the stats — they're useful context.)
2. **Sourcing panel surface** — right-side **Sheet** (my recommendation) or **Dialog** (more focused, blocks grid)?
3. **2nd-degree match scope** — search only `notes`+`conversation_log` text, or also include `linkedin` URL substring? Wider = more candidates but more noise.
4. **Default sort** — keep current (creation order), or default to **"Coverage gap"** so the morning view shows cold Dream/Strong companies first?


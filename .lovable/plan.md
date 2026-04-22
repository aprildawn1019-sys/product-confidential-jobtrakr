

# Refine "Next steps" — earn its place on the Command Center

## The question first: do we even need it?

**Yes — but the current execution under-sells it.** The Command Center's whole reason to exist is the next-action queue. Without it, the page is just stat tiles + an interview strip — a status board, not a command center. The header subtitle even reads "12 next steps · 3 overdue · 5 today", so removing the panel would make the header a lie.

What's wrong is not whether it exists, but that it's currently styled as a generic content card with a flat list of 6 mixed-urgency rows, an orphaned "Suggest" ghost button, and (post logo-fetch disable) a column of meaningless "T" / "F" initial chips that no longer carry signal.

## What to change

### 1. Promote it from "card" to "the focal area"

Drop the heavy `rounded-2xl border bg-card p-8` shell. Make it the visual anchor of the page:

- No bordered card — just generous vertical space with the section header.
- Section header: `Next steps` (display, semibold) + a one-line meta echo: `3 overdue · 5 today · 4 later`.
- Right side of the header: a compact **filter chip group** — `All · Today · Overdue · Networking · Applications · Referrals`. Replaces the orphaned ghost button as the primary affordance.

### 2. Group rows into time cohorts

Replace the flat 6-row list with three tight sections, each with its own micro-header:

```text
Overdue (3)
  ○  Follow up with Maya Chen           Stripe · 4d overdue
  ○  Nudge Daniel on referral ask       11 days since you asked
  ○  Apply or archive: Staff PM         Notion · saved 22d ago

Today (2)
  ○  Phone screen — Senior PM           Linear · 2:00 PM
  ○  Source a Connector for Vercel      Dream company · 0 contacts

Later this week (3)
  ○  Reconnect with Priya Shah          Warm · last touch 34d ago
  ○  …
```

- Cohort headers are quiet (`text-xs uppercase tracking-wide text-muted-foreground`).
- Each cohort caps at 3–4 rows; if more, "+N more in Today" inline link expands inline.
- Removes the `visibleCount=6 + View all` mechanism — cohorts naturally bound the height.

### 3. Replace meaningless initial chip with **lane glyph + accent dot**

The "T / F" initial chip post logo-fetch fix carries no information. Swap for a 28px square tile with a Lucide glyph keyed to `action.lane`:

- Networking → `Users` (slate)
- Referrals → `HandshakeIcon` (amber tint)
- Applications → `Briefcase` (navy tint)

Source-based override: AI suggestions get `Sparkles`, nudges get a small dot indicator. Same visual rhythm, but the leftmost column finally means something at a glance — you can scan the column and see "all networking work" without reading titles.

### 4. Fold the AI suggest action into the cohort scaffolding

Kill the lonely ghost button at the bottom-right. Replace with a single quiet row at the end of the list:

```text
✨  Suggest 3 more steps with AI            (clickable row)
```

Same component pattern as a regular row, prefixed with a Sparkles glyph. Loading state inlines a spinner. After fetch, AI rows interleave normally with a subtle `Sparkles` corner badge so users know which were machine-suggested.

### 5. Empty state that does a job

Today: "Inbox zero. Nice work." → dead end.

Replace with:

```text
✓  Nothing on your plate

   Plan your next move:
   → Add a target company       (link to /target-companies)
   → Log this week's outreach   (link to /contacts)
   → Ask AI for a fresh batch   (triggers fetchAi)
```

Three actionable links, not a dead-end congratulation.

### 6. Minor row-level polish

- Add a tiny tail meta on each row (right side, before checkbox): the `actionLabel` from the action engine ("Send a nudge", "Decide", "Prep & open"). It already exists in `DerivedAction.actionLabel` but isn't rendered on the row — it answers "what would I actually do?" before the user clicks.
- Keep the existing urgency chip but only render it inside the **Overdue** cohort (the cohort already implies today / soon). This removes chip noise from the Today and Later sections.
- Keep the circular checkbox + line-through completion. That part works.

## Files to touch

- `src/pages/Dashboard.tsx` — remove card shell around Next steps; pass filter state; remove ghost Suggest button.
- `src/components/commandcenter/NextStepsList.tsx` — group by urgency cohort, render filter chips header, render AI suggest row at end, new empty state.
- `src/components/commandcenter/NextStepRow.tsx` — replace `CompanyAvatar` with lane-glyph tile; render `actionLabel` tail; conditionally hide urgency chip outside Overdue.
- (No changes to `actionEngine.ts` or hooks — all data already present.)

## Out of scope (call out, defer)

- Drag-to-reorder priority — interesting but not in the spec, defer.
- Cohort persistence across sessions / "Snoozed" tab — defer.
- Any change to `UpcomingInterviewsStrip`, stat cards, or `Pipeline & sourcing signals` — those are working as designed.

## Memory updates after implementation

Update `mem://style/visual-theme-v2` Action rows section with:
- Lane-glyph tiles (not initial chips) on the leading column.
- Cohort grouping (Overdue / Today / Later) replaces flat list.
- `actionLabel` tail rendered before completion control.
- AI suggest is an inline list row, not a panel button.


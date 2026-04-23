

## Build "Pipeline by lane" — replace Response Rate by Lane on Insights

Replace the current placeholder panel with a single dense panel that shows **application mix vs. interview mix** side-by-side, with per-lane conversion rates as supporting detail. The insight lives in the **gap** between where effort goes and where interviews actually come from.

### Lane definitions (locked)

For each job in the selected window:

- **Referral** — the job has ≥1 linked contact (`job_contacts`) **AND** at least one of those contacts has a logged `contact_activity` dated **on or before** `applied_date`. Interpretation: someone at the company knew you were applying *before* you applied.
- **Warm** — the job has ≥1 linked contact, but no qualifying activity before `applied_date`. Interpretation: you have a connection there, but the apply was not actively championed (or outreach happened after).
- **Cold** — the job has zero linked contacts. Pure cold apply.

Numerator for "interview" = the job has ≥1 row in `interviews` (any status). We don't filter on interview outcome — the question is "did the apply convert to a real conversation."

A job must have a non-null `applied_date` to be counted at all. Jobs in `saved`/`tracking` status without an apply date are excluded — they're not yet "effort spent."

### What the panel shows

One card titled **"Pipeline by lane"** with subtitle *"Where your effort goes vs. where interviews come from."*

Three stacked elements inside:

**1. Two stacked horizontal bars (the headline visual)**
```
Applications (n=47)   [██ cold ████████ | ▓ warm ▓▓ | █ ref █]   72% · 19% · 9%
Interviews   (n=6)    [██ cold ██ | ▓ warm ▓▓ | █ ref ████████]   33% · 33% · 33%
```
- Same horizontal scale (0–100%), same color mapping, segments labeled with % when ≥8% wide.
- Lane colors: **Referral** = `--success` (green, "highest leverage"), **Warm** = `--info` (blue, "in motion"), **Cold** = `--text-tertiary` (neutral gray, "default channel"). This avoids reusing brand amber and keeps the chart calm.
- The bar with the bigger `n` shows total counts; both bars normalize to 100% width so mix is visually comparable.

**2. Conversion strip (supporting detail, below the bars)**
A row of three compact stat tiles:
```
Cold       Warm       Referral
3%         22%        50%
2 / 47     1 / 5      3 / 6
```
- Conversion rate = interviews-from-lane / applications-in-lane.
- Subline shows raw numerator/denominator so users can see when sample size is too thin to trust.
- If a lane has fewer than **5 applications** in the window, the rate renders as `—` with a "not enough data" caption — honest empty state instead of a misleading 0% or 100%.

**3. Window selector (top-right of card header)**
Small segmented control: `30d · 90d · All time`. Default to `90d`. Filters by `applied_date` within window for the denominator; interviews are counted if the underlying job's `applied_date` falls in the window (so the conversion math stays consistent — interviews and applications come from the same job set).

### Empty / sparse states

- **Zero applied jobs in window:** single muted line — *"No applications in the last 90 days. Switch to All time or log an apply date on tracked jobs."*
- **All three lanes < 5 apps:** still render bars, but all three conversion tiles show `—` with a caption *"Add more applications to unlock lane conversion."* Bars alone are still useful (they show mix).
- **One lane is empty:** that segment is omitted from both bars; conversion tile shows `0 / 0` and `—`.

### Files to touch

- `src/pages/Overview.tsx` — replace the entire "Response rate by lane" `<Card>` block (lines ~210–255) with the new panel. Remove the now-unused `responseRateData` memo, `LANE_COLORS`/`LANE_LABEL` constants, and the `BarChart`/`Bar`/`Cell` Recharts imports if they're not used elsewhere on the page (they aren't — `LineChart` is used for velocity, the bars were only here).
- Add a new memo `pipelineByLane` that computes `{ window, applications: { cold, warm, referral, total }, interviews: { cold, warm, referral, total }, conversion: { cold, warm, referral } }`.
- Add a new `useState` for the window selector (`'30d' | '90d' | 'all'`, default `'90d'`).
- Build the visual with **plain `<div>`s + Tailwind flex/width-percent**, not Recharts. Two thin stacked bars + a 3-tile strip is simpler, denser, and lighter than a Recharts chart at this size — and Recharts' stacked horizontal bars are clumsy for a 2-row dataset.
- Keep the `PlaceholderHint` helper available for the other panels (Time to first interview, Weekly velocity) which we'll review next — but **remove the `PlaceholderHint` from this panel**: the formula is now locked.

### What this is NOT

- Not a Recharts chart. Two bars and a 3-cell strip is plain DOM.
- Not three separate panels. Mix + conversion live in one frame so the gap is visible.
- Not a "response" metric. The numerator is **interview scheduled**, full stop.
- Not filtered by interview outcome. We're measuring conversion of effort to conversation, not offer rate.

### Out of scope for this turn

- The other two Insights panels (Time to first interview, Weekly velocity). Those come in subsequent turns once this one is approved.
- Any change to the data model or edge functions. This is pure presentation over existing `jobs`, `job_contacts`, `contact_activities`, `interviews`.


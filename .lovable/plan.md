
## Refresh the Profile Completeness banner

Refine the `ProfileCompletenessBanner` on `/getting-started` so it visually pops, uses the navy/amber palette intentionally, and makes the % ↔ progress bar relationship obvious.

### Visual changes (in `src/pages/GettingStarted.tsx`)

**1. Container — add depth and a clear hierarchy**
- Keep the warning/info tonal background but add a subtle gradient (`bg-gradient-to-br from-warning/15 via-card to-warning/5`) plus a thicker left accent border (`border-l-4 border-l-accent`) so the banner reads as an actionable callout, not a passive note.
- Slightly bump shadow (`shadow-md`) and rounded corners stay at `rounded-[1.75rem]`.

**2. Icon tile — stronger amber emphasis**
- Use the brand accent (amber) for the icon tile when the profile is incomplete: `bg-accent/15 text-accent-foreground border border-accent/30`. This pulls the eye to the call-to-action immediately.

**3. Title & percentage — make the % the hero**
- Restructure the header so the percentage is its own large, bold display element next to the title:
  - Big number (e.g. `text-3xl font-display font-bold text-accent-foreground`) reading "60%"
  - Smaller label underneath: "complete"
  - Title moves to the right of the % block.
- This makes the link between the displayed % and the progress bar visually direct.

**4. Progress bar — clearer % ↔ fill mapping**
Replace the default `Progress` with a custom inline implementation so we can:
- Use the **amber/accent color** for the filled portion (`bg-accent`) on a navy-tinted track (`bg-primary/10`), matching the brand palette.
- Make the bar taller (`h-3`) with rounded ends.
- Add **5 segment dividers** (one per profile field) as thin vertical lines across the track so users see "filled 3 of 5 segments = 60%".
- Show the percentage label sitting directly above the right edge of the filled portion (a small floating badge that moves with progress), reinforcing that the % corresponds to the bar fill.
- Add tick labels under the bar: `0%`, `20%`, `40%`, `60%`, `80%`, `100%`.

**5. Field checklist — show what drives the %**
Below the bar, add 5 compact pill chips, one per field (Target roles, Locations, Skills, Summary, Salary floor). Filled fields get a check icon + `bg-success/10 text-success border-success/25`; unfilled get muted styling. This makes the score transparent and shows exactly what to fill next.

**6. CTA — stronger affordance**
Promote the "Complete profile" button to use the accent color (`bg-accent text-accent-foreground hover:bg-accent/90`) so it's the dominant action in the banner.

### Data needed
The banner currently only receives the numeric `score`. To render per-field chips, pass a small `fields` object (or an array of `{ label, filled }`) from the parent `GettingStarted` component, derived from the same Supabase query that already runs in `useEffect`. Minimal change — just store the per-field booleans alongside the score in component state.

### Files touched
- `src/pages/GettingStarted.tsx` — restructure `ProfileCompletenessBanner`, update the score `useEffect` to also store per-field filled flags, render the new bar + chip checklist.

### Out of scope
- No changes to the shared `Progress` component (custom inline bar lives in the banner only, so other usages are untouched).
- No changes to the underlying scoring logic (still 5 fields, still equal weight).

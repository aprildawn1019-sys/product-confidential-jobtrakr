

## Make "Avg time to interview" footer prominent and aesthetic

The footer in the Pipeline by lane card currently renders the median days-to-interview at `text-[11px]` — same micro-size as the n/d helper rows above it, so it visually disappears. Promote it to a proper "highlight footer" treatment.

### Visual changes (footer block in Pipeline by lane card)

Replace the current single-line `text-[11px]` footer with a centered, two-tier highlight band:

```
─────────────────────────────────────────
              ⏱  AVG TIME TO INTERVIEW
                    12d
            median across all lanes
─────────────────────────────────────────
```

Specifics:

- **Container:** `mt-2 pt-5 border-t border-border/60`. Add a subtle accent: `bg-gradient-to-b from-transparent to-muted/30 -mx-6 px-6 pb-5 rounded-b-xl` so it reads as a footer band, not a stray line. Centered text alignment.
- **Eyebrow label:** `Avg time to interview` in `text-[11px] uppercase tracking-wider font-medium text-muted-foreground`, paired with a small `Clock` icon (lucide, `h-3.5 w-3.5`) to its left. Flex row, `justify-center gap-1.5`.
- **Value:** the number jumps to `font-display text-4xl font-bold tracking-tight tabular-nums text-foreground` — same Space Grotesk treatment as the headline StatCards. The `d` suffix renders at `text-2xl text-muted-foreground ml-0.5 font-medium` so the integer dominates and the unit recedes (matches numeral/unit hierarchy used elsewhere in the design system).
- **Sub-caption:** `median across all lanes` in `text-[11px] text-muted-foreground mt-1` — clarifies it's not per-lane and not a mean. (Replaces the implicit-only label.)
- **Empty state:** when `medianDaysToInterview === null`, render `—` at the same large numeral size, with sub-caption swapped to `No interviews yet`.

### Why these choices

- The card already uses `font-display` numerals for the conversion percentages (`text-2xl`); bumping the footer to `text-4xl` makes it the visual anchor at the bottom of the card — appropriate since it's a single summary stat for the whole pipeline, weighted heavier than any individual lane's percent.
- The gradient band + border-top gives it card-footer identity without needing a second `<Card>` or a hard divider line, which would feel heavy.
- Centered alignment matches the centered conversion tiles above it (centered in the prior turn).

### Files touched

- `src/pages/Overview.tsx` — lines 417–431 only. Add `Clock` to the existing `lucide-react` import (verify `Activity` etc. are already imported; `Clock` likely needs adding). No memo or data changes.

### Out of scope

- The Time to first interview card below — still slated for removal in a future turn per earlier discussion, but not touched here.
- Any changes to the per-lane tiles or the window selector.


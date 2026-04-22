

# Brand Palette & Icon Design — Audit + Recommendations

A focused review of the **color tokens** in `src/index.css` and the **icon system** in `src/components/AppSidebar.tsx` (the most icon-dense surface in the app, and the one that anchors brand perception).

---

## What's working

- **Two-color brand spine:** Navy primary + amber accent is distinctive, owns the sidebar, and matches the Koudou mark. Amber is correctly reserved for state (active row, brand mark) rather than identity.
- **HSL token system in `src/index.css`** with proper sidebar-scoped tokens (`--sidebar-*`) — themable and consistent.
- **Icon stroke discipline:** All sidebar icons use Lucide at `18px` / `strokeWidth=2`, so weight reads uniformly across rows.
- **State-driven icon color:** Inactive `text-sidebar-muted`, active/hover `text-sidebar-primary` (amber). Clean 2-tone system; no rainbow drift.
- **Brand mark contrast handled correctly:** dark-variant asset on the navy sidebar, light-variant on light surfaces (per `mem://style/brand-mark`).

---

## Issues — palette

### P1. Amber is overloaded *(high)*
`--accent`, `--warning`, `--sidebar-primary`, and `--sidebar-ring` all resolve to **the same amber** (`36 90% 55%`). That means an active nav row, a "warning" badge, a focus ring, and a brand wordmark all share one color. The signal collapses — users can't tell "you are here" from "this needs attention."

**Recommend:** keep `--accent` and `--sidebar-primary` as the brand amber (`36 90% 55%`). Shift `--warning` to a slightly warmer/duskier tone (e.g. `30 92% 50%`) so warnings are distinct from brand emphasis, and tone `--sidebar-ring` to a higher-luminance variant (`36 95% 65%`) so focus rings read on top of an active amber bar.

### P2. No semantic neutral scale *(high)*
Today there are only two grays in play (`--muted` and `--muted-foreground`). The sidebar invents a third (`--sidebar-muted: 220 12% 60%`) inline. Across the product, "secondary text," "tertiary text," and "disabled" all collapse to the same muted-foreground.

**Recommend:** introduce a documented 3-step neutral ramp at the token layer:
- `--text-primary` → `222 47% 11%` (current foreground)
- `--text-secondary` → `220 12% 38%` (≈ AA on white)
- `--text-tertiary` → `220 10% 55%` (labels, captions, placeholder)

Then derive `--muted-foreground` and `--sidebar-muted` from this ramp instead of declaring fresh values per surface.

### P3. Status colors are imbalanced *(medium)*
- `--success: 152 60% 40%` is a saturated forest green — heavier visual weight than amber/red at the same size.
- `--info: 210 80% 52%` is a vivid blue that competes with primary navy.
- `--destructive: 0 72% 51%` is balanced.

**Recommend:** equalize perceived luminance — drop success to ~`152 50% 42%` and info to ~`210 65% 50%` so success/warning/info/destructive read as a *family*, not four loud strangers.

### P4. Sidebar group label color is too saturated *(low — already partially fixed)*
`--sidebar-group-foreground: 36 90% 58%` is full-saturation amber. The component uses `/75` opacity to compensate, but the underlying token is still loud. Anything else that consumes this token (future surfaces, charts) inherits that loudness.

**Recommend:** desaturate the token itself to `36 35% 70%` and drop the `/75` opacity hack at the consumer.

---

## Issues — icons

### I1. Mixed icon vocabularies *(medium)*
The sidebar uses Lucide stroked icons at 18/2. But the footer mixes a **filled circular avatar tile** (`bg-sidebar-accent`, `rounded-md`) with stroked utility icons (Settings, Help). The eye reads "filled chip" vs "outlined glyph" as two different control types when they're peers.

**Recommend:** make the avatar a **stroke-styled square** matching the utility buttons — same `h-8 w-8 rounded-md`, same `bg-sidebar-accent/60`, initials in `text-sidebar-foreground` at 11px. The trio reads as one row of equal-weight controls.

### I2. Icon size inconsistency between expanded and collapsed *(low)*
- Expanded: `18px` icons in `~36px` rows (50% icon-to-row ratio).
- Collapsed: `18px` icons in `40px` square targets (45% ratio) — but the collapsed mode *visually* needs a slightly larger glyph because there's no label to anchor it.

**Recommend:** bump collapsed-mode icons to `20px` (`h-5 w-5`) so they hold the eye when standing alone. Keep expanded at `18px`.

### I3. Active-state icon treatment is amber-on-navy-tint, but the left bar is also amber *(low)*
Two amber elements (the 2px left bar + the icon) compete inside a single row. The bar already signals state; the icon doesn't need to also flip to amber.

**Recommend:** keep the **left bar amber** (state signal) and shift the **active icon to `text-sidebar-foreground`** (white). Hover stays amber as a transient affordance. This restores hierarchy: bar = "you are here," icon = identity, label = name.

Alternative: keep the icon amber and **drop the bar** — but the bar is more accessible at small sizes.

### I4. Brand mark sits next to a sans-serif wordmark with no optical alignment *(low)*
`BrandMark h-9 w-9` + `Koudou` at `text-xl font-bold` — the wordmark baseline doesn't quite center against the mark because the mark has internal padding. Visually the wordmark drifts ~1px low.

**Recommend:** wrap the wordmark in a flex container with `leading-none` and `pt-0.5` to optically center against the mark. Tiny but the lockup is the first thing users see.

### I5. Footer Help/Settings active-state inconsistent with primary nav *(low)*
The primary nav active state uses `bg-sidebar-accent + amber left bar + amber icon`. Settings (line 414) uses `bg-sidebar-accent + amber icon` but **no left bar**. Active treatment differs by zone for no functional reason.

**Recommend:** either add the bar to footer active items, or — better — drop the bar from the footer and rely on the filled background alone since footer items are utility, not pipeline. Document the rule: "primary nav uses left-bar, utility nav uses fill-only."

---

## Recommended implementation batch

A focused, low-risk pass that addresses the highest-impact items:

1. **Token cleanup in `src/index.css`** — separate `--warning` from `--accent`; tone `--sidebar-ring`; add the 3-step neutral ramp; desaturate `--sidebar-group-foreground`. (P1, P2, P4)
2. **Equalize success/info luminance.** (P3)
3. **Avatar → stroke-styled square** in sidebar footer. (I1)
4. **Active icon color = white, bar stays amber** in expanded primary nav. (I3)
5. **Collapsed icons → 20px.** (I2)
6. **Lockup optical alignment** in expanded sidebar header. (I4)

Items I5 (footer active rule) and any surface-level cleanup follow in a second pass once tokens settle.

---

## Anti-patterns to avoid

- Re-introducing per-route icon hues (the "stained-glass" regression).
- Reusing `--accent` for warning chips, focus rings, *and* brand mark with no differentiation.
- Adding a 4th gray inline on a new surface — extend the neutral ramp instead.
- Wrapping `BrandMark` in another tile — the painted tile is part of the asset (per `mem://style/brand-mark`).

Tell me which items to implement and I'll switch to default mode and apply them.


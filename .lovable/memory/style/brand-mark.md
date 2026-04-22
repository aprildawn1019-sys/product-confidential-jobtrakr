---
name: Brand mark
description: Koudou brand mark is a geometric K (upper arm + amber lower arm forming a forward step). Two themed variants — dark (navy tile) for sidebar, light (paper tile) for landing nav/footer + favicon.
type: design
---

## Brand mark

Single design, two palette variants so the amber lower arm and K silhouette read on either surface.

### Files
- `src/assets/brand/koudou-mark-dark.png` — navy tile, ivory K, amber lower arm. Used on dark surfaces (sidebar).
- `src/assets/brand/koudou-mark-light.png` — paper tile, navy K, amber lower arm, navy hairline ring. Used on light surfaces (landing nav, footer, favicon).
- `public/favicon.png` — copy of the light variant.
- `src/components/AppSidebar.tsx` — imports the **dark** variant.
- `src/pages/Landing.tsx` — imports the **light** variant (nav + footer).
- Renderer: `/tmp/render_marks.py` (deterministic PIL script — re-run to regenerate both variants from the same geometry).

### Design
Navy/ivory rounded-square tile, geometric "K": vertical spine + upper arm (ivory on dark, navy on light) + amber lower arm angled forward like a foot mid-stride. The amber lower arm encodes "forward motion / action" and is identical in both variants.

### Usage rules
- Always render via `<img src={koudouMarkSrc} alt="Koudou" />` — do **not** rebuild as inline SVG.
- Pick the variant that matches the surface it sits on. Never put the dark variant on a light page or vice versa — the tile colors will clash.
- Sidebar (expanded): `h-8 w-8`. Sidebar (collapsed): `h-9 w-9`.
- Landing nav: `h-9 w-9`. Landing footer: `h-5 w-5`.
- Do **not** wrap the mark in an additional amber/navy tile — the painted tile is part of the asset.
- Previous concepts (Rising Arc, Switchback, etc.) are archived and are **not** the active brand mark.
- The legacy single-asset `src/assets/brand/koudou-mark.png` is unused; prefer the `-dark` / `-light` variants.

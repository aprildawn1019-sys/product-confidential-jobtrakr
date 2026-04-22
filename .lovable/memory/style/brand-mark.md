---
name: Brand mark
description: Koudou brand mark is a geometric K (white upper arm + amber lower arm forming a forward step). One asset for sidebar, landing nav, and favicon.
type: design
---

## Brand mark

Single canonical asset: `src/assets/brand/koudou-mark.png` (also copied to `public/favicon.png`).

Design: navy rounded-square tile, white upper arm of "K", amber lower arm angled forward like a foot mid-stride. The amber lower arm encodes "forward motion / action."

### Usage rules
- Render via `<img src={koudouMarkSrc} alt="Koudou" />` — do **not** rebuild as inline SVG (the K geometry is bespoke and won't read correctly from a hand-drawn vector).
- Sidebar (expanded): `h-8 w-8`. Sidebar (collapsed): `h-9 w-9`.
- Landing nav: `h-9 w-9`. Landing footer: `h-5 w-5`.
- Favicon: served from `/favicon.png`, referenced in `index.html`.
- Do **not** wrap the mark in an additional amber/navy tile — the painted tile is part of the asset.
- Previous concepts (Rising Arc, Switchback, etc.) are archived in `src/assets/concepts/` for reference but are **not** the active brand mark.

### Files
- `src/assets/brand/koudou-mark.png` — canonical asset
- `public/favicon.png` — same image, served as favicon
- `src/components/AppSidebar.tsx` — `KoudouMark` component
- `src/pages/Landing.tsx` — nav + footer lockups

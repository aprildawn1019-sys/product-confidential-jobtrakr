

## Brand mark comparison mockup — light & dark backgrounds

I'll generate a single comparison image that places all four Rising Arc variants (A, B, C, D) on both a **light surface** (landing page nav context) and a **dark surface** (sidebar context), so you can pick the right variant per surface.

### What you'll see

A 4×2 grid PNG saved to `/mnt/documents/rising-arc-variants-light-dark.png`:

```text
                 LIGHT BG              DARK BG
              (landing nav)         (app sidebar)
   ┌──────────────────────────┬──────────────────────────┐
 A │  [tile]  Koudou          │  [tile]  Koudou          │
   ├──────────────────────────┼──────────────────────────┤
 B │  [tile]  Koudou          │  [tile]  Koudou          │
   ├──────────────────────────┼──────────────────────────┤
 C │  [tile]  Koudou          │  [tile]  Koudou          │
   ├──────────────────────────┼──────────────────────────┤
 D │  [tile]  Koudou          │  [tile]  Koudou          │
   └──────────────────────────┴──────────────────────────┘
```

Each cell shows:
- The actual variant PNG at sidebar/nav size (~36px tile)
- The "Koudou" wordmark beside it in the project's display font
- A second row at favicon size (16px and 32px) for tab legibility check
- The surface background uses the real theme tokens: light = `#FAFAF7` (canvas), dark = `#0F1729` (sidebar navy)

### Technical approach

1. Use Pillow to compose the grid from the four existing PNGs in `src/assets/concepts/`.
2. Render each variant unmodified (no recoloring) so you see exactly how the painted artwork reads on each background.
3. Add small labels (A / B / C / D, "Light surface" / "Dark surface") for clarity.
4. Output a single PNG to `/mnt/documents/rising-arc-variants-light-dark.png` — no project files touched, no live UI changes.

### After you decide

Once you pick (one variant for dark sidebar, one for light landing/favicon — possibly the same), I'll wire it in: copy the chosen PNGs to `src/assets/brand/`, swap the inline `KoudouMark` SVG in `AppSidebar.tsx` for an `<img>`, update the landing nav + footer in `Landing.tsx`, and regenerate `public/favicon.png`.


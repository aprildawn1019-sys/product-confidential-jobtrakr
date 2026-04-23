# Koudou Brand Lockdown

**This folder is the single source of truth for all brand decisions.**
Anything outside `src/assets/brand/` is product/feature illustration, not brand.
Anything inside `src/assets/_archive/` is historical exploration — do **not** import it.

---

## Folder layout

```
src/assets/brand/
├── BRAND.md                  ← you are here
├── marks/
│   ├── koudou-mark-light.png ← LIGHT tile (white) · navy K · amber lower arm  → use on DARK surfaces (navy sidebar, dark hero)
│   └── koudou-mark-dark.png  ← DARK  tile (navy)  · white K · amber lower arm  → use on LIGHT surfaces (off-white app canvas, white cards)
└── spec/                     ← canonical UX reference images. Re-read before redesigning a surface.
    ├── dashboard-mockup.jpg          (Command Center hero)
    ├── spec-command-center-v2.jpg
    ├── spec-sidebar-v2.jpg
    ├── spec-jobs-list-v2.jpg
    ├── spec-jobs-kanban-v2.jpg
    └── spec-contacts-v2.jpg
```

`public/favicon.png` is a copy of `marks/koudou-mark-dark.png` — keep them in sync (the favicon sits on a light browser-tab background).

---

## Identity

- **Name:** Koudou (product), Jobtrakr (legacy / docs only — do not surface in UI).
- **Tagline:** *Your job search, organized.*
- **Personality:** Calm operations. Editorial-meets-Linear. Restraint over decoration.

## Palette (locked — defined in `src/index.css`)

| Token                       | HSL             | Role                                             |
|-----------------------------|-----------------|--------------------------------------------------|
| `--background`              | `220 20% 97%`   | Cool off-white app canvas                        |
| `--card`                    | `0 0% 100%`     | Pure white surfaces                              |
| `--primary`                 | `222 60% 22%`   | Deep navy — CTAs, primary text accents           |
| `--accent` / `--sidebar-primary` | `36 90% 55%` | Brand amber — sidebar wordmark, active-route bar, mark's lower arm |
| `--warning`                 | `30 92% 50%`    | Attention signals — **distinct from brand amber** |
| `--success`                 | `152 50% 42%`   | Status family (luminance-equalized)              |
| `--info`                    | `210 65% 50%`   | Status family (luminance-equalized)              |
| `--destructive`             | `0 72% 51%`     | Status family                                    |
| `--ring` / `--sidebar-ring` | `36 95% 65%`    | High-luminance amber — focus rings on amber bar  |
| `--text-primary`            | `222 47% 11%`   | Body text                                        |
| `--text-secondary`          | `220 12% 38%`   | Secondary text                                   |
| `--text-tertiary`           | `220 10% 55%`   | Captions, placeholders                           |
| `--sidebar-background`      | `222 47% 11%`   | Deep navy sidebar                                |
| `--sidebar-group-foreground`| `36 35% 70%`    | Desaturated muted amber — section labels         |

**Never** introduce a 4th gray inline. **Never** reuse `--accent` for warning chips.
**Never** collapse `--warning` and `--accent` to the same hue again.

## Type

- **Display / numerals:** `Space Grotesk` (700/600/500/400)
- **Body:** `DM Sans` (300–700)
- Loaded via Google Fonts in `src/index.css`. Never serif. Never substitute system fonts.

## Mark usage

- **Contrast rule (binding):** pick the variant by **inverted-contrast** to the surface, not by filename intuition.
  - On a **dark** surface (navy sidebar, dark hero): use **`koudou-mark-light.png`** — the white tile pops off the navy.
  - On a **light** surface (off-white app canvas, white card): use **`koudou-mark-dark.png`** — the navy tile pops off the white.
  - In `BrandMark`, pass `surface="dark"` when *the surface is dark* and the component will load the correct (light-tile) asset for you. Same for `surface="light"`. Never pick the filename directly at the call site.
- Mixing variants (dark mark on dark surface, light mark on light surface) collapses contrast and the mark disappears — this is the failure mode the rule prevents.
- Always render via `BrandMark` (which wraps `<img>`). Do **not** rebuild as inline SVG, and do **not** import the PNG directly — the component owns the surface-mapping and tile-radius rules.
- **Tile shape is always a rounded square, never a hard square.** Corner radius is component-owned (size-proportional via Tailwind `rounded`/`rounded-md`/`rounded-lg`) so every surface reads consistently. Source PNGs are intentionally full-bleed flat-color tiles; the rounded clip is applied in CSS so we can re-tune the radius without re-exporting assets.
- The amber lower arm is invariant — it's the "forward motion" cue. Do not recolor.
- **Asset provenance (binding):** `koudou-mark-light.png` is the hand-authored canonical asset. `koudou-mark-dark.png` is generated from it by per-pixel color-swap (navy↔white, amber preserved) — see `/tmp/invert_mark.py` and `.lovable/memory/style/brand-mark.md`. Never re-paint the dark variant with an image model: the legs of the K must stay crisp, and the only way to guarantee that is to derive the dark variant from the clean light variant. If the light variant changes, regenerate the dark variant the same way; do not hand-edit `koudou-mark-dark.png`.

### Mark geometry (locked)

- **K footprint inside the tile:** the K fills **~72% of the tile height** ("Confident" padding, ~14% margin on each side). This is the locked density — it matches modern app-icon conventions (Apple/Google home-screen marks) and prevents the **"lost K" failure mode** where the earlier airy ~45% coverage made the mark read as a colored square at favicon sizes.
- **Padding is baked into the PNG, not applied in CSS.** The tile-radius is the only geometric thing CSS owns (see `BrandMark`). Do not try to "fix" perceived padding with extra `p-*` utilities at the call site — that double-pads the mark and shrinks the K back into a square.
- **Re-export procedure:** if the K is ever redrawn or re-exported, re-run the rescale to **target a 72% bbox-height K** on a full-bleed flat-color tile *before* regenerating the dark variant. Order matters — the color-swap inherits whatever padding the light master has.
- **Edge classifier rule (navy↔white swap):** snap antialiased edge pixels to **navy or white, never amber**. Amber is preserved only when a pixel is unambiguously amber — i.e. *closer to amber than to navy* AND *closer to amber than to white*. This eliminates the **amber-halo artifact** that scaling antialiased edges introduces (the "amber rim around the K" bug from the first dark-variant regeneration).

## Sidebar surface (the navy rail)

The navy sidebar is the most-seen brand surface, so its treatment is locked here:

- **Brand lockup (top):** `BrandMark size="md" surface="dark"` + the wordmark "Koudou" in `Space Grotesk 700 @ 20px`, painted in **brand amber** (`text-sidebar-primary`, HSL `36 90% 55%`) — **never white, never the muted/desaturated amber used on group labels**. The full-saturation amber is binding here so the wordmark visually rhymes with the mark's amber lower arm and the active-row amber bar — the rail's three brand-amber moments (mark arm → wordmark → active bar) form one chromatic chord. Wordmark uses `leading-none` + `pt-0.5` to optically center against the mark (which carries internal padding). In collapsed mode, only the mark renders, at `size="lg"`.
- **Icon palette (inverted):** primary-nav glyphs default to **muted brand amber** (`text-sidebar-primary/80`) and lift to **white** (`text-sidebar-foreground`) on hover. Label text stays on the muted ramp (`text-sidebar-muted` → white on hover) — only the **icon** carries the amber signal so the rail reads as quietly chromatic, not loud. This applies to both expanded primary nav and the collapsed icon rail, and to the footer utility rows (Profile / Settings / Help).
- **Active row:** soft navy fill (`bg-sidebar-accent`) + **amber left bar** (`before:bg-sidebar-primary`, 2px wide, inset 6px top/bottom, fully rounded). When active, the icon flips to **white** so the amber bar is the sole "you are here" cue — the icon does not double-signal. Active label is `font-medium`.
- **Section labels (groups):** `Space Grotesk 600 @ 11px`, uppercase, `tracking-[0.16em]`, color `--sidebar-group-foreground` (desaturated muted amber). Quieter than the rows by design — they are scaffolding, not navigation.
- **Footer:** vertical stack of labeled utility rows (Profile, Settings, Help) followed by an identity row (avatar + name) anchored at the very bottom. The avatar is a 28px circle, `bg-sidebar-primary` with `text-sidebar-primary-foreground` initials. The whole identity row is the dropdown trigger (not just the avatar) — the spec affordance is "click your name."
- **Scrollbar (overlay, hairline-on-hover):** the nav scroll container uses the `.sidebar-scroll` utility (defined in `src/index.css`). Scrollbar is invisible at rest and **does not consume layout width** — this prevents the rail from looking pinched when the thumb appears (the previous bug where header/footer looked wider than the nav). On hover/focus/scroll, a 4px hairline thumb in `--sidebar-foreground / 0.28` fades in (Firefox via `scrollbar-color`, WebKit via `::-webkit-scrollbar-thumb`). Do not switch back to default `overflow-y-auto` without `.sidebar-scroll` — that re-introduces the layout-shift bug.

## Spec images = binding UX reference

The files in `spec/` are the canonical reference for layout, density, type scale, and component composition. When a request is ambiguous, **align to the spec image, not to existing code** (existing code may have drifted).

## What lives in `_archive/` and why

`src/assets/_archive/` holds historical exploration that is **not** part of the current brand. Kept in repo for traceability; never import from it.

- `_archive/marks-legacy/` — earlier mark iterations, pre-canonical `marks/` folder, the unused public SVG mark.
- `_archive/moodboards/` — early aesthetic exploration (data-dense, editorial, refined-linear). Superseded by `spec/`.
- `_archive/concepts/` — generative concept variants (rising arc, road horizon, twin rails, etc.). None became the final mark.

If you find yourself wanting to import from `_archive/`, stop and reconsider — the answer is in `marks/` or `spec/`.

## Favicons & app icons

The favicon suite in `public/` is generated from the same two canonical mark masters in `marks/` — never hand-paint a favicon. The browser-tab favicon is **adaptively themed** so the mark always renders in inverted contrast against the browser chrome (same rule as in-app surfaces).

### Locked icon set

| File                          | Size              | Variant                          | Purpose                                           |
|-------------------------------|-------------------|----------------------------------|---------------------------------------------------|
| `public/favicon.ico`          | multi (16/32/48)  | dark-tile (navy)                 | Legacy fallback for older browsers                |
| `public/favicon-16.png`       | 16×16             | dark-tile (navy)                 | Browser tab (small)                               |
| `public/favicon-32.png`       | 32×32             | dark-tile (navy)                 | Browser tab (retina)                              |
| `public/favicon-light.png`    | 32×32             | dark-tile (navy on white)        | Used when browser chrome is **light**             |
| `public/favicon-dark.png`     | 32×32             | light-tile (white tile, navy K)  | Used when browser chrome is **dark**              |
| `public/apple-touch-icon.png` | 180×180           | dark-tile (navy)                 | iOS home screen                                   |
| `public/icon-192.png`         | 192×192           | dark-tile (navy)                 | PWA / Android home screen                         |
| `public/icon-512.png`         | 512×512           | dark-tile (navy)                 | PWA splash                                        |
| `public/favicon.png`          | 512×512           | dark-tile (navy)                 | Generic fallback (kept in sync with `icon-512.png`) |

### Adaptive theming (binding)

- `index.html` wires the 32px favicons with `media="(prefers-color-scheme: dark)"` and `media="(prefers-color-scheme: light)"` so Safari/Firefox swap variants automatically as the user toggles OS theme.
- The contrast rule is **identical** to the in-app rule from "Mark usage": **dark browser chrome → light-tile mark; light browser chrome → dark-tile mark.** The chrome is the surface; the mark inverts against it.
- **Never collapse to a single favicon variant.** That re-introduces the "mark disappears against matching surface" failure mode (e.g. a dark-tile favicon vanishes into Safari's dark tab strip).
- iOS / PWA / Android icons (`apple-touch-icon`, `icon-192`, `icon-512`) intentionally use **only the dark-tile variant** — home-screen backgrounds vary too much to media-query, and the navy tile reads cleanly on every wallpaper we tested.

### Regeneration recipe

If you ever need to rebuild the suite (e.g. after the K is redrawn), follow this order — do not skip steps, and do not reorder them:

1. Hand-author / update `marks/koudou-mark-light.png` (light-tile master, K at 72% bbox height — see "Mark geometry").
2. Run the per-pixel color-swap (see `.lovable/memory/style/brand-mark.md`) to produce `marks/koudou-mark-dark.png` (dark-tile sibling). Use the strict edge classifier so amber pixels don't bleed.
3. Downscale **both** masters with **LANCZOS** to produce the 16 / 32 / 180 / 192 / 512 PNGs above. Use the **dark-tile master for everything except `favicon-dark.png`**, which uses the light-tile master.
4. Build `favicon.ico` as a multi-resolution bundle (16 / 32 / 48) from the dark-tile master.
5. Copy the 512px dark-tile output to `public/favicon.png` to keep the generic fallback in sync with `icon-512.png`.

LANCZOS is non-negotiable at small sizes — bilinear/bicubic blurs the K's legs at 16px and the mark loses its identity.

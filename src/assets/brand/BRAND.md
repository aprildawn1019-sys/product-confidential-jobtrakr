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
│   ├── koudou-mark-light.png ← navy tile · white K · amber lower arm  (use on LIGHT surfaces)
│   └── koudou-mark-dark.png  ← white tile · navy K · amber lower arm  (use on the navy SIDEBAR)
└── spec/                     ← canonical UX reference images. Re-read before redesigning a surface.
    ├── dashboard-mockup.jpg          (Command Center hero)
    ├── spec-command-center-v2.jpg
    ├── spec-sidebar-v2.jpg
    ├── spec-jobs-list-v2.jpg
    ├── spec-jobs-kanban-v2.jpg
    └── spec-contacts-v2.jpg
```

`public/favicon.png` is a copy of `marks/koudou-mark-light.png` — keep them in sync.

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

- Pick the variant by **surface contrast**, not preference: dark variant on dark surfaces, light variant on light. Mixing them collapses contrast and the mark disappears.
- Always render via `<img src={...} alt="Koudou" />`. Do **not** rebuild as inline SVG.
- Do **not** wrap the mark in another tile — the painted tile is part of the asset.
- The amber lower arm is invariant — it's the "forward motion" cue. Do not recolor.

## Spec images = binding UX reference

The files in `spec/` are the canonical reference for layout, density, type scale, and component composition. When a request is ambiguous, **align to the spec image, not to existing code** (existing code may have drifted).

## What lives in `_archive/` and why

`src/assets/_archive/` holds historical exploration that is **not** part of the current brand. Kept in repo for traceability; never import from it.

- `_archive/marks-legacy/` — earlier mark iterations, pre-canonical `marks/` folder, the unused public SVG mark.
- `_archive/moodboards/` — early aesthetic exploration (data-dense, editorial, refined-linear). Superseded by `spec/`.
- `_archive/concepts/` — generative concept variants (rising arc, road horizon, twin rails, etc.). None became the final mark.

If you find yourself wanting to import from `_archive/`, stop and reconsider — the answer is in `marks/` or `spec/`.

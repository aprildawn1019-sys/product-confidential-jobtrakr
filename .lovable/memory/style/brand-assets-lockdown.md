---
name: Brand assets lockdown
description: All Koudou brand assets and design specs live under src/assets/brand/. Marks in marks/, UX spec images in spec/, lockdown doc in BRAND.md. Anything under src/assets/_archive/ is historical — never import it.
type: constraint
---

## Brand assets lockdown

`src/assets/brand/` is the single source of truth for brand. Structure:

```
src/assets/brand/
├── BRAND.md                  ← identity, palette, type, mark rules
├── marks/
│   ├── koudou-mark-light.png ← light surfaces
│   └── koudou-mark-dark.png  ← navy sidebar
└── spec/                     ← canonical UX reference images
    ├── dashboard-mockup.jpg
    ├── spec-command-center-v2.jpg
    ├── spec-sidebar-v2.jpg
    ├── spec-jobs-list-v2.jpg
    ├── spec-jobs-kanban-v2.jpg
    └── spec-contacts-v2.jpg
```

## Rules

- **Read `src/assets/brand/BRAND.md` before making any brand or color decision.**
- Import marks from `@/assets/brand/marks/...` only.
- Import spec images (Landing hero) from `@/assets/brand/spec/...` only.
- Never import from `src/assets/_archive/` — it holds legacy mark iterations, moodboards, and concept exploration kept for traceability only.
- Never resurrect deleted moodboards or concept PNGs as design references — `spec/` is the only valid spec source.
- Keep `public/favicon.png` in sync with `marks/koudou-mark-light.png`.

**Why:** Past iterations re-derived the look on each request and pulled from stale moodboards/concepts, causing brand drift. Locking the folder structure forces every brand decision through one canonical surface.

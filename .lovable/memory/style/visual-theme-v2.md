---
name: Visual Theme v2 — Calm Operations
description: Binding visual spec for Jobtrakr. Source of truth lives in src/assets/dashboard-mockup.jpg and src/assets/spec-*-v2.jpg. Re-read those images before redesigning any surface.
type: design
---

## Source of truth (read these BEFORE designing any surface)

These image assets are the canonical UX spec. If a request is ambiguous,
align to the image, not to existing code.

- `src/assets/dashboard-mockup.jpg` — Command Center hero (also rendered on Landing)
- `src/assets/spec-command-center-v2.jpg` — Command Center detail
- `src/assets/spec-sidebar-v2.jpg` — Sidebar expanded + collapsed
- `src/assets/spec-jobs-list-v2.jpg` — Jobs list view
- `src/assets/spec-jobs-kanban-v2.jpg` — Jobs Kanban view
- `src/assets/spec-contacts-v2.jpg` — Contacts list view

**Why this rule exists:** Past iterations re-derived the look on each request and drifted from the mockup (heavy urgency tints, badge-laden rows, header buttons crowding the title). Lock to the images.

## Core tokens (already in `src/index.css`)

- `--background: 220 20% 97%` — cool off-white app canvas
- `--card: 0 0% 100%` — pure white surfaces
- `--primary: 222 60% 22%` — deep navy (CTAs, focus, primary text accents)
- `--accent: 36 90% 55%` — amber (sidebar wordmark, active-route bar, primary toggle)
- `--sidebar-background: 222 47% 11%` — deep navy sidebar
- `--sidebar-group-foreground: 36 45% 68%` — muted amber section labels
- `--sidebar-primary: 36 90% 55%` — amber wordmark square + active-route bar
- Fonts: `Space Grotesk` (display/numerals), `DM Sans` (body)

## Sidebar (canonical)

- Navy background, amber rounded square + "Jobtrakr" wordmark in header.
- Section labels (`TODAY` / `PIPELINE` / `LIBRARY` / `INSIGHTS`) in amber, uppercase, tracking-widest, ~11px.
- Active route: subtle navy-tint background + **3px amber left bar** (anchored to sidebar edge via `before:` pseudo-element).
- Inactive: muted text, no left bar, hover lifts to `sidebar-accent/50`.
- Footer: Settings / Help / Sign out — ghost buttons in muted text.
- Collapsed (56px): icons only, amber left bar still appears on active icon.

## Page chrome (canonical)

- **Page header:** big `font-display text-3xl/4xl font-bold` title + one-line muted subtitle. **No buttons in the page header.** Push secondary actions into the panel they belong to (e.g., "Suggest next steps" lives inside the Next steps panel header, not the page header).
- **Subtitle pattern:** `{n} {noun} · {modifier} · {modifier}` (e.g. `47 jobs · 12 active · 3 in interviews`, `12 next steps · 3 overdue · 5 today`).
- **Page titles:** Single nouns. Use `Jobs`, `Contacts`, `Interviews`, `Command Center` — not `Job Pipeline`, `Connections`, `Schedule`.

## Stat cards

- `StatCard variant="minimal"` (default). White card, big Space Grotesk numeral on top (`text-4xl/5xl`), label in caps below, no icon, no fill.
- Four across at `lg`, two across at `sm`, stacked on mobile.
- Never reintroduce the rainbow accented variant for primary surfaces.

## Action rows (Next steps)

Spec composition (from dashboard-mockup.jpg):

```
[ avatar ] Title                           [ amber stadium toggle ]
           Subtitle
```

- **No** left urgency accent bars.
- **No** "Overdue / Today" micro-labels next to the toggle.
- **No** inline hover arrow button.
- The whole row is the click target (navigates to action.href).
- Completion control = single amber stadium toggle (`role="switch"`).
- More-options dropdown (snooze) appears on hover only.
- Completed rows: 60% opacity + line-through on the title.

## Status / priority pills (Jobs, Contacts)

- Soft, single-tone pills. Amber for warm/high, navy-muted for medium, slate for low/cold.
- No nested pills inside other pills.
- Avatars: deterministic colored circles seeded by company or contact name.

## Anti-patterns (do not do)

- Page header with action buttons crowding the title
- Tinted backgrounds on action rows for urgency (`bg-destructive/10`, `bg-warning/10`, etc.)
- Left urgency accent bars on Next steps
- Reintroducing the accented StatCard variant for the Command Center
- Calling the app "JobTrackr" — it's "Jobtrakr"
- Re-deriving the design from scratch each request — read the spec images first

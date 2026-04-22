---
name: Visual Theme v2 — Calm Operations
description: Binding visual spec for Jobtrakr/Koudou. Source of truth lives in src/assets/brand/spec/. Re-read those images before redesigning any surface. Brand lockdown doc at src/assets/brand/BRAND.md.
type: design
---

## Source of truth (read these BEFORE designing any surface)

These image assets are the canonical UX spec. If a request is ambiguous,
align to the image, not to existing code. Brand assets are locked under
`src/assets/brand/` (see `src/assets/brand/BRAND.md`). Anything under
`src/assets/_archive/` is historical exploration — do not import it.

- `src/assets/brand/spec/dashboard-mockup.jpg` — Command Center hero (also rendered on Landing)
- `src/assets/brand/spec/spec-command-center-v2.jpg` — Command Center detail
- `src/assets/brand/spec/spec-sidebar-v2.jpg` — Sidebar expanded + collapsed
- `src/assets/brand/spec/spec-jobs-list-v2.jpg` — Jobs list view
- `src/assets/brand/spec/spec-jobs-kanban-v2.jpg` — Jobs Kanban view
- `src/assets/brand/spec/spec-contacts-v2.jpg` — Contacts list view

**Why this rule exists:** Past iterations re-derived the look on each request and drifted from the mockup (heavy urgency tints, badge-laden rows, header buttons crowding the title). Lock to the images.

## Core tokens (already in `src/index.css`)

- `--background: 220 20% 97%` — cool off-white app canvas
- `--card: 0 0% 100%` — pure white surfaces
- `--primary: 222 60% 22%` — deep navy (CTAs, focus, primary text accents)
- `--accent: 36 90% 55%` — amber, BRAND emphasis only (sidebar wordmark, active-route bar)
- `--warning: 30 92% 50%` — duskier amber, decoupled from `--accent` so attention signals never collide with brand emphasis
- `--success: 152 50% 42%` / `--info: 210 65% 50%` — luminance-equalized so the status family reads as one set
- `--ring` / `--sidebar-ring: 36 95% 65%` — high-luminance amber so focus rings stay visible on top of the active amber bar
- Neutral text ramp: `--text-primary` (222 47% 11%) · `--text-secondary` (220 12% 38%) · `--text-tertiary` (220 10% 55%). Surface-specific muted tokens (e.g. `--sidebar-muted`) derive from this scale — do not invent a 4th gray inline.
- `--sidebar-background: 222 47% 11%` — deep navy sidebar
- `--sidebar-group-foreground: 36 35% 70%` — desaturated muted amber for section labels (no `/75` opacity hack at the consumer)
- `--sidebar-primary: 36 90% 55%` — amber active-route bar + brand mark
- Fonts: `Space Grotesk` (display/numerals), `DM Sans` (body)

## Sidebar (canonical)

- Navy background. Brand lockup = `BrandMark` (geometric-K) + "Koudou" wordmark in `font-display text-xl font-bold leading-none pt-0.5` (optical alignment).
- Section labels (`TODAY` / `PIPELINE` / `LIBRARY` / `INSIGHTS`) at `text-[11px] font-semibold tracking-[0.16em]` in `text-sidebar-group-foreground` (no opacity hack).
- Primary nav active row: `bg-sidebar-accent` fill + 2px amber left bar (state signal). Icon stays `text-sidebar-foreground` (white) in active state — the bar carries the cue, the icon doesn't double up. Hover flips icon to amber as a transient affordance.
- Inactive: `text-sidebar-muted`, hover lifts to `bg-sidebar-accent/50`.
- Icon sizes: expanded `18px` (h-[18px]), collapsed `20px` (h-5) — collapsed glyphs scale up since they stand alone without a label.
- Footer: name row, then a single 32px utility row of equal-weight controls — avatar (`bg-sidebar-accent/60` rounded-md), Settings, Help. Avatar uses the same surface as the utility buttons so the trio reads as peers. Utility nav uses fill-only active state (no left bar — the bar is reserved for primary nav).
- Collapsed (56px): icons-only at 20px, amber left bar still appears on active icon, avatar restyled as 40x40 `bg-sidebar-accent/60` rounded-lg tile to match utility vocabulary.

## Page chrome (canonical)

- **Page header:** big `font-display text-3xl/4xl font-bold` title + one-line muted subtitle. **No buttons in the page header.** Push secondary actions into the panel they belong to (e.g., "Suggest next steps" lives inside the Next steps panel header, not the page header).
- **Subtitle pattern:** `{n} {noun} · {modifier} · {modifier}` (e.g. `47 jobs · 12 active · 3 in interviews`, `12 next steps · 3 overdue · 5 today`).
- **Page titles:** Single nouns. Use `Jobs`, `Contacts`, `Interviews`, `Command Center` — not `Job Pipeline`, `Connections`, `Schedule`.

## Stat cards

- `StatCard variant="minimal"` (default). White card, big Space Grotesk numeral on top (`text-4xl/5xl`), label in caps below, no icon, no fill.
- Four across at `lg`, two across at `sm`, stacked on mobile.
- Never reintroduce the rainbow accented variant for primary surfaces.

## Action rows (Next steps)

Spec composition:

```
[ lane glyph ] Title                    actionLabel  [ ○ ]
               Subtitle
```

- **No bordered card shell** around the panel — Next steps is the focal area, not a bordered widget.
- Header: section title + cohort echo subtitle (`3 overdue · 5 today · 4 later`).
- Filter chip group below the header — `All · Today · Overdue · Networking · Applications · Referrals`. Replaces the orphaned ghost "Suggest" button. Active chip = filled foreground pill; inactive = quiet text.
- Rows are grouped into temporal **cohorts** (`Overdue` / `Today` / `Later this week`) with quiet uppercase micro-headers. Cohorts cap at 4 rows; "+N more" expands inline. No flat list, no `visibleCount` prop.
- Leading column is a **lane glyph tile** (28px square, lucide icon) — Networking → `Users` (slate), Referrals → `Handshake` (amber), Applications → `Briefcase` (navy), AI suggestions → `Sparkles` (amber). Never use initial-letter avatars on Next steps.
- Tail meta: `actionLabel` from `DerivedAction` ("Send a nudge", "Prep & open") rendered before the checkbox so users know the move pre-click. Hidden under `sm` breakpoint.
- Urgency chip (`Overdue Nd`) renders **only inside the Overdue cohort** — the cohort header already conveys the temporal signal for Today/Later.
- Completion control = circular checkbox only (`role="checkbox"`). No "Done" label text. Empty muted ring → filled amber check on click. Completed rows: 60% opacity + line-through on title.
- AI suggest is a **list row at the bottom of the list**, not a panel button. Same row pattern with a Sparkles glyph tile.
- Empty state replaces "Inbox zero" with three actionable links (Add target company / Log outreach / Ask AI).
- The whole row is the click target (navigates to `action.href`). More-options dropdown (snooze) appears on hover only.

## Status / priority pills (Jobs, Contacts)

- Soft, single-tone pills. Amber for warm/high, navy-muted for medium, slate for low/cold.
- No nested pills inside other pills.
- Avatars: deterministic colored circles seeded by company or contact name.

## Anti-patterns (do not do)

- Reusing `--accent` for warning chips, focus rings, AND brand mark with no differentiation
- Adding a 4th gray inline on a new surface — extend the neutral ramp instead
- Wrapping `BrandMark` in another tile — the painted tile is part of the asset
- Doubling the active-state signal on primary nav (amber bar + amber icon) — let the bar carry the cue
- Page header with action buttons crowding the title
- Tinted backgrounds on action rows for urgency (`bg-destructive/10`, `bg-warning/10`, etc.)
- Left urgency accent bars on Next steps
- Reintroducing the accented StatCard variant for the Command Center
- Re-deriving the design from scratch each request — read the spec images first

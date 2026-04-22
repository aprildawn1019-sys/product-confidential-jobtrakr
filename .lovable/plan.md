

# Sidebar UX/UI Audit — Findings & Recommendations

A heuristic review of `src/components/AppSidebar.tsx` (256px expanded / 56px collapsed, navy background, Koudou wordmark, four grouped sections, footer utility row).

---

## What's working well

- **Clear IA grouping** (Today / Pipeline / Library / Insights) ordered by daily-use frequency — matches Nielsen's "match between system and real world."
- **Persistent active-state treatment** (navy fill + 2px amber left bar) is consistent in expanded *and* collapsed modes — strong "visibility of system status."
- **Collapsed mode preserves icons + tooltips** — meets shadcn sidebar guidance (mini-collapse, not hide).
- **Mobile parity** via `Sheet` with the same `SidebarBody`.
- **Tour hooks** (`tourId`) wired at the row level for onboarding.
- **Auto-hide of "Getting Started"** once the user has data — reduces clutter for returning users.

---

## Issues, ranked by impact

### 1. Multi-color icon palette weakens scannability *(high impact)*
Ten distinct hues (amber/navy/teal/green/violet/rose/blue/lime/sand/sky) on a navy background create a "stained-glass" effect. Users scan by **shape + position**, not hue, and a rainbow palette:
- competes with the active-row amber accent (the actual signal),
- makes icons of similar luminance (sand/sky/lime) hard to distinguish on dark navy,
- fights the rest of the app's restrained navy/amber system documented in `mem://style/visual-theme-v2`.

**Recommend:** collapse to a 2-tone system — neutral (`text-sidebar-muted`) for inactive, amber for active/hover. Reserve color for *state*, not identity. If you want a chromatic touch, tint icons by **group** (4 hues) instead of per-item (10 hues).

### 2. Footer is cramped and inconsistent *(high impact)*
- 256px container holds avatar + 3 icon buttons; spacing is `gap-1` then `gap-0.5`, mixing rhythms.
- All footer icons are amber (`--sidebar-primary`) regardless of state — no visual difference between active Settings and inactive Help.
- Avatar uses `bg-sidebar-accent` (navy tint) while utility icons sit on transparent — different surface heights for peers.
- "Profile" icon duplicates the avatar's purpose (avatar → menu also includes profile-ish actions).

**Recommend:** drop the standalone Profile icon (it's redundant with the avatar dropdown), keep avatar + Settings + Help, equalize backgrounds, and move Help into the avatar menu if space stays tight.

### 3. Section-label hierarchy fights the brand *(medium)*
Labels are `Space Grotesk 13px bold uppercase tracking-[0.18em]` in **full-saturation amber**. This pulls more attention than the nav rows themselves, inverting the intended hierarchy (rows should be primary, labels secondary). The `visual-theme-v2` memory itself calls for "muted amber" group labels.

**Recommend:** drop to `text-[11px] font-semibold tracking-[0.16em]` at `--sidebar-group-foreground` with ~70% alpha, or switch to a desaturated warm-gray. Amber stays exclusive to active state + brand mark.

### 4. Two competing brand lockups *(medium)*
Sidebar shows the `koudou-mark-light.png` raster + "Koudou" wordmark, but `mem://features/sidebar-ia` specifies an **amber rounded-square tile + "Jobtrakr" wordmark** (the geometric-K is reserved for landing/favicon). The product is also branded **Jobtrakr**, not Koudou (per `mem://project/branding`).

**Recommend:** restore the amber tile + "Jobtrakr" wordmark in `font-display`. This is a brand-correctness bug, not just polish.

### 5. Jobs sub-list disclosure is awkward *(medium)*
The chevron is a separate button next to the NavLink, so clicking the row navigates while clicking the chevron expands — two targets, ~14px chevron, no keyboard affordance, and the expanded list (`max-h-48 overflow-y-auto`) creates a nested scroll inside an already-scrollable nav.

**Recommend:** either (a) make the row itself toggle the sub-list when already on `/jobs`, or (b) move recent jobs into a "Pinned" section above the main nav, or (c) drop the inline list and rely on the Jobs page for navigation.

### 6. Collapse toggle is hard to find *(medium)*
Floating 24px button at `-right-3 top-20` overlaps page content, has no tooltip, and uses `PanelLeftClose` / `PanelLeft` which are visually similar. Users routinely miss it.

**Recommend:** add a tooltip ("Collapse sidebar" / "Expand sidebar"), increase to 28px hit target, and consider also exposing the toggle via keyboard shortcut (`[`) with the shortcut hinted in the tooltip.

### 7. Inactive text contrast is borderline *(medium, accessibility)*
`--sidebar-muted: 220 12% 60%` on `--sidebar-background: 222 47% 11%` measures roughly 5.0:1 — passes AA for normal text but fails AA for the 12px group labels if you adopt recommendation #3 at low alpha. Worth re-checking with a contrast tool after changes.

### 8. No keyboard / screen-reader landmarks beyond the basics *(low/medium, a11y)*
- `aside` has `role="navigation"` + `aria-label="Main navigation"` ✓
- But group containers are plain `<div>` — should be `<section aria-labelledby>` or use `<ul>`/`<li>` so screen readers announce "Pipeline, list, 3 items."
- Active route should expose `aria-current="page"` (NavLink does this by default; verify it isn't being stripped).

### 9. Minor hygiene
- `BrandMark` import lives mid-file between other imports — move to top.
- `ICON_*` constants are unused once recommendation #1 lands — delete with the change.
- `TooltipProvider` is mounted twice (once inside collapsed branch, once inside expanded branch). Move it to the outer `AppSidebar` so it wraps both modes once.
- Hard-coded `top-20` on the toggle button breaks if the brand row height changes — anchor it to the brand row instead.

---

## Suggested next step

Pick the highest-leverage fixes first. A reasonable batch for one implementation pass:

1. Brand correction → amber tile + "Jobtrakr" wordmark (fixes #4).
2. Icon palette collapse to neutral / active-amber (fixes #1).
3. Section-label de-emphasis (fixes #3).
4. Footer rationalization: drop Profile glyph, equalize surfaces, add active-state contrast (fixes #2).
5. Collapse toggle tooltip + larger hit target (fixes #6).

Items #5 (Jobs sub-list), #7 (contrast verify), #8 (a11y semantics), and #9 (hygiene) can follow in a second pass.

Tell me which subset to implement and I'll switch to default mode and apply them.


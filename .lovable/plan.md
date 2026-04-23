

## Update BRAND.md with recent favicon + mark-padding changes

Bring `src/assets/brand/BRAND.md` in sync with the last two rounds of work: the K's "Confident" 14% padding inside the tile, and the full favicon suite with adaptive light/dark theming.

### Changes to BRAND.md

**1. Mark geometry section (new subsection under "Mark usage")**

Add a binding rule for the K's footprint inside the tile:

- The K fills **~72% of the tile height** ("Confident" padding, ~14% margin on each side). This is the locked density — matches modern app-icon conventions (Apple/Google) and prevents the "lost K" failure mode where the airy ~45% coverage made the mark read as a colored square at small sizes.
- Padding is baked into the PNG, not applied in CSS. If the K is ever re-exported, re-run the rescale (target 72% bbox height) before regenerating the dark variant.
- Edge classifier rule for the navy↔white swap: snap antialiased edge pixels to navy or white, never amber. Amber pixels are preserved only when they are unambiguously amber (closer to amber than to navy AND closer to amber than to white). This eliminates the amber-halo artifact that scaling antialiased edges can introduce.

**2. Favicon suite (new subsection at the end, "Favicons & app icons")**

Document the locked icon set in `public/` and the adaptive theming wiring in `index.html`:

| File | Size | Variant | Purpose |
|------|------|---------|---------|
| `public/favicon.ico` | multi (16/32/48) | dark-tile | Legacy fallback for older browsers |
| `public/favicon-16.png` | 16×16 | dark-tile | Browser tab (small) |
| `public/favicon-32.png` | 32×32 | dark-tile | Browser tab (retina) |
| `public/favicon-light.png` | 32×32 | dark-tile (navy on white) | Used when browser chrome is **light** |
| `public/favicon-dark.png` | 32×32 | light-tile (white on navy) | Used when browser chrome is **dark** |
| `public/apple-touch-icon.png` | 180×180 | dark-tile | iOS home screen |
| `public/icon-192.png` | 192×192 | dark-tile | PWA / Android home screen |
| `public/icon-512.png` | 512×512 | dark-tile | PWA splash |
| `public/favicon.png` | 512×512 | dark-tile | Generic fallback (kept in sync with `icon-512.png`) |

Adaptive-theming rule (binding):
- `index.html` uses `media="(prefers-color-scheme: dark)"` / `light` on the 32px favicon links so Safari/Firefox swap variants automatically. The contrast rule is the same as the in-app rule: **dark browser chrome → light-tile mark; light browser chrome → dark-tile mark**.
- Never collapse to a single favicon variant — that re-introduces the "mark disappears against matching surface" bug.

Regeneration recipe (so a future agent can rebuild the suite without guessing):
1. Hand-author / update `marks/koudou-mark-light.png` (light-tile master).
2. Run the per-pixel color-swap to produce `marks/koudou-mark-dark.png` (dark-tile sibling).
3. Downscale **both** masters with LANCZOS to produce the 16/32/180/192/512 PNGs above. Use the dark-tile master for everything except `favicon-dark.png`.
4. Build `favicon.ico` as a multi-resolution bundle (16/32/48) from the dark-tile master.
5. Copy the 512px dark-tile output to `public/favicon.png` to keep the generic fallback in sync.

**3. Wordmark color (small edit to existing "Sidebar surface" section)**

Confirm the locked wordmark color: "Koudou" wordmark on the navy rail is painted in **brand amber** (`text-sidebar-primary`, HSL `36 90% 55%`) — same token as the active-row bar and the mark's lower arm. This is already documented from the previous turn; verify the wording still reads as binding ("never white, never muted amber on the rail") and tighten if needed.

### Files touched

- `src/assets/brand/BRAND.md` — add the two new subsections above and tighten the wordmark line. No code changes.


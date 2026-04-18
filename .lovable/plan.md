
The user wants the Help icon (currently `HelpCircle` based on `HelpHint.tsx`) changed to a question mark.

Checking: lucide-react has `HelpCircle` (circle with `?`) and also a plain question mark via `CircleHelp` alias. The user likely means a plain `?` without the circle. The closest plain question mark in lucide-react is... actually lucide doesn't have a bare `?` icon. Options:
1. Use a styled text `?` character instead of an icon.
2. Keep `HelpCircle` (which already shows `?` inside a circle) — possibly already what's there.

Need to check where the Help icon is used. The sidebar likely has a separate Help icon too. Let me scope: `HelpHint.tsx` uses `HelpCircle`, and `AppSidebar.tsx` likely uses `LifeBuoy` or similar for "Help & Resources".

Plan: replace icon with a plain `?` character (text-based) in both `HelpHint` and the sidebar Help button, since that's the most literal interpretation of "question mark".

## Plan

**Files to update:**
1. `src/components/help/HelpHint.tsx` — replace `<HelpCircle />` icon with a styled `?` text character inside the existing circular button.
2. `src/components/AppSidebar.tsx` — find the "Help & Resources" entry and swap its icon to a `?` character (or use `HelpCircle` if a glyph is required for sidebar consistency).

**Approach:**
- For `HelpHint`: drop the lucide import, render `<span aria-hidden>?</span>` with appropriate font weight/size to match the existing 16px icon footprint.
- For sidebar: keep an icon component for layout consistency but switch to one that reads as a plain question mark, or render a `?` glyph in a small rounded box matching other sidebar icons.

No other behavior changes. Tooltip text and openHelp logic stay the same.

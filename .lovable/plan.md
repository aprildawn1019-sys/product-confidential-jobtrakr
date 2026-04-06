

## Mobile Responsiveness Plan

### Problem Summary

The app has several critical mobile issues:

1. **Fixed sidebar blocks entire screen** — The 256px (`w-64`) sidebar is always visible with `fixed left-0`, and main content has a hard `ml-64` offset. On mobile, the sidebar covers the viewport and content is pushed off-screen.
2. **No mobile navigation** — There is no hamburger menu, drawer, or any way to toggle the sidebar on small screens.
3. **Landing page** — Needs review for text sizing, image scaling, and button layout on small screens.
4. **Dashboard/page layouts** — Grid layouts and card content mostly use responsive classes (`sm:`, `lg:`) already, but some areas have fixed widths or dense layouts that need touch-friendly spacing.

### Plan

#### 1. Add mobile sidebar with hamburger toggle

- Update `AppSidebar` to accept an `open` prop and render as a slide-over drawer (using the existing `Sheet` component) on mobile, and as the current fixed sidebar on desktop.
- Create a `MobileHeader` bar (sticky top, visible only below `md` breakpoint) with the app logo, a hamburger button to open the sidebar sheet, and a sign-out icon.
- Use the existing `useIsMobile` hook to switch between desktop sidebar and mobile sheet.

#### 2. Fix main layout in Index.tsx

- Remove the hard-coded `ml-64` on the `<main>` tag. Use `md:ml-64` so content is full-width on mobile.
- Reduce padding from `p-8` to `p-4 md:p-8`.

#### 3. Landing page mobile polish

- Ensure hero text uses responsive font sizes (`text-3xl md:text-5xl`).
- Stack CTA buttons vertically on mobile.
- Make the mockup image scale properly with `max-w-full`.
- Adjust nav bar for small screens.

#### 4. Touch-friendly adjustments across pages

- Ensure interactive elements (buttons, cards, selects) have adequate tap targets (min 44px).
- Review Kanban board for horizontal scroll on mobile.
- Ensure dialogs and popovers are usable on small screens (they already use Radix, which handles this reasonably).

### Files to modify

| File | Change |
|---|---|
| `src/components/AppSidebar.tsx` | Wrap in Sheet on mobile; accept open/onClose props |
| `src/pages/Index.tsx` | Add MobileHeader; responsive margin/padding on main |
| `src/pages/Landing.tsx` | Responsive text, button stacking, image sizing |
| `src/pages/Dashboard.tsx` | Minor spacing tweaks if needed |
| `src/hooks/use-mobile.tsx` | Already exists, no changes needed |


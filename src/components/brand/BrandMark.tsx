import { cn } from "@/lib/utils";
import koudouMarkLightSrc from "@/assets/brand/marks/koudou-mark-light.png";
import koudouMarkDarkSrc from "@/assets/brand/marks/koudou-mark-dark.png";

/**
 * BrandMark — single source for the Koudou geometric-K mark.
 *
 * One component, one prop (`size`), one render path. Callers do **not** pass
 * Tailwind sizing classes; doing so re-introduces the drift this component
 * was created to remove (h-9 vs h-10 vs h-8 across surfaces).
 *
 * ## Variant selection
 * Both light and dark variants render in the DOM; `dark:` utilities toggle
 * visibility. This makes the swap automatic with the app theme — no JS, no
 * flash. See `mem://style/brand-mark` and `src/assets/brand/BRAND.md`.
 *
 * Surface override: pass `surface="dark"` for a permanently-dark surface
 * (e.g. the navy sidebar) where we want the dark-pane variant regardless of
 * the user's color-scheme preference. Default `surface="auto"` follows theme.
 *
 * ## Sizing tokens
 * The painted tile is part of the asset, so the `<img>` IS the mark — there
 * is no wrapper, no `rounded-*` (the asset has its own corners), and no
 * decorative class slot. Size tokens map to the canonical surfaces:
 *
 * | token | px      | used on                                              |
 * |-------|---------|------------------------------------------------------|
 * | `sm`  | 20×20   | Landing footer                                       |
 * | `md`  | 36×36   | Sidebar (expanded), Landing nav, Getting Started hero|
 * | `lg`  | 40×40   | Sidebar (collapsed)                                  |
 *
 * If a new surface needs a different size, add a token here — do NOT add an
 * inline `className="h-..."` at the call site.
 */

type BrandMarkSize = "sm" | "md" | "lg";
type BrandMarkSurface = "auto" | "light" | "dark";

const SIZE_CLASSES: Record<BrandMarkSize, string> = {
  sm: "h-5 w-5",
  md: "h-9 w-9",
  lg: "h-10 w-10",
};

interface BrandMarkProps {
  size?: BrandMarkSize;
  surface?: BrandMarkSurface;
  /**
   * Escape hatch for layout-only utilities (e.g. positioning).
   * Do NOT pass `h-*`/`w-*`/`rounded-*` here — use `size` instead.
   */
  className?: string;
}

export function BrandMark({
  size = "md",
  surface = "auto",
  className,
}: BrandMarkProps) {
  const sizeCls = SIZE_CLASSES[size];

  if (surface === "light") {
    return (
      <img
        src={koudouMarkLightSrc}
        alt="Koudou"
        className={cn("shrink-0", sizeCls, className)}
      />
    );
  }

  if (surface === "dark") {
    return (
      <img
        src={koudouMarkDarkSrc}
        alt="Koudou"
        className={cn("shrink-0", sizeCls, className)}
      />
    );
  }

  // surface="auto": render both, toggle with `dark:`. The light variant
  // owns the alt text; the dark variant is decorative duplicate content.
  return (
    <>
      <img
        src={koudouMarkLightSrc}
        alt="Koudou"
        className={cn("shrink-0 dark:hidden", sizeCls, className)}
      />
      <img
        src={koudouMarkDarkSrc}
        alt=""
        aria-hidden="true"
        className={cn("hidden shrink-0 dark:block", sizeCls, className)}
      />
    </>
  );
}

export default BrandMark;

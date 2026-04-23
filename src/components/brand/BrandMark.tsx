import { cn } from "@/lib/utils";
import koudouMarkLightSrc from "@/assets/brand/marks/koudou-mark-light.png";
import koudouMarkDarkSrc from "@/assets/brand/marks/koudou-mark-dark.png";

/**
 * BrandMark — single source for the Koudou geometric-K mark.
 *
 * One component, one prop pair (`size`, `surface`), one render path. Callers
 * do **not** pass Tailwind sizing classes; doing so re-introduces the drift
 * this component was created to remove (h-9 vs h-10 vs h-8 across surfaces).
 *
 * ## Variant selection — INVERTED CONTRAST RULE
 *
 * The `surface` prop describes **the surface the mark sits on**, not the
 * appearance of the mark itself. The component picks the inverted-contrast
 * asset so the mark always pops:
 *
 *   surface="dark"  → loads `koudou-mark-light.png` (white tile, navy K)
 *                     for use on the navy sidebar / dark hero.
 *   surface="light" → loads `koudou-mark-dark.png`  (navy tile, white K)
 *                     for use on the off-white app canvas / white cards.
 *   surface="auto"  → renders both; `dark:` utilities toggle visibility so
 *                     the swap follows the user's color-scheme preference
 *                     with no JS and no flash.
 *
 * This is the contrast rule defined in `src/assets/brand/BRAND.md` ("Mark
 * usage"). Do NOT bypass this component by importing the PNGs directly —
 * the mapping intentionally lives in one place so the rule cannot be
 * violated by accident.
 *
 * ## Sizing tokens
 * The painted tile is part of the asset, so the `<img>` IS the mark — there
 * is no wrapper, no `rounded-*` (the asset has its own corners), and no
 * decorative class slot. Size tokens map to the canonical surfaces:
 *
 * | token | px      | used on                                              |
 * |-------|---------|------------------------------------------------------|
 * | `sm`  | 20×20   | Landing footer                                       |
 * | `md`  | 36×36   | Sidebar (expanded), Landing nav, Getting Started hero (mobile) |
 * | `lg`  | 40×40   | Sidebar (collapsed), Getting Started hero (≥sm)      |
 *
 * If a new surface needs a different size, add a token here — do NOT add an
 * inline `className="h-..."` at the call site.
 *
 * ## Crispness contract
 * Source PNGs are 1024×1024 (well above the largest rendered token × 3× DPR
 * = 120 device px), so a single `src` is enough — no per-DPR `srcset` files
 * are required. To keep that headroom honest we set explicit width/height
 * (intrinsic box, no fractional-pixel guesses), `decoding="async"`,
 * `loading="eager"`, and a `srcSet` declaring 3× DPR headroom so the
 * browser uses high-quality downsampling.
 */

type BrandMarkSize = "sm" | "md" | "lg";
type BrandMarkSurface = "auto" | "light" | "dark";

const SIZE_PX: Record<BrandMarkSize, number> = {
  sm: 20,
  md: 36,
  lg: 40,
};

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

interface MarkImgProps {
  src: string;
  alt: string;
  ariaHidden?: boolean;
  size: BrandMarkSize;
  className?: string;
}

/**
 * Internal renderer. Centralizes the crispness attributes so we never ship
 * an `<img>` of the brand mark without intrinsic dimensions + DPR-aware
 * srcSet, regardless of which surface variant is rendered.
 */
function MarkImg({ src, alt, ariaHidden, size, className }: MarkImgProps) {
  const px = SIZE_PX[size];
  return (
    <img
      src={src}
      srcSet={`${src} 3x`}
      width={px}
      height={px}
      alt={alt}
      aria-hidden={ariaHidden ? "true" : undefined}
      decoding="async"
      loading="eager"
      draggable={false}
      className={cn("shrink-0", className)}
    />
  );
}

export function BrandMark({
  size = "md",
  surface = "auto",
  className,
}: BrandMarkProps) {
  const sizeCls = SIZE_CLASSES[size];

  // Inverted-contrast mapping — see BRAND.md "Mark usage".
  // surface="dark"  (sidebar, dark hero)  → light-tile asset
  // surface="light" (canvas, white card)  → dark-tile asset
  if (surface === "dark") {
    return (
      <MarkImg
        src={koudouMarkLightSrc}
        alt="Koudou"
        size={size}
        className={cn(sizeCls, className)}
      />
    );
  }

  if (surface === "light") {
    return (
      <MarkImg
        src={koudouMarkDarkSrc}
        alt="Koudou"
        size={size}
        className={cn(sizeCls, className)}
      />
    );
  }

  // surface="auto": render both, toggle with `dark:` so the variant follows
  // the active color scheme. In light mode the dark-tile (navy) pops off
  // the white canvas; in dark mode the light-tile (white) pops off the
  // dark canvas.
  return (
    <>
      <MarkImg
        src={koudouMarkDarkSrc}
        alt="Koudou"
        size={size}
        className={cn("dark:hidden", sizeCls, className)}
      />
      <MarkImg
        src={koudouMarkLightSrc}
        alt=""
        ariaHidden
        size={size}
        className={cn("hidden dark:block", sizeCls, className)}
      />
    </>
  );
}

export default BrandMark;

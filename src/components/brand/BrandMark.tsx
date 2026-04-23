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
 * | `md`  | 36×36   | Sidebar (expanded), Landing nav, Getting Started hero (mobile) |
 * | `lg`  | 40×40   | Sidebar (collapsed), Getting Started hero (≥sm)      |
 *
 * If a new surface needs a different size, add a token here — do NOT add an
 * inline `className="h-..."` at the call site.
 *
 * ## Crispness contract
 * Source PNGs are 1024×1024 (well above the largest rendered token × 3× DPR
 * = 120 device px), so a single `src` is enough — no per-DPR `srcset` files
 * are required. To keep that headroom honest we:
 *
 * - Set explicit `width`/`height` attributes equal to the CSS-pixel size,
 *   so the browser allocates the exact intrinsic box and never has to guess
 *   on a fractional pixel boundary (which is what produces the "scaling
 *   blur" artifact users perceive).
 * - Add `decoding="async"` + `loading="eager"` for above-the-fold paint.
 * - Add `srcSet` declaring the asset's intrinsic resolution density (`3x`
 *   relative to our largest 40-px token) so the browser knows it has spare
 *   pixels and can downsample with high-quality resampling instead of
 *   bilinear stretching from an undersized source.
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
      // Single high-res source declared at 3× the largest size token. Tells
      // the browser this asset has DPR headroom so it picks high-quality
      // downsampling on retina/3× displays instead of bilinear-blurring from
      // an undersized bitmap. (Source PNGs are 1024², far above this floor.)
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

  if (surface === "light") {
    return (
      <MarkImg
        src={koudouMarkLightSrc}
        alt="Koudou"
        size={size}
        className={cn(sizeCls, className)}
      />
    );
  }

  if (surface === "dark") {
    return (
      <MarkImg
        src={koudouMarkDarkSrc}
        alt="Koudou"
        size={size}
        className={cn(sizeCls, className)}
      />
    );
  }

  // surface="auto": render both, toggle with `dark:`. The light variant
  // owns the alt text; the dark variant is decorative duplicate content.
  return (
    <>
      <MarkImg
        src={koudouMarkLightSrc}
        alt="Koudou"
        size={size}
        className={cn("dark:hidden", sizeCls, className)}
      />
      <MarkImg
        src={koudouMarkDarkSrc}
        alt=""
        ariaHidden
        size={size}
        className={cn("hidden dark:block", sizeCls, className)}
      />
    </>
  );
}

export default BrandMark;

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Avatar for an *organization*. Rendering rules — kept aligned with
 * ContactAvatar so people + companies feel consistent across the app:
 *
 *   1. If we can resolve a logo URL → show it.
 *      - Explicit `logoUrl` wins (e.g. user-supplied or scraped).
 *      - Otherwise we derive a domain from `website` (preferred) or by
 *        slugifying the company name (`acme-corp` → `acmecorp.com`) and
 *        try a CASCADE of free public logo sources, best-quality first:
 *          a. Clearbit's free logo CDN — transparent PNGs of actual
 *             brand marks. Officially deprecated in 2023, so coverage
 *             is shrinking; used as a quality upgrade when it works.
 *          b. Google's favicon service (s2/favicons) — works for any
 *             indexed domain, sz=128 keeps it crisp at our chip sizes.
 *             Broad coverage fallback.
 *      - On <img> error we advance to the next candidate; once all
 *        sources are exhausted we render the initial-chip fallback.
 *   2. On final image error / no logo URL → render the deterministic
 *      colored initial chip ("brand" tone) or the muted round chip
 *      ("neutral" tone for decorative surfaces like Next steps /
 *      Upcoming interviews).
 *
 * The image is wrapped in the same chip dimensions / radius as the
 * fallback so swapping a logo in/out is visually seamless.
 */

const palette = [
  "bg-info text-info-foreground",
  "bg-warning text-warning-foreground",
  "bg-success text-success-foreground",
  "bg-destructive text-destructive-foreground",
  "bg-primary text-primary-foreground",
  "bg-accent text-accent-foreground",
  "bg-[hsl(280,60%,50%)] text-white",
  "bg-[hsl(340,65%,50%)] text-white",
];

function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * Best-effort domain extraction. Returns a bare host (`acme.com`) suitable
 * for logo endpoints, or null if we can't derive anything sane.
 */
function deriveDomain(opts: { website?: string | null; company: string }): string | null {
  const { website, company } = opts;
  if (website) {
    try {
      const withProto = website.startsWith("http") ? website : `https://${website}`;
      const url = new URL(withProto);
      const host = url.hostname.replace(/^www\./i, "").toLowerCase();
      if (host && host.includes(".")) return host;
    } catch {
      // fall through to name-based guess
    }
  }
  const slug = company
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
  // Names like "X" or empty strings produce useless guesses; skip to avoid
  // a guaranteed wasted request.
  if (slug.length < 2) return null;
  return `${slug}.com`;
}

/**
 * Build the cascade of logo URLs to try, best-quality-first.
 * - Explicit `logoUrl` always comes first when present.
 * - Clearbit gives transparent brand marks when it has the company.
 * - Google favicon is the broad-coverage fallback (sz=128 for retina).
 */
function buildLogoCandidates(opts: {
  logoUrl?: string | null;
  website?: string | null;
  company: string;
}): string[] {
  const candidates: string[] = [];
  if (opts.logoUrl) candidates.push(opts.logoUrl);
  const domain = deriveDomain({ website: opts.website, company: opts.company });
  if (domain) {
    candidates.push(`https://logo.clearbit.com/${domain}`);
    candidates.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  }
  return candidates;
}

interface CompanyAvatarProps {
  company: string;
  /** Explicit logo URL (e.g. from `target_companies.logo_url`). Wins over derived. */
  logoUrl?: string | null;
  /** Company website, used to derive a logo domain when `logoUrl` is absent. */
  website?: string | null;
  size?: "sm" | "md" | "lg";
  /**
   * "brand" (default) — deterministic colored square; good for company recognition surfaces
   *   (Jobs, Target Companies, Cover Letters).
   * "neutral" — soft round muted avatar matching dashboard-mockup.jpg next-step rows.
   *   Use on Command Center Next steps + Upcoming interviews where the avatar is decorative,
   *   not the primary recognition cue.
   */
  tone?: "brand" | "neutral";
  /**
   * When true, skip the logo cascade entirely and always render the
   * deterministic initial chip. Use on decorative surfaces (e.g. Command
   * Center Next Steps) where rows aren't always companies and Google's
   * favicon fallback returns wrong/random glyphs for non-company seeds.
   */
  disableLogoFetch?: boolean;
  className?: string;
}

export default function CompanyAvatar({
  company,
  logoUrl,
  website,
  size = "sm",
  tone = "brand",
  disableLogoFetch = false,
  className,
}: CompanyAvatarProps) {
  // Index into the candidate cascade. When the current src errors, we bump
  // the index to try the next source. -1 sentinel means "all sources
  // exhausted, render the initial-chip fallback".
  const candidates = useMemo(
    () => (disableLogoFetch ? [] : buildLogoCandidates({ logoUrl, website, company })),
    [disableLogoFetch, logoUrl, website, company],
  );
  const [idx, setIdx] = useState(0);

  // Reset cascade when inputs change (e.g. parent updates company prop).
  useEffect(() => {
    setIdx(0);
  }, [candidates]);

  const initial = company.charAt(0).toUpperCase();
  const dim =
    size === "lg" ? "h-10 w-10 text-base" : size === "md" ? "h-9 w-9 text-sm" : "h-8 w-8 text-sm";

  // Round chip for neutral tone, square (rounded) for brand — matches prior behavior.
  const shape = tone === "neutral" ? "rounded-full" : "rounded-lg";

  const currentSrc = idx >= 0 && idx < candidates.length ? candidates[idx] : null;
  const showImage = !!currentSrc;

  // Fallback chip styling depends on tone, mirroring the original component.
  const fallbackChipClass =
    tone === "neutral"
      ? "bg-muted text-muted-foreground/80 ring-1 ring-border/60"
      : palette[hashStr(company.toLowerCase()) % palette.length];

  const baseChip = cn(
    "flex items-center justify-center font-semibold shrink-0 overflow-hidden",
    shape,
    dim,
    className,
  );

  if (showImage) {
    return (
      <div
        className={cn(baseChip, "bg-background ring-1 ring-border/60")}
        aria-label={company}
      >
        <img
          // key forces a fresh <img> when we advance the cascade so the
          // browser actually retries instead of caching the failed state.
          key={currentSrc}
          src={currentSrc ?? undefined}
          alt={`${company} logo`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            // Advance to the next candidate; -1 once exhausted to render
            // the deterministic initial chip.
            setIdx((i) => (i + 1 < candidates.length ? i + 1 : -1));
          }}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(baseChip, fallbackChipClass, tone === "brand" && "font-bold")}
      aria-hidden={tone === "neutral" ? "true" : undefined}
      aria-label={tone === "brand" ? company : undefined}
    >
      {initial}
    </div>
  );
}

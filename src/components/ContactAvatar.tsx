import { useEffect, useState } from "react";
import { Loader2, AlertCircle, ShieldOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useDisableLinkedInAvatars,
  useDenseAvatarTooltips,
} from "@/lib/privacyPrefs";

/**
 * Subscribes to the user's OS-level "reduced motion" preference. Returns
 * `true` when motion should be minimized — components use this to swap
 * spinning indicators for a static fallback so users with vestibular
 * sensitivities (or who simply prefer calmer UIs) don't get continuous
 * rotation animation. SSR-safe: defaults to `false` when `window` /
 * `matchMedia` aren't available.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Older Safari only supports addListener/removeListener; guard for both.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  return reduced;
}

/**
 * True when `url` points at a LinkedIn photo — either the raw CDN
 * (`media.licdn.com`) or our cached copy in the `linkedin-avatars`
 * Supabase storage bucket. The privacy toggle uses this to decide
 * whether to suppress the image and force initials rendering.
 */
function isLinkedInDerivedAvatar(url: string): boolean {
  return /(^|\.)licdn\.com\//i.test(url) || /\/linkedin-avatars\//i.test(url);
}

/**
 * Avatar for a *person* (vs. CompanyAvatar which is for organizations).
 *
 * Rendering rules:
 *   1. If `avatarUrl` is present → try to load it, showing a small spinner
 *      overlay until the image either loads or fails.
 *   2. If the image 404s / 403s (LinkedIn CDN blocks third-party hotlinks)
 *      → fall back to initials AND show a tiny ⓘ indicator in the corner.
 *      The indicator carries a tooltip explaining *why* the photo isn't
 *      shown so users don't think the app is broken.
 *   3. If no URL → just initials, no indicator (nothing to explain).
 */

interface ContactAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  /**
   * Marks this avatar as part of a dense surface (tables, kanban cards,
   * sidebar lists). When the user has opted out of dense-list avatar
   * tooltips in Settings → Privacy, dense avatars will skip the
   * tooltip + focusable wrapper but keep the visual error/privacy badge.
   * Non-dense (`false`, the default) avatars always get tooltips.
   */
  dense?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

type ImgState = "loading" | "loaded" | "failed";

export default function ContactAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  dense = false,
}: ContactAvatarProps) {
  // Whether dense surfaces should still attach explanatory tooltips.
  // Defaults to true; users can opt out in Settings → Privacy.
  const denseTooltipsEnabled = useDenseAvatarTooltips();
  // Privacy preference: when the user disables LinkedIn avatars, we treat
  // any LinkedIn-derived URL as if it weren't present at all and render
  // initials with a small "privacy on" indicator instead.
  const privacyDisabled = useDisableLinkedInAvatars();
  // Honor the OS-level reduced-motion setting: when enabled, the spinner
  // overlay swaps to a static dot so we don't run a continuous rotation
  // on every avatar in long lists (a known accessibility pain point for
  // users with vestibular disorders).
  const prefersReducedMotion = usePrefersReducedMotion();
  const isLinkedInPhoto = !!avatarUrl && isLinkedInDerivedAvatar(avatarUrl);
  const suppressedByPrivacy = privacyDisabled && isLinkedInPhoto;

  // Effective URL — null when privacy mode hides it, so the rest of the
  // component falls into the initials path naturally.
  const effectiveUrl = suppressedByPrivacy ? null : avatarUrl;

  // Start in "loading" if we have a URL to try, otherwise skip straight to
  // the initials path (treated as "failed" only conceptually — we don't
  // show the error indicator unless there was actually a URL to load).
  const [imgState, setImgState] = useState<ImgState>(effectiveUrl ? "loading" : "loaded");

  // Reset whenever the URL changes so a contact swap doesn't leave the
  // component stuck in a stale "failed" state.
  useEffect(() => {
    setImgState(effectiveUrl ? "loading" : "loaded");
  }, [effectiveUrl]);

  const dim =
    size === "lg"
      ? "h-14 w-14 text-base"
      : size === "sm"
      ? "h-8 w-8 text-xs"
      : "h-10 w-10 text-sm";

  // Indicator size scales with the avatar so it stays proportional and
  // doesn't overwhelm the small (sm) variant used in dense lists.
  const indicatorSize =
    size === "lg" ? "h-4 w-4" : size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  const hasUrl = !!effectiveUrl;
  const showImage = hasUrl && imgState !== "failed";
  const showFailedIndicator = hasUrl && imgState === "failed";
  const showLoadingOverlay = hasUrl && imgState === "loading";
  // Privacy badge replaces the "failed" badge when we deliberately hid the
  // photo. Mutually exclusive — privacy wins because it's a user choice,
  // not an error condition.
  const showPrivacyIndicator = suppressedByPrivacy;

  // Build the polite, screen-reader-only status string that mirrors the
  // current visual state of the avatar. We keep it concise and only emit
  // a value once the state has actually transitioned away from the
  // initial render — otherwise SRs would announce "loading" on every
  // mount, which is noisy on lists of avatars.
  //
  // States announced:
  //   - "loading" → "Loading profile photo for {name}"
  //   - "loaded"  → "Profile photo for {name} loaded"
  //   - "failed"  → "Profile photo for {name} unavailable, showing initials"
  //   - privacy   → "Profile photo for {name} hidden by privacy settings"
  // When there's no URL at all, we emit nothing — initials-only avatars
  // don't need an extra announcement beyond the wrapper's aria-label.
  let statusMessage = "";
  if (showPrivacyIndicator) {
    statusMessage = `Profile photo for ${name} hidden by privacy settings.`;
  } else if (hasUrl) {
    if (imgState === "loading") statusMessage = `Loading profile photo for ${name}.`;
    else if (imgState === "loaded") statusMessage = `Profile photo for ${name} loaded.`;
    else if (imgState === "failed")
      statusMessage = `Profile photo for ${name} unavailable. Showing initials instead.`;
  }

  // Accessibility:
  //   - The wrapper carries `role="img"` + `aria-label={name}` so screen
  //     readers always announce *one* name per avatar (not two — the
  //     inner <img> uses alt="" to opt out of being announced separately).
  //   - The initials <span> is `aria-hidden` because the role="img" name
  //     is the canonical announcement.
  //   - The corner failure indicator is decorative; its meaning is
  //     conveyed through the tooltip, which is wired up below.
  //   - A visually-hidden polite live region sits next to the image and
  //     announces transitions (loading → loaded/failed) so non-sighted
  //     users get parity with the spinner / corner badge UI. `role=status`
  //     + `aria-live=polite` ensures updates don't interrupt other speech.
  const avatarNode = (
    <div
      role="img"
      aria-label={name}
      className={cn(
        "relative flex items-center justify-center rounded-full overflow-hidden shrink-0",
        "bg-primary font-display font-bold text-primary-foreground",
        dim,
        className,
      )}
    >
      {showImage ? (
        <img
          src={effectiveUrl ?? undefined}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setImgState("loaded")}
          onError={() => setImgState("failed")}
          className={cn(
            "h-full w-full object-cover transition-opacity",
            imgState === "loading" ? "opacity-0" : "opacity-100",
          )}
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}

      {/* Loading indicator overlays the initials placeholder so there's
          a subtle hint that we're trying to fetch a photo. The initials
          remain visible behind it as a graceful fallback.

          When the user prefers reduced motion, we swap the spinning
          loader for a static, dimmed dot — the visual cue (something
          is loading here) is preserved without the continuous rotation
          that can trigger vestibular discomfort. The polite live region
          elsewhere in this component still announces the state change
          to assistive tech, so no information is lost. */}
      {showLoadingOverlay && (
        <span
          className="absolute inset-0 flex items-center justify-center bg-primary/60"
          aria-hidden="true"
        >
          {prefersReducedMotion ? (
            <span
              className={cn(
                "rounded-full bg-primary-foreground/80",
                // Render the static fallback at roughly half the icon
                // size so it reads as a "pending" dot rather than a
                // full-blown indicator competing with the initials.
                size === "lg" ? "h-2 w-2" : size === "sm" ? "h-1.5 w-1.5" : "h-1.5 w-1.5",
              )}
            />
          ) : (
            <Loader2 className={cn("animate-spin text-primary-foreground", indicatorSize)} />
          )}
        </span>
      )}

      {/* Tiny corner badge that appears only when an image URL was present
          but failed to load. Decorative — the wrapping tooltip carries
          the explanatory text. */}
      {showFailedIndicator && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full",
            "bg-background ring-1 ring-border text-muted-foreground",
            indicatorSize,
          )}
          aria-hidden="true"
        >
          <AlertCircle className="h-full w-full p-[1px]" />
        </span>
      )}

      {/* Privacy badge: shown when the photo was suppressed by the user's
          "disable LinkedIn avatars" preference. Uses a different icon
          (shield) and accent so it's distinguishable from the failure
          state at a glance. */}
      {showPrivacyIndicator && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full",
            "bg-background ring-1 ring-border text-primary",
            indicatorSize,
          )}
          aria-hidden="true"
        >
          <ShieldOff className="h-full w-full p-[1px]" />
        </span>
      )}

      {/* Polite live region — visually hidden, but screen readers will
          announce the message whenever it changes (e.g. spinner → image
          loaded, or image → fallback initials). Empty string skips the
          announcement entirely, which is what we want for initials-only
          avatars where there's nothing to report. */}
      {statusMessage && (
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {statusMessage}
        </span>
      )}
    </div>
  );

  // Only wrap in a tooltip when there's something to explain — avoids
  // attaching listeners to every avatar in long lists.
  if (!showFailedIndicator && !showPrivacyIndicator) {
    return avatarNode;
  }

  // User-controlled escape hatch: when this avatar lives in a dense
  // surface and the user has opted out of dense tooltips, skip the
  // tooltip + focusable button entirely. The visual corner badge stays
  // so the state is still discoverable; the wrapper's aria-label still
  // announces the contact name to screen readers.
  if (dense && !denseTooltipsEnabled) {
    return avatarNode;
  }

  // Choose the explanatory copy based on which indicator is showing.
  // Privacy takes precedence (and is mutually exclusive in practice
  // because suppressedByPrivacy hides the URL before it can fail).
  const tooltipLabel = showPrivacyIndicator
    ? `${name} — LinkedIn photo hidden by privacy settings.`
    : `${name} — profile photo unavailable. Why?`;
  const tooltipBody = showPrivacyIndicator
    ? "LinkedIn photos are hidden because you disabled avatar proxying in Settings → Privacy. Initials are shown instead."
    : "Profile photo unavailable. LinkedIn blocks third-party apps from displaying member photos, so we're using initials instead.";

  // Radix Tooltip requires a focusable trigger so keyboard users can
  // discover the explanation. We wrap the avatar in a real <button> with
  // `type="button"` so it doesn't accidentally submit any parent <form>,
  // and `tabIndex={0}` is implicit on buttons. The button itself has no
  // visible chrome — focus shows through the visible focus ring on the
  // avatar's rounded outline via `focus-visible:ring`.
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={tooltipLabel}
            className={cn(
              "rounded-full inline-flex shrink-0",
              // WCAG 2.1 SC 1.4.11 (non-text contrast ≥ 3:1) and 2.4.7 (visible focus):
              //   - Inner ring is the page background color so the focus indicator
              //     reads as a crisp gap on any surface (cards, sidebar, dialogs)
              //     in both light and dark themes.
              //   - Outer ring uses --ring (navy in light, amber-tinted in dark via
              //     sidebar surfaces) at full opacity and 3px thickness, giving
              //     well over the 3:1 contrast minimum against both the avatar's
              //     primary fill and the surrounding surface tokens.
              "focus:outline-none",
              "focus-visible:outline-none",
              "focus-visible:ring-[3px] focus-visible:ring-ring",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            {avatarNode}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {tooltipBody}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

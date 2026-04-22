import { useEffect, useState } from "react";
import { Loader2, AlertCircle, ShieldOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDisableLinkedInAvatars } from "@/lib/privacyPrefs";

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
 * True when the URL is a *raw* LinkedIn CDN URL that did NOT go through
 * our caching proxy. These are the high-risk loads — LinkedIn's CDN
 * actively blocks third-party hot-linking, so they almost always 403.
 * We surface a slightly different failure message in this case so users
 * understand a "Refresh avatar" action will likely fix the problem.
 */
function isRawLinkedInUrl(url: string): boolean {
  return /(^|\.)licdn\.com\//i.test(url);
}

/** Hard ceiling on how long we wait before treating the image as failed. */
const LOAD_TIMEOUT_MS = 8000;

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
}: ContactAvatarProps) {
  // Privacy preference: when the user disables LinkedIn avatars, we treat
  // any LinkedIn-derived URL as if it weren't present at all and render
  // initials with a small "privacy on" indicator instead.
  const privacyDisabled = useDisableLinkedInAvatars();
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

  // Watchdog: if the browser never fires onLoad/onError (network stall,
  // hung CDN, blocked by an ad blocker, etc.) the spinner would spin
  // forever. After LOAD_TIMEOUT_MS we give up and fall through to the
  // initials + error indicator path so the UI keeps moving.
  useEffect(() => {
    if (!effectiveUrl || imgState !== "loading") return;
    const t = window.setTimeout(() => {
      setImgState((prev) => (prev === "loading" ? "failed" : prev));
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [effectiveUrl, imgState]);

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

  // Accessibility:
  //   - The wrapper carries `role="img"` + `aria-label={name}` so screen
  //     readers always announce *one* name per avatar (not two — the
  //     inner <img> uses alt="" to opt out of being announced separately).
  //   - The initials <span> is `aria-hidden` because the role="img" name
  //     is the canonical announcement.
  //   - The corner failure indicator is decorative; its meaning is
  //     conveyed through the tooltip, which is wired up below.
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
      {/* Initials always render in the background. While the image is
          loading they show through the transparent <img>; if the image
          fails or is suppressed they become the only visible content.
          Marked aria-hidden because the wrapper's role="img"+aria-label
          already announces the contact name. */}
      {!showImage && <span aria-hidden="true">{getInitials(name)}</span>}
      {showImage && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center"
          >
            {getInitials(name)}
          </span>
          <img
            src={effectiveUrl ?? undefined}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => setImgState("loaded")}
            onError={() => setImgState("failed")}
            className={cn(
              "relative h-full w-full object-cover transition-opacity",
              imgState === "loading" ? "opacity-0" : "opacity-100",
            )}
          />
        </>
      )}

      {/* Loading overlay: dims the initials behind a spinner so users see
          "we're working on it" rather than initials snapping to a photo
          with no transition. The visible spinner is decorative; the
          aria-live region below carries the announcement for AT users. */}
      {showLoadingOverlay && (
        <>
          <span
            className="absolute inset-0 flex items-center justify-center bg-primary/60"
            aria-hidden="true"
          >
            <Loader2 className={cn("animate-spin text-primary-foreground", indicatorSize)} />
          </span>
          <span role="status" aria-live="polite" className="sr-only">
            Loading profile photo for {name}
          </span>
        </>
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
    </div>
  );

  // Only wrap in a tooltip when there's something to explain — avoids
  // attaching listeners to every avatar in long lists.
  if (!showFailedIndicator && !showPrivacyIndicator) {
    return avatarNode;
  }

  // Choose the explanatory copy based on which indicator is showing.
  // Privacy takes precedence (and is mutually exclusive in practice
  // because suppressedByPrivacy hides the URL before it can fail).
  // For failures we further distinguish raw LinkedIn URLs (proxy
  // didn't run) from cached/proxied URLs that still failed (network
  // stall, deleted bucket object, etc.) so the suggested next step
  // matches reality.
  const isRawFailure =
    showFailedIndicator && !!effectiveUrl && isRawLinkedInUrl(effectiveUrl);
  const tooltipLabel = showPrivacyIndicator
    ? `${name} — LinkedIn photo hidden by privacy settings.`
    : `${name} — profile photo unavailable. Why?`;
  const tooltipBody = showPrivacyIndicator
    ? "LinkedIn photos are hidden because you disabled avatar proxying in Settings → Privacy. Initials are shown instead."
    : isRawFailure
    ? "This contact's photo is a direct LinkedIn URL that the browser can't load. Use \u201CRefresh avatar\u201D to fetch and cache a fresh copy through our proxy."
    : "Profile photo unavailable. The cached image couldn't be loaded — try \u201CRefresh avatar\u201D to fetch the latest version from LinkedIn.";

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
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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

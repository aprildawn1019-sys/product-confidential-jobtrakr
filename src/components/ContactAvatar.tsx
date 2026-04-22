import { cn } from "@/lib/utils";

/**
 * Avatar for a *person* (vs. CompanyAvatar which is for organizations).
 *
 * We always render initials for contacts. We previously attempted to use
 * LinkedIn profile photos (and a DiceBear fallback), but LinkedIn's CDN
 * blocks third-party hotlinking — every URL we captured rendered as a
 * broken image. Initials are predictable, accessible, and never break.
 *
 * The `avatarUrl` prop is intentionally accepted but ignored so existing
 * call sites and stored data don't need to change in lockstep.
 */

interface ContactAvatarProps {
  name: string;
  /** Accepted for back-compat; intentionally ignored. */
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

export default function ContactAvatar({
  name,
  size = "md",
  className,
}: ContactAvatarProps) {
  const dim =
    size === "lg"
      ? "h-14 w-14 text-base"
      : size === "sm"
        ? "h-8 w-8 text-xs"
        : "h-10 w-10 text-sm";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full overflow-hidden shrink-0",
        "bg-primary font-display font-bold text-primary-foreground",
        dim,
        className,
      )}
      aria-label={name}
    >
      <span aria-hidden="true">{getInitials(name)}</span>
    </div>
  );
}

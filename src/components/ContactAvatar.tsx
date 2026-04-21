import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Avatar for a *person* (vs. CompanyAvatar which is for organizations).
 *
 * Rendering rules — kept simple on purpose so the Contacts surface stays
 * predictable as we wire up LinkedIn auto-import:
 *
 *   1. If `avatarUrl` is present and loads → show the photo.
 *   2. If the image 404s / 403s (LinkedIn CDN URLs can expire) → silently
 *      fall back to initials. We never show a broken image icon.
 *   3. If no URL → initials from the contact's name (first letter of first
 *      and last word, max 2 chars).
 *
 * The styling matches the existing circular placeholder used on the
 * Contacts page (`bg-primary text-primary-foreground`, `font-display`)
 * so swapping a photo in/out is visually seamless.
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

export default function ContactAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: ContactAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const dim =
    size === "lg"
      ? "h-14 w-14 text-base"
      : size === "sm"
      ? "h-8 w-8 text-xs"
      : "h-10 w-10 text-sm";

  const showImage = !!avatarUrl && !imgFailed;

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
      {showImage ? (
        <img
          src={avatarUrl ?? undefined}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Avatar for a *person* (vs. CompanyAvatar which is for organizations).
 *
 * Rendering rules:
 *
 *   1. If `avatarUrl` is present and loads → show the photo.
 *   2. If the image 404s / 403s (common for expiring LinkedIn CDN URLs) →
 *      fall back to a deterministic generated avatar so each contact still
 *      feels visually distinct.
 *   3. If the generated avatar fails or no URL is present → show initials.
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

function getGeneratedAvatarUrl(name: string): string {
  return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(name.trim().toLowerCase())}`;
}

export default function ContactAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: ContactAvatarProps) {
  const generatedAvatarUrl = useMemo(() => getGeneratedAvatarUrl(name), [name]);
  const [avatarMode, setAvatarMode] = useState<"photo" | "generated" | "initials">(
    avatarUrl ? "photo" : "initials",
  );

  useEffect(() => {
    setAvatarMode(avatarUrl ? "photo" : "initials");
  }, [avatarUrl, name]);

  const dim =
    size === "lg"
      ? "h-14 w-14 text-base"
      : size === "sm"
        ? "h-8 w-8 text-xs"
        : "h-10 w-10 text-sm";

  const showPhoto = avatarMode === "photo" && !!avatarUrl;
  const showGenerated = avatarMode === "generated";

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
      {showPhoto ? (
        <img
          src={avatarUrl ?? undefined}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setAvatarMode("generated")}
          className="h-full w-full object-cover"
        />
      ) : showGenerated ? (
        <img
          src={generatedAvatarUrl}
          alt={`${name} generated avatar`}
          loading="lazy"
          onError={() => setAvatarMode("initials")}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </div>
  );
}


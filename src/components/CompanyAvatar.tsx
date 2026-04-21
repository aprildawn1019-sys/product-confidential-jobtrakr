import { cn } from "@/lib/utils";

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

interface CompanyAvatarProps {
  company: string;
  size?: "sm" | "md" | "lg";
  /**
   * "brand" (default) — deterministic colored square; good for company recognition surfaces
   *   (Jobs, Target Companies, Cover Letters).
   * "neutral" — soft round muted avatar matching dashboard-mockup.jpg next-step rows.
   *   Use on Command Center Next steps + Upcoming interviews where the avatar is decorative,
   *   not the primary recognition cue.
   */
  tone?: "brand" | "neutral";
  className?: string;
}

export default function CompanyAvatar({ company, size = "sm", tone = "brand", className }: CompanyAvatarProps) {
  const initial = company.charAt(0).toUpperCase();
  const dim =
    size === "lg" ? "h-10 w-10 text-base" : size === "md" ? "h-9 w-9 text-sm" : "h-8 w-8 text-sm";

  if (tone === "neutral") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-semibold shrink-0",
          "bg-muted text-muted-foreground/80 ring-1 ring-border/60",
          dim,
          className,
        )}
        aria-hidden="true"
      >
        {initial}
      </div>
    );
  }

  const colorIndex = hashStr(company.toLowerCase()) % palette.length;
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg font-bold shrink-0",
        dim,
        palette[colorIndex],
        className,
      )}
    >
      {initial}
    </div>
  );
}

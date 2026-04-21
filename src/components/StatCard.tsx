import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  /**
   * "minimal" (default) — Calm Operations: white card, big Space Grotesk numeral, label in caps below, no icon.
   * "accented" — legacy variant with colored fill + icon chip. Avoid for new surfaces.
   */
  variant?: "minimal" | "accented";
  accent?: "default" | "success" | "warning" | "info";
  href?: string;
}

const accentedCardStyles = {
  default: "bg-card border-border",
  success: "bg-success text-success-foreground border-success/30",
  warning: "bg-warning text-warning-foreground border-warning/30",
  info: "bg-info text-info-foreground border-info/30",
};

const accentedIconStyles = {
  default: "bg-secondary text-foreground",
  success: "bg-success-foreground/20 text-success-foreground",
  warning: "bg-warning-foreground/20 text-warning-foreground",
  info: "bg-info-foreground/20 text-info-foreground",
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  variant = "minimal",
  accent = "default",
  href,
}: StatCardProps) {
  const content =
    variant === "minimal" ? (
      <div
        className={cn(
          "rounded-xl border border-border bg-card p-5 sm:p-6 animate-fade-in transition-all",
          href && "hover:border-foreground/15 hover:shadow-sm cursor-pointer",
        )}
      >
        <p className="font-display text-4xl sm:text-5xl font-bold tracking-tight tabular-nums leading-none text-foreground">
          {value}
        </p>
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
    ) : (
      <div
        className={cn(
          "rounded-xl border p-5 animate-fade-in transition-all",
          accentedCardStyles[accent],
          href && "hover:scale-[1.02] hover:shadow-md cursor-pointer",
        )}
      >
        <div className="flex items-center justify-between">
          <p
            className={cn(
              "text-sm font-medium",
              accent !== "default" ? "opacity-90" : "text-muted-foreground",
            )}
          >
            {label}
          </p>
          {Icon && (
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                accentedIconStyles[accent],
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <p
          className={cn(
            "mt-2 font-display text-3xl font-bold tracking-tight",
            accent !== "default" ? "" : "text-card-foreground",
          )}
        >
          {value}
        </p>
      </div>
    );

  return href ? <Link to={href}>{content}</Link> : content;
}

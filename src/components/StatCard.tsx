import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "default" | "success" | "warning" | "info";
  href?: string;
}

const cardStyles = {
  default: "bg-card border-border",
  success: "bg-success text-success-foreground border-success/30",
  warning: "bg-warning text-warning-foreground border-warning/30",
  info: "bg-info text-info-foreground border-info/30",
};

const iconStyles = {
  default: "bg-secondary text-foreground",
  success: "bg-success-foreground/20 text-success-foreground",
  warning: "bg-warning-foreground/20 text-warning-foreground",
  info: "bg-info-foreground/20 text-info-foreground",
};

export default function StatCard({ label, value, icon: Icon, accent = "default", href }: StatCardProps) {
  const isColored = accent !== "default";

  const content = (
    <div className={cn(
      "rounded-xl border p-5 animate-fade-in transition-all",
      cardStyles[accent],
      href && "hover:scale-[1.02] hover:shadow-md cursor-pointer"
    )}>
      <div className="flex items-center justify-between">
        <p className={cn("text-sm font-medium", isColored ? "opacity-90" : "text-muted-foreground")}>{label}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconStyles[accent])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={cn("mt-2 font-display text-3xl font-bold tracking-tight", isColored ? "" : "text-card-foreground")}>{value}</p>
    </div>
  );

  return href ? <Link to={href}>{content}</Link> : content;
}

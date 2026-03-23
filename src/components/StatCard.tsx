import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "default" | "success" | "warning" | "info";
}

const accentMap = {
  default: "bg-secondary text-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

export default function StatCard({ label, value, icon: Icon, accent = "default" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accentMap[accent])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight text-card-foreground">{value}</p>
    </div>
  );
}

import { LayoutDashboard, Briefcase, Users, CalendarCheck, Sparkles, Search, UserCog, Globe, Network } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/jobs", icon: Briefcase, label: "Job Postings" },
  { to: "/contacts", icon: Users, label: "Connections" },
  { to: "/applications", icon: CalendarCheck, label: "Applications" },
  { to: "/recommendations", icon: Sparkles, label: "Recommendations" },
  { to: "/job-search", icon: Search, label: "AI Job Search" },
  { to: "/profile", icon: UserCog, label: "Search Profile" },
  { to: "/job-boards", icon: Globe, label: "Job Boards" },
  { to: "/network", icon: Network, label: "Network Map" },
];

export default function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Briefcase className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight">JobTrackr</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs text-sidebar-muted">Job Search Tracker</p>
        <p className="text-xs text-sidebar-muted mt-0.5">v1.0 — Stay organized</p>
      </div>
    </aside>
  );
}

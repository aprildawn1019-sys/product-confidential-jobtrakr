import { LayoutDashboard, Briefcase, Users, CalendarCheck, Sparkles, Search, UserCog, Globe, LogOut, CalendarDays, Compass, ClipboardList, Handshake, LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type LinkItem = { to: string; icon: LucideIcon; label: string };

const groups: { label: string; icon: LucideIcon; items: LinkItem[] }[] = [
  {
    label: "Discover",
    icon: Compass,
    items: [
      { to: "/job-search", icon: Search, label: "AI Job Search" },
      { to: "/job-boards", icon: Globe, label: "Job Boards" },
      { to: "/profile", icon: UserCog, label: "Search Profile" },
      { to: "/recommendations", icon: Sparkles, label: "Recommendations" },
    ],
  },
  {
    label: "Track & Apply",
    icon: ClipboardList,
    items: [
      { to: "/jobs", icon: Briefcase, label: "Job Postings" },
      { to: "/applications", icon: CalendarCheck, label: "Applications" },
      { to: "/interviews", icon: CalendarDays, label: "Interviews" },
    ],
  },
  {
    label: "Networking",
    items: [
      { to: "/contacts", icon: Users, label: "Connections" },
    ],
  },
];

export default function AppSidebar() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
    );

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Briefcase className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight">JobTrackr</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavLink to="/" end className={navLinkClass}>
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </NavLink>

        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 pt-5 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
              {group.label}
            </div>
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={navLinkClass}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}

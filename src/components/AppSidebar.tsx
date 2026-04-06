import { useState } from "react";
import { LayoutDashboard, Briefcase, Users, Sparkles, Search, UserCog, Globe, LogOut, CalendarDays, Compass, ClipboardList, Handshake, ChevronDown, ChevronRight, TrendingUp, Star, FileText, LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

type LinkItem = { to: string; icon: LucideIcon; label: string };

interface AppSidebarProps {
  jobs?: { id: string; title: string; company: string }[];
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const groups: { label: string; icon: LucideIcon; items: LinkItem[] }[] = [
  {
    label: "Discover",
    icon: Compass,
    items: [
      { to: "/job-search", icon: Search, label: "AI Job Search" },
      { to: "/job-boards", icon: Globe, label: "Job Boards" },
      { to: "/profile", icon: UserCog, label: "Search Profile" },
      { to: "/recommendations", icon: Sparkles, label: "Recommendations" },
      { to: "/skills-insights", icon: TrendingUp, label: "Skills Insights" },
    ],
  },
  {
    label: "Track & Apply",
    icon: ClipboardList,
    items: [
      { to: "/jobs", icon: Briefcase, label: "Job Pipeline" },
      { to: "/target-companies", icon: Star, label: "Target Companies" },
      { to: "/interviews", icon: CalendarDays, label: "Schedule" },
      { to: "/cover-letters", icon: FileText, label: "Cover Letters" },
    ],
  },
  {
    label: "Networking",
    icon: Handshake,
    items: [
      { to: "/contacts", icon: Users, label: "Connections" },
    ],
  },
];

function SidebarContent({ jobs, onNavigate }: { jobs: { id: string; title: string; company: string }[]; onNavigate?: () => void }) {
  const location = useLocation();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const isOnJobCRM = location.pathname.startsWith("/jobs/");
  const [jobSubOpen, setJobSubOpen] = useState(isOnJobCRM);

  const initialOpen = groups.reduce<Record<string, boolean>>((acc, group) => {
    acc[group.label] = group.items.some((item) => location.pathname === item.to || (item.to === "/jobs" && isOnJobCRM));
    return acc;
  }, {});

  const anyActive = Object.values(initialOpen).some(Boolean);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    anyActive ? initialOpen : groups.reduce((acc, g) => ({ ...acc, [g.label]: true }), {} as Record<string, boolean>)
  );

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg pl-6 pr-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
    );

  const handleNavClick = () => {
    onNavigate?.();
  };

  return (
    <>
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Briefcase className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight">JobTrackr</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Primary">
        <NavLink to="/" end onClick={handleNavClick} className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )
        }>
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </NavLink>

        {groups.map((group) => {
          const GroupIcon = group.icon;
          const isOpen = openGroups[group.label] ?? true;
          const hasActiveChild = group.items.some((item) => location.pathname === item.to);

          return (
            <Collapsible
              key={group.label}
              open={isOpen}
              onOpenChange={() => toggleGroup(group.label)}
            >
              <CollapsibleTrigger
                className="w-full"
                aria-expanded={isOpen}
              >
                <div
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 mt-3 cursor-pointer select-none transition-colors",
                    "hover:bg-sidebar-accent/30",
                    hasActiveChild
                      ? "text-sidebar-group-foreground"
                      : "text-sidebar-group-foreground/70"
                  )}
                >
                  <GroupIcon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left text-[11px] font-bold uppercase tracking-widest">
                    {group.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200",
                      isOpen ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-0.5 pt-0.5">
                {group.items.map(({ to, icon: Icon, label }) => (
                  <div key={to}>
                    {to === "/jobs" ? (
                      <>
                        <div className="flex items-center">
                          <NavLink to={to} className={navLinkClass} end onClick={handleNavClick}>
                            <Icon className="h-4 w-4" />
                            {label}
                          </NavLink>
                          {jobs.length > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setJobSubOpen(!jobSubOpen); }}
                              className="mr-2 p-0.5 rounded hover:bg-sidebar-accent/50 text-sidebar-muted hover:text-sidebar-foreground transition-colors"
                              aria-label="Toggle job list"
                            >
                              {jobSubOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                        {jobSubOpen && jobs.length > 0 && (
                          <div className="max-h-48 overflow-y-auto space-y-0.5 py-0.5">
                            {jobs.map((job) => (
                              <NavLink
                                key={job.id}
                                to={`/jobs/${job.id}`}
                                onClick={handleNavClick}
                                className={({ isActive }) =>
                                  cn(
                                    "flex flex-col rounded-lg pl-9 pr-3 py-1.5 text-xs transition-colors truncate",
                                    isActive
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                      : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                  )
                                }
                              >
                                <span className="truncate font-medium">{job.company}</span>
                                <span className="truncate opacity-70">{job.title}</span>
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <NavLink to={to} className={navLinkClass} onClick={handleNavClick}>
                        <Icon className="h-4 w-4" />
                        {label}
                      </NavLink>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
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
    </>
  );
}

export default function AppSidebar({ jobs = [], mobileOpen = false, onMobileClose }: AppSidebarProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={(open) => { if (!open) onMobileClose?.(); }}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
          <SidebarContent jobs={jobs} onNavigate={onMobileClose} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
      role="navigation"
      aria-label="Main navigation"
    >
      <SidebarContent jobs={jobs} />
    </aside>
  );
}

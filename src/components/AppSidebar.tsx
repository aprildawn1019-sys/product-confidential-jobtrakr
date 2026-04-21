import { useState } from "react";
import {
  LayoutDashboard, Briefcase, Users, Search, Globe, LogOut, CalendarDays,
  ChevronDown, ChevronRight, TrendingUp, Star, FileText, Settings, Network,
  Sparkles, PlayCircle, CircleHelp, BarChart3, FileStack, LucideIcon, PanelLeftClose, PanelLeft,
} from "lucide-react";
import { useHelp } from "@/components/help/HelpProvider";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
// (Collapsible no longer used: sidebar groups are always-visible per hero spec.)
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

type LinkItem = { to: string; icon: LucideIcon; label: string; tourId?: string; end?: boolean };

interface AppSidebarProps {
  jobs?: { id: string; title: string; company: string }[];
  hasData?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const groups: { label: string; items: LinkItem[] }[] = [
  {
    label: "Today",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Command Center", end: true },
      { to: "/jobs", icon: Briefcase, label: "Jobs" },
      { to: "/contacts", icon: Users, label: "Contacts", tourId: "entry-network" },
      { to: "/interviews", icon: CalendarDays, label: "Interviews" },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { to: "/target-companies", icon: Star, label: "Target Companies", tourId: "entry-target-companies" },
      { to: "/job-boards", icon: Globe, label: "Job Boards" },
      { to: "/job-search", icon: Search, label: "Job Search", tourId: "entry-job-search" },
    ],
  },
  {
    label: "Library",
    items: [
      { to: "/resumes", icon: FileStack, label: "Resumes" },
      { to: "/cover-letters", icon: FileText, label: "Cover Letters" },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/insights", icon: BarChart3, label: "Insights" },
      { to: "/skills-insights", icon: TrendingUp, label: "Skills Insights" },
      { to: "/network-map", icon: Network, label: "Network Map" },
    ],
  },
];

interface SidebarBodyProps {
  jobs: { id: string; title: string; company: string }[];
  hasData: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}

function SidebarBody({ jobs, hasData, collapsed, onNavigate }: SidebarBodyProps) {
  const location = useLocation();
  const { openHelp } = useHelp();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const isOnJobCRM = location.pathname.startsWith("/jobs/");
  const [jobSubOpen, setJobSubOpen] = useState(isOnJobCRM);

  // Sidebar groups are always-visible (no chevrons) — see hero spec.
  // We intentionally drop per-group open/close state.

  const handleNavClick = () => onNavigate?.();

  // === COLLAPSED (icon-only) ===
  if (collapsed) {
    const allItems = groups.flatMap((g, gi) => [
      ...g.items.map((it) => ({ ...it, _group: gi })),
    ]);
    const settingsItem = { to: "/settings", icon: Settings, label: "Settings" };

    const renderIconLink = (item: LinkItem) => (
      <Tooltip key={item.to} delayDuration={150}>
        <TooltipTrigger asChild>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={handleNavClick}
            className={({ isActive }) =>
              cn(
                "relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                "before:absolute before:left-[-8px] before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground before:bg-sidebar-primary"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground before:bg-transparent"
              )
            }
          >
            <item.icon className="h-4 w-4" />
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );

    return (
      <TooltipProvider>
        <div className="flex h-16 items-center justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Briefcase className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Primary">
          <div className="flex flex-col items-center gap-1">
            {groups.map((g, gi) => (
              <div key={g.label} className="flex flex-col items-center gap-1">
                {gi > 0 && <div className="my-1 h-px w-6 bg-sidebar-border/60" />}
                {g.items.map(renderIconLink)}
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-2 space-y-1 flex flex-col items-center">
          {hasData ? null : renderIconLink({ to: "/getting-started", icon: Sparkles, label: "Getting Started" })}
          {renderIconLink(settingsItem)}
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={() => { handleNavClick(); openHelp(); }}
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Help &amp; Resources</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // === EXPANDED ===
  // Active route gets an amber left-bar (matches hero spec). The bar is rendered
  // via a `before:` pseudo-element on the row so the amber color is anchored to
  // the sidebar edge rather than the rounded button.
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative flex items-center gap-3 rounded-lg pl-6 pr-3 py-2 text-sm transition-colors",
      "before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium before:bg-sidebar-primary"
        : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground before:bg-transparent"
    );

  return (
    <>
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Briefcase className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight">Jobtrakr</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1" aria-label="Primary">
        {!hasData && (
          <NavLink
            to="/getting-started"
            onClick={handleNavClick}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )
            }
          >
            <Sparkles className="h-4 w-4" />
            Getting Started
          </NavLink>
        )}

        {groups.map((group) => {
          // Hero spec: section labels are bright amber, always visible (no
          // collapsible chevron). Keeps the sidebar reading like the mockup
          // — calm, scannable, no extra controls.
          return (
            <div key={group.label} className="pt-4 first:pt-1">
              <div className="px-3 pb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-primary">
                  {group.label}
                </span>
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, tourId, end }) => (
                  <div key={to} data-tour={tourId}>
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
                      <NavLink to={to} end={end} className={navLinkClass} onClick={handleNavClick}>
                        <Icon className="h-4 w-4" />
                        {label}
                      </NavLink>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 space-y-1">
        <NavLink
          to="/settings"
          onClick={handleNavClick}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors w-full",
              isActive || location.pathname.startsWith("/settings")
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={() => { handleNavClick(); openHelp(); }}
        >
          <CircleHelp className="h-4 w-4 mr-2" />
          Help &amp; Resources
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={() => { handleNavClick(); window.dispatchEvent(new Event("jobtrakr:start-tour")); }}
        >
          <PlayCircle className="h-4 w-4 mr-2" />
          Restart walkthrough
        </Button>
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

export default function AppSidebar({
  jobs = [],
  hasData = false,
  collapsed = false,
  onToggleCollapsed,
  mobileOpen = false,
  onMobileClose,
}: AppSidebarProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={(open) => { if (!open) onMobileClose?.(); }}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
          <SidebarBody jobs={jobs} hasData={hasData} collapsed={false} onNavigate={onMobileClose} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200",
        collapsed ? "w-14" : "w-64"
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <SidebarBody jobs={jobs} hasData={hasData} collapsed={collapsed} />

      {/* Floating collapse toggle */}
      {onToggleCollapsed && (
        <button
          onClick={onToggleCollapsed}
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors shadow-sm"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
        </button>
      )}
    </aside>
  );
}

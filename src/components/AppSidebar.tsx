import { useEffect, useState } from "react";
import {
  LayoutDashboard, Briefcase, Users, Search, Globe, LogOut, CalendarDays,
  ChevronDown, ChevronRight, TrendingUp, Star, FileText, Settings, Network,
  Sparkles, PlayCircle, CircleHelp, BarChart3, FileStack, LucideIcon, PanelLeftClose, PanelLeft,
  UserCircle2, MoreHorizontal, Compass, BookOpen,
} from "lucide-react";

// Koudou brand mark — two-tone: deep navy path rising to a soft cream sun.
// Uses explicit semantic tokens so both tones render distinctly on the amber tile.
const KoudouMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
    {/* Tone 1 — soft cream sun (light tone) */}
    <circle cx="22" cy="10" r="3.5" className="fill-sidebar-primary-foreground" />
    {/* Tone 2 — deep navy path (dark tone) */}
    <path
      d="M5 28 Q 12 22 16 18 Q 20 14 22 12"
      className="stroke-sidebar"
      strokeWidth="3.25"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);
import { useHelp } from "@/components/help/HelpProvider";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
// (Collapsible no longer used: sidebar groups are always-visible per hero spec.)
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";

// Deterministic 2-letter initials from a name or email.
function initialsOf(label: string): string {
  if (!label) return "?";
  const cleaned = label.includes("@") ? label.split("@")[0].replace(/[._-]+/g, " ") : label;
  const parts = cleaned.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Lightweight hook to read the signed-in user's display name + initials.
function useCurrentUser() {
  const [info, setInfo] = useState<{ name: string; email: string; initials: string }>({
    name: "Account", email: "", initials: "·",
  });
  useEffect(() => {
    let mounted = true;
    const apply = (user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!mounted || !user) return;
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const name = (meta.full_name as string) || (meta.name as string) || (user.email ?? "Account");
      setInfo({ name, email: user.email ?? "", initials: initialsOf(name) });
    };
    supabase.auth.getUser().then(({ data }) => apply(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session?.user ?? null));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);
  return info;
}

type LinkItem = { to: string; icon: LucideIcon; label: string; tourId?: string; end?: boolean };

interface AppSidebarProps {
  jobs?: { id: string; title: string; company: string }[];
  hasData?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// Group label icons mirror the hero spec: each section gets a small leading
// glyph + chevron so the sidebar reads as scannable categories.
const groups: { label: string; icon: LucideIcon; items: LinkItem[] }[] = [
  {
    label: "Today",
    icon: Sparkles,
    items: [
      { to: "/", icon: LayoutDashboard, label: "Command Center", end: true },
      { to: "/jobs", icon: Briefcase, label: "Jobs" },
      { to: "/contacts", icon: Users, label: "Contacts", tourId: "entry-network" },
      { to: "/interviews", icon: CalendarDays, label: "Interviews" },
    ],
  },
  {
    label: "Pipeline",
    icon: Compass,
    items: [
      { to: "/target-companies", icon: Star, label: "Target Companies", tourId: "entry-target-companies" },
      { to: "/job-boards", icon: Globe, label: "Job Boards" },
      { to: "/job-search", icon: Search, label: "Job Search", tourId: "entry-job-search" },
    ],
  },
  {
    label: "Library",
    icon: BookOpen,
    items: [
      { to: "/resumes", icon: FileStack, label: "Resumes" },
      { to: "/cover-letters", icon: FileText, label: "Cover Letters" },
    ],
  },
  {
    label: "Insights",
    icon: BarChart3,
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
  const user = useCurrentUser();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };
  const handleRestartTour = () => {
    onNavigate?.();
    window.dispatchEvent(new Event("jobtrakr:start-tour"));
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
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <KoudouMark className="h-5 w-5" />
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
          {renderIconLink({ to: "/settings/profile", icon: UserCircle2, label: "Profile" })}
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
            <TooltipContent side="right">Help</TooltipContent>
          </Tooltip>

          <div className="my-1 h-px w-6 bg-sidebar-border/60" />

          <DropdownMenu>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground hover:opacity-90 transition-opacity"
                    aria-label={`Account menu for ${user.name}`}
                  >
                    {user.initials}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">{user.name}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{user.name}</p>
                {user.email && user.email !== user.name && (
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRestartTour}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Restart walkthrough
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>
    );
  }

  // === EXPANDED ===
  // Hero spec: active row uses a calm navy fill only — no amber accent bar.
  // Inactive rows are muted; hover lifts contrast slightly.
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
    );

  return (
    <>
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <KoudouMark className="h-5 w-5" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight">Koudou</span>
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
          // Hero spec: section labels carry a leading icon + trailing chevron,
          // rendered in the muted-gold sidebar-group-foreground tone (not bright
          // amber) so labels read as quiet category headers, not active controls.
          const GroupIcon = group.icon;
          return (
            <div key={group.label} className="pt-4 first:pt-1">
              <div className="flex items-center justify-between px-3 pb-1.5">
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-group-foreground">
                  <GroupIcon className="h-3.5 w-3.5" />
                  {group.label}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-sidebar-group-foreground/60" />
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

      <div className="border-t border-sidebar-border p-3 space-y-0.5">
        {/* Profile / Settings / Help — quiet utility links matching the hero spec */}
        <NavLink
          to="/settings/profile"
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
          <UserCircle2 className="h-4 w-4" />
          Profile
        </NavLink>
        <NavLink
          to="/settings"
          end
          onClick={handleNavClick}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive || location.pathname === "/settings" || location.pathname === "/settings/data-export"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
        <button
          type="button"
          onClick={() => { handleNavClick(); openHelp(); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <CircleHelp className="h-4 w-4" />
          Help
        </button>

        {/* Account row — avatar + name, opens menu with Restart walkthrough + Sign out.
            Tucking these inside the avatar menu keeps walkthrough discoverable but out of
            the daily-use surface, and prevents accidental sign-outs. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mt-2 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/50 group"
              aria-label={`Account menu for ${user.name}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground">
                {user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                {user.email && user.email !== user.name && (
                  <p className="text-[11px] text-sidebar-muted truncate">{user.email}</p>
                )}
              </div>
              <MoreHorizontal className="h-4 w-4 text-sidebar-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-56">
            <DropdownMenuItem onClick={handleRestartTour}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Restart walkthrough
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

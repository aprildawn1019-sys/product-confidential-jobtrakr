import { useEffect, useState } from "react";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";

// Brand lockup: geometric-K mark paired with the "Koudou" wordmark.
// We use the DARK-pane variant (white tile, navy upper arm, amber lower
// arm) so the mark stays high-contrast against the navy sidebar background
// — see `mem://style/brand-mark`.
import koudouMarkSrc from "@/assets/brand/koudou-mark-dark.png";
const BrandMark = ({ className }: { className?: string }) => (
  <img
    src={koudouMarkSrc}
    alt="Koudou"
    className={cn("shrink-0 rounded-lg", className)}
  />
);

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

type LinkItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  tourId?: string;
  end?: boolean;
};

interface AppSidebarProps {
  jobs?: { id: string; title: string; company: string }[];
  hasData?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// 2-tone icon system: neutral muted for inactive, amber for active/hover.
// Color is reserved for STATE, not identity — this protects scannability and
// keeps amber as the single accent across the product chrome.
const groups: { label: string; items: LinkItem[] }[] = [
  {
    label: "Today",
    items: [
      { to: "/",           icon: LayoutDashboard, label: "Command Center", end: true },
      { to: "/jobs",       icon: Briefcase,        label: "Jobs" },
      { to: "/contacts",   icon: Users,            label: "Contacts", tourId: "entry-network" },
      { to: "/interviews", icon: CalendarDays,     label: "Interviews" },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { to: "/target-companies", icon: Star,   label: "Target Companies", tourId: "entry-target-companies" },
      { to: "/job-boards",       icon: Globe,  label: "Job Boards" },
      { to: "/job-search",       icon: Search, label: "Job Search", tourId: "entry-job-search" },
    ],
  },
  {
    label: "Library",
    items: [
      { to: "/resumes",       icon: FileStack, label: "Resumes" },
      { to: "/cover-letters", icon: FileText,  label: "Cover Letters" },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/insights",        icon: BarChart3,  label: "Insights" },
      { to: "/skills-insights", icon: TrendingUp, label: "Skills Insights" },
      { to: "/network-map",     icon: Network,    label: "Network Map" },
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

  const handleNavClick = () => onNavigate?.();

  // === COLLAPSED (icon-only) ===
  if (collapsed) {
    const settingsItem: LinkItem = { to: "/settings", icon: Settings, label: "Settings" };

    // Collapsed-mode icons step up to 20px since they stand alone without
    // a label to anchor them. Active state = bar + white icon (no amber on
    // the glyph) so the bar carries the "you are here" signal cleanly.
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
                  ? "bg-sidebar-accent text-sidebar-foreground before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-sidebar-primary"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" strokeWidth={2} />
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );

    return (
      <>
        <div className="flex h-16 items-center justify-center">
          <BrandMark className="h-10 w-10" />
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
          {renderIconLink({ to: "/getting-started", icon: Sparkles, label: "Getting Started" })}
          {renderIconLink(settingsItem)}
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                onClick={() => { handleNavClick(); openHelp(); }}
              >
                <CircleHelp className="h-5 w-5" strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Help</TooltipContent>
          </Tooltip>

          <div className="my-1 h-px w-6 bg-sidebar-border/60" />

          {/* Avatar matches utility-button vocabulary: 40x40 rounded-md
              tile on the same surface as Settings/Help so the trio reads
              as one row of equal-weight controls. */}
          <DropdownMenu>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent/60 text-[11px] font-semibold text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
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
              <DropdownMenuItem onClick={() => { handleNavClick(); window.location.href = "/settings/profile"; }}>
                <Settings className="h-4 w-4 mr-2" />
                Profile & Settings
              </DropdownMenuItem>
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
      </>
    );
  }

  // === EXPANDED ===
  // Active row: soft navy fill + amber left bar (state signal). Icon stays
  // white in active state so the bar carries the "you are here" cue alone —
  // hover still flashes amber on the icon as a transient affordance.
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-foreground font-medium [&_svg]:text-sidebar-foreground before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-sidebar-primary"
        : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:[&_svg]:text-sidebar-primary"
    );

  return (
    <>
      {/* Brand lockup: geometric-K mark + "Koudou" wordmark, Space Grotesk 700 @ 20px.
          leading-none + pt-0.5 optically centers the wordmark against the mark, which
          carries internal padding. */}
      <div className="flex h-16 items-center gap-2.5 px-4">
        <BrandMark className="h-9 w-9" />
        <span className="font-display text-xl font-bold leading-none tracking-tight text-sidebar-foreground pt-0.5">
          Koudou
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1" aria-label="Primary">
        <NavLink
          to="/getting-started"
          onClick={handleNavClick}
          className={({ isActive }) =>
            cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-foreground font-medium [&_svg]:text-sidebar-foreground before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-sidebar-primary"
                : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:[&_svg]:text-sidebar-primary"
            )
          }
        >
          <Sparkles className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          Getting Started
        </NavLink>

        {groups.map((group) => {
          // Section labels: quieter — 11px semibold, narrower tracking, muted
          // amber via opacity. Rows carry primary visual weight; labels are
          // secondary scaffolding (per visual-theme-v2 "muted amber" guidance).
          return (
            <div key={group.label} className="pt-5 first:pt-1">
              <div className="px-3 pb-1.5">
                <span
                  className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-group-foreground"
                >
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
                            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
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
                        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
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

      {/* Footer: name on row 1, then a single utility row of equal-sized
          32px buttons (avatar, Settings, Help) so they align as peers. */}
      <div className="border-t border-sidebar-border px-2 py-2.5 space-y-1.5">
        <div className="px-1">
          <p className="truncate text-xs font-medium text-sidebar-foreground" title={user.name}>
            {user.name}
          </p>
          {user.email && user.email !== user.name && (
            <p className="truncate text-[11px] text-sidebar-muted" title={user.email}>
              {user.email}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent/60 text-[11px] font-semibold leading-none text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    aria-label={`Account menu for ${user.name}`}
                  >
                    {user.initials}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Account</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{user.name}</p>
                {user.email && user.email !== user.name && (
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { handleNavClick(); window.location.href = "/settings/profile"; }}>
                <Settings className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
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

          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <NavLink
                to="/settings"
                end
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md leading-none transition-colors",
                    isActive || location.pathname.startsWith("/settings")
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )
                }
                aria-label="Settings"
              >
                <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="top">Settings</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => { handleNavClick(); openHelp(); }}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md leading-none text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
                aria-label="Help"
              >
                <CircleHelp className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Help</TooltipContent>
          </Tooltip>
        </div>
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
      <TooltipProvider>
        <Sheet open={mobileOpen} onOpenChange={(open) => { if (!open) onMobileClose?.(); }}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
            <SidebarBody jobs={jobs} hasData={hasData} collapsed={false} onNavigate={onMobileClose} />
          </SheetContent>
        </Sheet>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200",
          collapsed ? "w-14" : "w-64"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <SidebarBody jobs={jobs} hasData={hasData} collapsed={collapsed} />

        {/* Floating collapse toggle: anchored to the brand row (top-5 ≈ row
            center for the 64px header), 28px hit target, with tooltip. */}
        {onToggleCollapsed && (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapsed}
                className="absolute -right-3.5 top-5 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors shadow-sm"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        )}
      </aside>
    </TooltipProvider>
  );
}

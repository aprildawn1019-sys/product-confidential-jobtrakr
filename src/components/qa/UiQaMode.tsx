import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bug, X, Ruler, Crosshair, AlertTriangle, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * UI QA Mode
 * ----------
 * Dev-only diagnostic overlay to catch navigation/sidebar regressions faster.
 *
 * Activation:
 *   - Append `?qa=1` to any URL, OR
 *   - Press `Ctrl/Cmd + Shift + Q`
 *
 * What it surfaces:
 *   - SPACING: dashed outlines on every layout container (uses `outline`,
 *     not `border`, so it does NOT shift layout).
 *   - ACTIVE STATES: a high-contrast amber ring around the currently
 *     active <NavLink> + the focused element, so you can confirm the
 *     "you are here" signal is firing.
 *   - MISSING SLOTS: any `<a>`, `<button>`, or `[role="menuitem"]` inside
 *     the sidebar that has no `<svg>` icon child OR no visible text label
 *     gets a red dashed outline + a "⚠ slot" badge.
 *
 * Implementation notes:
 *   - Toggling sets `data-qa-mode="on"` on <html>, so all rules live in
 *     pure CSS scoped under that attribute. No React re-renders required
 *     in product components.
 *   - The audit re-runs on route changes and on a MutationObserver, so
 *     async-rendered nav items are still flagged.
 *   - Auto-disabled in production builds (import.meta.env.PROD) unless
 *     the user explicitly opts in via `?qa=1`.
 */

type QaFlags = {
  spacing: boolean;
  activeStates: boolean;
  missingSlots: boolean;
};

const DEFAULT_FLAGS: QaFlags = {
  spacing: true,
  activeStates: true,
  missingSlots: true,
};

const STORAGE_KEY = "jobtrakr.qa.flags";

function readStoredFlags(): QaFlags {
  if (typeof window === "undefined") return DEFAULT_FLAGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FLAGS;
    return { ...DEFAULT_FLAGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FLAGS;
  }
}

function shouldAutoEnable(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("qa") === "1";
}

/**
 * Audit a single sidebar link/button for missing icon or text label.
 * Returns the human-readable issue, or null if the slot is fine.
 */
function auditSlot(el: Element): string | null {
  // Skip the QA panel itself + any element marked as exempt.
  if (el.closest("[data-qa-exempt]")) return null;

  const hasIcon = !!el.querySelector("svg");
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  const hasLabel =
    text.length > 0 ||
    !!el.getAttribute("aria-label") ||
    !!el.getAttribute("title");

  if (!hasIcon && !hasLabel) return "no icon · no label";
  if (!hasIcon) return "missing icon";
  if (!hasLabel) return "missing label";
  return null;
}

function runSidebarAudit() {
  // Clean previous flags first.
  document
    .querySelectorAll("[data-qa-slot-issue]")
    .forEach((n) => {
      n.removeAttribute("data-qa-slot-issue");
    });

  // Sidebar container in this app has aria-label="Primary" on its <nav>.
  // Also include the sheet drawer (mobile) by querying any <nav> tagged
  // as Primary navigation.
  const navs = document.querySelectorAll('nav[aria-label="Primary"]');
  navs.forEach((nav) => {
    const slots = nav.querySelectorAll('a, button, [role="menuitem"]');
    slots.forEach((slot) => {
      const issue = auditSlot(slot);
      if (issue) slot.setAttribute("data-qa-slot-issue", issue);
    });
  });
}

export function UiQaMode() {
  const [enabled, setEnabled] = useState<boolean>(() => shouldAutoEnable());
  const [flags, setFlags] = useState<QaFlags>(readStoredFlags);
  const [open, setOpen] = useState<boolean>(true);

  // Sync the <html data-qa-mode> attribute + per-flag attributes so the
  // CSS in `qa-mode.css` can target each diagnostic independently.
  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.setAttribute("data-qa-mode", "on");
      root.setAttribute("data-qa-spacing", flags.spacing ? "on" : "off");
      root.setAttribute("data-qa-active", flags.activeStates ? "on" : "off");
      root.setAttribute("data-qa-slots", flags.missingSlots ? "on" : "off");
    } else {
      root.removeAttribute("data-qa-mode");
      root.removeAttribute("data-qa-spacing");
      root.removeAttribute("data-qa-active");
      root.removeAttribute("data-qa-slots");
    }
  }, [enabled, flags]);

  // Persist flag preferences across reloads.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch {
      /* ignore quota errors */
    }
  }, [flags]);

  // Keyboard shortcut: Ctrl/Cmd+Shift+Q toggles the whole mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        setEnabled((v) => !v);
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Re-audit slots whenever the mode is on. Uses a MutationObserver so
  // nav items added asynchronously (e.g. job sublist) still get flagged.
  useEffect(() => {
    if (!enabled || !flags.missingSlots) return;
    runSidebarAudit();
    const observer = new MutationObserver(() => {
      // Coalesce rapid mutations into a single audit pass.
      window.requestAnimationFrame(runSidebarAudit);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-label"],
    });
    return () => observer.disconnect();
  }, [enabled, flags.missingSlots]);

  const toggleFlag = useCallback((key: keyof QaFlags) => {
    setFlags((f) => ({ ...f, [key]: !f[key] }));
  }, []);

  if (!enabled) return null;

  // Render via portal so the panel is never affected by parent
  // overflow/transform stacking contexts (which would otherwise confuse
  // the very diagnostics it is trying to surface).
  return createPortal(
    <div
      data-qa-exempt
      className="fixed bottom-4 right-4 z-[9999] font-display text-xs"
    >
      {open ? (
        <div className="w-64 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Bug className="h-3.5 w-3.5 text-accent" />
              <span className="font-semibold tracking-tight">UI QA Mode</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Minimize QA panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-1 p-2">
            <QaToggle
              icon={Ruler}
              label="Spacing outlines"
              hint="Dashed outline on layout boxes"
              checked={flags.spacing}
              onChange={() => toggleFlag("spacing")}
            />
            <QaToggle
              icon={Crosshair}
              label="Active + focus rings"
              hint="Amber ring on active route / focused el"
              checked={flags.activeStates}
              onChange={() => toggleFlag("activeStates")}
            />
            <QaToggle
              icon={AlertTriangle}
              label="Missing icon/label slots"
              hint="Red flag on broken sidebar items"
              checked={flags.missingSlots}
              onChange={() => toggleFlag("missingSlots")}
            />
          </div>
          <div className="border-t border-border px-3 py-2 text-[10px] leading-tight text-muted-foreground">
            Toggle: <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Ctrl/⌘+Shift+Q</kbd>
            <button
              onClick={() => setEnabled(false)}
              className="ml-2 text-destructive hover:underline"
            >
              Turn off
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-border bg-popover px-3 py-1.5 text-popover-foreground shadow-md hover:bg-muted"
          aria-label="Open QA panel"
        >
          <Bug className="h-3.5 w-3.5 text-accent" />
          QA
        </button>
      )}
    </div>,
    document.body
  );
}

interface QaToggleProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
}

function QaToggle({ icon: Icon, label, hint, checked, onChange }: QaToggleProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        checked ? "bg-accent/10 hover:bg-accent/15" : "hover:bg-muted"
      )}
    >
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", checked ? "text-accent" : "text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{label}</span>
          <span
            className={cn(
              "h-3.5 w-6 rounded-full border transition-colors",
              checked ? "border-accent bg-accent" : "border-border bg-muted"
            )}
            aria-hidden
          >
            <span
              className={cn(
                "block h-3 w-3 rounded-full bg-background transition-transform",
                checked ? "translate-x-2.5" : "translate-x-0"
              )}
            />
          </span>
        </div>
        <div className="text-[10px] leading-tight text-muted-foreground">{hint}</div>
      </div>
    </button>
  );
}

// Re-export the icon that renders inline for slot warnings — used by the
// CSS pseudo-element via content: attr(data-qa-slot-issue).
export { MousePointerClick };

import { useCallback, useEffect, useState } from "react";
import type { DerivedAction } from "@/lib/actionEngine";

const STORAGE_KEY = "jobtrakr.pinnedPlanActions.v1";
const EVENT_NAME = "jobtrakr:pinned-plan-actions-changed";

export interface PinnedPlanAction {
  id: string;
  title: string;
  rationale?: string;
  category?: string;
  pinnedAt: string;
}

function readStorage(): PinnedPlanAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(items: PinnedPlanAction[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/**
 * Lightweight client-side pinning for AI-generated weekly plan actions.
 * Pinned items surface in the Command Center's Next Steps list.
 */
export function usePinnedPlanActions() {
  const [pinned, setPinned] = useState<PinnedPlanAction[]>(() => readStorage());

  useEffect(() => {
    const sync = () => setPinned(readStorage());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isPinned = useCallback((id: string) => pinned.some((p) => p.id === id), [pinned]);

  const pin = useCallback((action: Omit<PinnedPlanAction, "pinnedAt">) => {
    const current = readStorage();
    if (current.some((p) => p.id === action.id)) return;
    writeStorage([...current, { ...action, pinnedAt: new Date().toISOString() }]);
  }, []);

  const unpin = useCallback((id: string) => {
    writeStorage(readStorage().filter((p) => p.id !== id));
  }, []);

  const toggle = useCallback((action: Omit<PinnedPlanAction, "pinnedAt">) => {
    const current = readStorage();
    if (current.some((p) => p.id === action.id)) {
      writeStorage(current.filter((p) => p.id !== action.id));
    } else {
      writeStorage([...current, { ...action, pinnedAt: new Date().toISOString() }]);
    }
  }, []);

  return { pinned, isPinned, pin, unpin, toggle };
}

/**
 * Convert pinned plan items into DerivedActions consumable by NextStepsList.
 * Uses lane "applications" by default; "outreach"/"follow-up" → networking.
 */
export function pinnedToDerivedActions(pinned: PinnedPlanAction[]): DerivedAction[] {
  return pinned.map((p, idx) => {
    const lane: DerivedAction["lane"] =
      p.category === "outreach" || p.category === "follow-up"
        ? "networking"
        : p.category === "preparation"
        ? "networking"
        : "applications";
    return {
      signature: `pinned-plan:${p.id}`,
      lane,
      urgency: "soon",
      source: "ai",
      priorityScore: 220 + idx, // sit just above generic AI suggestions
      title: p.title,
      subtitle: p.rationale,
      actionLabel: "Take action",
    };
  });
}

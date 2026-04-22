/**
 * Module-level in-flight deduplication for `scrape-linkedin` invocations.
 *
 * Why this exists:
 *   The "Fetch from LinkedIn" button in `AddContactDialog` already disables
 *   itself while a single dialog instance has a request in flight. But that
 *   guard is per-component — it does NOT protect against:
 *     • The same dialog being mounted twice (e.g. an "Add Contact" trigger
 *       in the page header AND a contextual "+ Add" elsewhere on screen).
 *     • A user double-clicking through React's batched state before the
 *       disabled prop has flushed to the DOM.
 *     • Two tabs / windows of the same app firing the same URL within ms
 *       of each other when a user re-imports.
 *
 *   Each duplicate invocation costs an upstream Firecrawl/Gemini call and
 *   counts toward the per-user rate limit. By caching the in-flight Promise
 *   per `(userId, normalizedUrl, forceRefresh)` triple, every concurrent
 *   caller awaits the same network round-trip and gets the same result.
 *
 * Scope:
 *   - In-memory only (cleared on page reload). This is intentional: the
 *     goal is to collapse *concurrent* duplicates, not cache results across
 *     sessions. Avatar caching itself lives in the edge function.
 *   - Keyed by the normalized URL + forceRefresh flag so a user can still
 *     trigger a deliberate refresh after an initial fetch resolves.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ScrapeLinkedinResult {
  data: unknown;
  error: unknown;
}

type InFlightMap = Map<string, Promise<ScrapeLinkedinResult>>;

// Single module-level map. Sharing across all dialog instances in the app
// is the whole point — a per-instance map would defeat deduplication.
const inFlight: InFlightMap = new Map();

function makeKey(normalizedUrl: string, forceRefreshAvatar: boolean): string {
  // forceRefresh changes the upstream behavior (cache-bypass), so it MUST
  // be part of the key — otherwise a follow-up "refresh" call would
  // incorrectly piggy-back on a non-refresh in-flight Promise.
  return `${forceRefreshAvatar ? "1" : "0"}::${normalizedUrl}`;
}

/**
 * Invoke the `scrape-linkedin` edge function with concurrent-call
 * deduplication. If another caller is already mid-flight for the same
 * (URL, forceRefresh) pair, returns the existing Promise instead of
 * starting a new request.
 *
 * The Promise is removed from the map as soon as it settles, so a user
 * can immediately retry after a failure or trigger a deliberate refresh.
 */
export function fetchLinkedinDeduped(
  normalizedUrl: string,
  forceRefreshAvatar: boolean,
): Promise<ScrapeLinkedinResult> {
  const key = makeKey(normalizedUrl, forceRefreshAvatar);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await supabase.functions.invoke("scrape-linkedin", {
        body: { url: normalizedUrl, forceRefreshAvatar },
      });
      return { data: res.data, error: res.error };
    } finally {
      // Always evict on settle so subsequent calls (retries, deliberate
      // refreshes) can hit the network again.
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

/**
 * Test-only: returns whether a request for this key is currently in flight.
 * Useful for asserting deduplication behavior without leaking the map.
 */
export function __isInFlight(
  normalizedUrl: string,
  forceRefreshAvatar: boolean,
): boolean {
  return inFlight.has(makeKey(normalizedUrl, forceRefreshAvatar));
}

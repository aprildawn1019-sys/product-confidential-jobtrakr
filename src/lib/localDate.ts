/**
 * Timezone-safe date helpers for user-supplied dates.
 *
 * Why this exists:
 *   `new Date("2026-04-22")` parses as **UTC midnight**, which is "yesterday"
 *   for any user west of UTC. That makes a follow-up dated "today" appear
 *   overdue, and an interview scheduled for today appear on tomorrow's row.
 *
 *   We store calendar dates as `YYYY-MM-DD` (no time, no tz) — those should
 *   always render as the user's *local* day. Datetimes that already carry a
 *   timezone (`2026-04-22T14:30:00Z`, `...+02:00`) are passed through to the
 *   native parser so they continue to render in local time correctly.
 *
 * Use these helpers anywhere we read a date string from the database before
 * comparing, formatting, or bucketing it. Never call `new Date(str)` directly
 * on a value that might be a date-only string.
 */

import {
  differenceInCalendarDays,
  isToday as dfIsToday,
  isPast as dfIsPast,
  format,
} from "date-fns";

/** Matches `YYYY-MM-DD` exactly (no time component). */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a date string into a Date anchored to the user's local timezone.
 *
 * - `YYYY-MM-DD`            → local midnight on that calendar day
 * - ISO with time/timezone  → native parse (already unambiguous)
 * - anything else / invalid → returns `null` so callers can guard cleanly
 */
export function parseLocalDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;

  if (DATE_ONLY_RE.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    // Month is 0-indexed in the Date constructor.
    const local = new Date(y, m - 1, d);
    return isNaN(local.getTime()) ? null : local;
  }

  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** True when the given date string is "today" in the user's local timezone. */
export function isLocalToday(input: string | null | undefined): boolean {
  const d = parseLocalDate(input);
  return d ? dfIsToday(d) : false;
}

/** True when the given date string is strictly before "today" in local time. */
export function isLocalPast(input: string | null | undefined): boolean {
  const d = parseLocalDate(input);
  if (!d) return false;
  return dfIsPast(d) && !dfIsToday(d);
}

/**
 * Whole-calendar-day delta from the input to *now* in the user's local tz.
 * Positive → input is in the past. Negative → input is in the future.
 */
export function daysFromNowLocal(input: string | null | undefined): number | null {
  const d = parseLocalDate(input);
  if (!d) return null;
  return differenceInCalendarDays(new Date(), d);
}

/** Convenience: format a date string with date-fns, returning `fallback` on parse failure. */
export function formatLocalDate(
  input: string | null | undefined,
  pattern: string,
  fallback = "",
): string {
  const d = parseLocalDate(input);
  return d ? format(d, pattern) : fallback;
}

/**
 * Format using `toLocaleDateString` (respects the user's locale + tz).
 * Returns `fallback` (defaults to the raw input) on parse failure so we
 * never render "Invalid Date" in the UI.
 */
export function formatLocalDateParts(
  input: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback?: string,
): string {
  const d = parseLocalDate(input);
  if (!d) return fallback ?? input ?? "";
  return d.toLocaleDateString(undefined, options);
}

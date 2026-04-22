// @vitest-environment node
/**
 * Timezone-aware tests for `parseLocalDate` & friends.
 *
 * Why this file is shaped this way:
 *   `process.env.TZ` is only honored by V8 when set BEFORE the first `Date`
 *   is constructed in the process. That makes per-test `vi.stubEnv("TZ", …)`
 *   unreliable. Instead we run this suite three times via the wrapper script
 *   `scripts/test-localdate-tz.mjs`, once per representative timezone:
 *
 *     • America/Los_Angeles  (UTC-8, no DST in winter / UTC-7 in summer)
 *     • UTC                  (UTC+0)
 *     • Asia/Karachi         (UTC+5)
 *
 *   Inside each run we read `process.env.TZ` and assert that a `YYYY-MM-DD`
 *   string parses to **local midnight of that calendar day** — never UTC
 *   midnight, which would shift the day for anyone west of UTC.
 */

import { describe, it, expect } from "vitest";
import {
  parseLocalDate,
  isLocalToday,
  isLocalPast,
  daysFromNowLocal,
  formatLocalDate,
} from "./localDate";

const TZ = process.env.TZ ?? "UTC";

describe(`localDate helpers — TZ=${TZ}`, () => {
  describe("parseLocalDate (YYYY-MM-DD → local midnight)", () => {
    it("returns the same calendar day the user typed, regardless of timezone", () => {
      const d = parseLocalDate("2026-04-22");
      expect(d).not.toBeNull();
      // The whole point: Apr 22 must read as Apr 22 in the local zone.
      expect(d!.getFullYear()).toBe(2026);
      expect(d!.getMonth()).toBe(3); // April (0-indexed)
      expect(d!.getDate()).toBe(22);
      expect(d!.getHours()).toBe(0);
      expect(d!.getMinutes()).toBe(0);
    });

    it("does NOT regress to UTC midnight (the bug we're guarding against)", () => {
      // `new Date("2026-04-22")` would be 2026-04-22T00:00:00Z, which is
      // Apr 21 in any negative-UTC zone. parseLocalDate must avoid that.
      const d = parseLocalDate("2026-04-22")!;
      const utcMidnight = new Date("2026-04-22T00:00:00Z");
      // In UTC these happen to coincide; everywhere else they must differ.
      if (TZ !== "UTC") {
        expect(d.getTime()).not.toBe(utcMidnight.getTime());
      }
      // And in every zone, the *local day* must be the 22nd.
      expect(d.getDate()).toBe(22);
    });

    it("handles year/month boundaries correctly", () => {
      const d = parseLocalDate("2026-01-01")!;
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(0);
      expect(d.getDate()).toBe(1);
    });

    it("passes ISO datetimes through to the native parser unchanged", () => {
      const iso = "2026-04-22T14:30:00Z";
      const d = parseLocalDate(iso)!;
      expect(d.getTime()).toBe(new Date(iso).getTime());
    });

    it("returns null for empty / invalid input", () => {
      expect(parseLocalDate(null)).toBeNull();
      expect(parseLocalDate(undefined)).toBeNull();
      expect(parseLocalDate("")).toBeNull();
      expect(parseLocalDate("not a date")).toBeNull();
    });
  });

  describe("isLocalToday / isLocalPast (calendar-day comparisons)", () => {
    it("treats the user's local 'today' as today, not the UTC day", () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;

      expect(isLocalToday(todayStr)).toBe(true);
      expect(isLocalPast(todayStr)).toBe(false);
    });

    it("flags yesterday's date as past, not today", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yyyy = yesterday.getFullYear();
      const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
      const dd = String(yesterday.getDate()).padStart(2, "0");
      const yStr = `${yyyy}-${mm}-${dd}`;

      expect(isLocalToday(yStr)).toBe(false);
      expect(isLocalPast(yStr)).toBe(true);
    });

    it("flags tomorrow's date as neither today nor past", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const dd = String(tomorrow.getDate()).padStart(2, "0");
      const tStr = `${yyyy}-${mm}-${dd}`;

      expect(isLocalToday(tStr)).toBe(false);
      expect(isLocalPast(tStr)).toBe(false);
    });
  });

  describe("daysFromNowLocal (whole-calendar-day delta)", () => {
    it("returns 1 for yesterday and -1 for tomorrow in every timezone", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate(),
        ).padStart(2, "0")}`;

      expect(daysFromNowLocal(fmt(yesterday))).toBe(1);
      expect(daysFromNowLocal(fmt(tomorrow))).toBe(-1);
    });
  });

  describe("formatLocalDate", () => {
    it("formats the date the user typed, not a tz-shifted one", () => {
      // If we mistakenly used UTC parsing, US-west users would see "Apr 21".
      expect(formatLocalDate("2026-04-22", "yyyy-MM-dd")).toBe("2026-04-22");
      expect(formatLocalDate("2026-04-22", "MMM d")).toBe("Apr 22");
    });

    it("returns the fallback for invalid input", () => {
      expect(formatLocalDate("garbage", "yyyy-MM-dd", "—")).toBe("—");
    });
  });
});

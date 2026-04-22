/**
 * Tests for the in-flight LinkedIn fetch deduplication helper.
 *
 * The helper guarantees that concurrent callers asking for the same
 * (URL, forceRefresh) tuple share a single edge function invocation.
 * After the Promise settles, the slot is freed so a deliberate refresh
 * (or a retry after failure) can hit the network again.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase client BEFORE importing the helper so the helper's
// internal `supabase.functions.invoke` reference picks up our spy.
const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

// Imported after the mock is registered.
import { fetchLinkedinDeduped, __isInFlight } from "./linkedinFetchDedup";

describe("fetchLinkedinDeduped", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("collapses concurrent calls for the same URL into a single invocation", async () => {
    // Resolve the same Promise to whoever calls invoke first; subsequent
    // callers should never reach this mock at all.
    let resolve!: (value: unknown) => void;
    invokeMock.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );

    const url = "https://linkedin.com/in/test-user";
    const p1 = fetchLinkedinDeduped(url, false);
    const p2 = fetchLinkedinDeduped(url, false);
    const p3 = fetchLinkedinDeduped(url, false);

    // While in flight, the helper exposes the entry for assertions.
    expect(__isInFlight(url, false)).toBe(true);
    // All three callers MUST receive the exact same Promise reference —
    // that's the contract that makes downstream awaits cheap.
    expect(p1).toBe(p2);
    expect(p2).toBe(p3);

    resolve({ data: { success: true, data: { name: "Test" } }, error: null });
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
    // Slot is freed after settling so the next call can hit the network.
    expect(__isInFlight(url, false)).toBe(false);
  });

  it("does NOT dedup across different forceRefresh flags", async () => {
    invokeMock.mockResolvedValue({ data: { success: true }, error: null });
    const url = "https://linkedin.com/in/forced-vs-not";

    // Same URL, different refresh intent — must hit the edge function
    // separately because the upstream behavior differs (cache-bypass).
    await Promise.all([
      fetchLinkedinDeduped(url, false),
      fetchLinkedinDeduped(url, true),
    ]);

    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(invokeMock).toHaveBeenCalledWith("scrape-linkedin", {
      body: { url, forceRefreshAvatar: false },
    });
    expect(invokeMock).toHaveBeenCalledWith("scrape-linkedin", {
      body: { url, forceRefreshAvatar: true },
    });
  });

  it("allows a fresh request after the previous one settles (success path)", async () => {
    invokeMock.mockResolvedValue({ data: { success: true }, error: null });
    const url = "https://linkedin.com/in/sequential";

    await fetchLinkedinDeduped(url, false);
    expect(__isInFlight(url, false)).toBe(false);

    await fetchLinkedinDeduped(url, false);
    // Each sequential (non-overlapping) call MUST hit the network — the
    // helper is a concurrency guard, not a result cache.
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });

  it("frees the slot even when the underlying invoke rejects", async () => {
    invokeMock.mockRejectedValueOnce(new Error("boom"));
    const url = "https://linkedin.com/in/will-fail";

    await expect(fetchLinkedinDeduped(url, false)).rejects.toThrow("boom");
    // Critical: a stuck "in flight" entry would prevent any future retry.
    expect(__isInFlight(url, false)).toBe(false);

    invokeMock.mockResolvedValueOnce({ data: { success: true }, error: null });
    const second = await fetchLinkedinDeduped(url, false);
    expect(second.error).toBeNull();
  });

  it("treats different URLs as independent in-flight entries", async () => {
    let resolveA!: (v: unknown) => void;
    let resolveB!: (v: unknown) => void;
    invokeMock
      .mockReturnValueOnce(new Promise((r) => { resolveA = r; }))
      .mockReturnValueOnce(new Promise((r) => { resolveB = r; }));

    const a = "https://linkedin.com/in/alpha";
    const b = "https://linkedin.com/in/bravo";

    const pA = fetchLinkedinDeduped(a, false);
    const pB = fetchLinkedinDeduped(b, false);

    expect(__isInFlight(a, false)).toBe(true);
    expect(__isInFlight(b, false)).toBe(true);
    expect(pA).not.toBe(pB);

    resolveA({ data: { id: "a" }, error: null });
    resolveB({ data: { id: "b" }, error: null });
    await Promise.all([pA, pB]);

    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});

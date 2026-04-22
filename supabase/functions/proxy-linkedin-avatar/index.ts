// Proxy + cache for LinkedIn profile photos.
//
// Why this exists: LinkedIn's CDN (media.licdn.com) returns 403 / mangled
// referrer responses when an <img> on a third-party origin tries to load
// a member photo directly. The fix is to fetch server-side once, store the
// bytes in our own public storage bucket, and hand the client a stable
// public URL it can render forever (until the user re-imports).
//
// Cache strategy:
//   1. Hash the source URL → deterministic object key in the
//      `linkedin-avatars` bucket.
//   2. HEAD the object first. If it exists → return its public URL
//      immediately (no upstream fetch, no AI/credit usage).
//   3. Otherwise fetch the upstream image, upload it, return the URL.
//
// Auth: requires a logged-in user. The bucket itself is public-read (so the
// returned URLs work in <img>), but writing is gated through this function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireUser } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "linkedin-avatars";

/** Stable, filesystem-safe key derived from the upstream URL. */
async function hashUrl(url: string): Promise<string> {
  const data = new TextEncoder().encode(url);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Pick a sane file extension from a URL or content-type. */
function pickExtension(url: string, contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("svg")) return "svg";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  // Fall back to URL extension if content-type is unhelpful.
  const m = url.split("?")[0].match(/\.(png|webp|gif|svg|jpe?g)$/i);
  if (m) return m[1].toLowerCase().replace("jpeg", "jpg");
  return "jpg";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req, corsHeaders);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json().catch(() => ({}));
    const { url } = body ?? {};
    // `forceRefresh` opts out of the SHA-256 hash cache for this call:
    //   • Same upstream URL → same hash → normally returns the cached
    //     copy without ever hitting LinkedIn again.
    //   • When the user *re-imports* the same contact and the underlying
    //     photo was updated upstream, the URL often stays identical
    //     (LinkedIn only swaps the bytes), so the hash matches and we
    //     never refresh. This flag forces a re-fetch + upload (`upsert`)
    //     to overwrite the stored bytes in place. The public URL stays
    //     the same, so existing references keep resolving.
    const forceRefresh = body?.forceRefresh === true;
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid 'url'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Only proxy LinkedIn-hosted media. Refusing arbitrary URLs prevents
    // turning this function into an open relay.
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const isLinkedIn = /(^|\.)licdn\.com$/i.test(parsed.hostname) ||
      /(^|\.)linkedin\.com$/i.test(parsed.hostname);
    if (!isLinkedIn) {
      return new Response(
        JSON.stringify({ success: false, error: "Only LinkedIn media URLs are proxied" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const hash = await hashUrl(url);

    // ── Cache lookup ────────────────────────────────────────────────
    // List with a name filter is the cheapest way to check existence
    // without paying for a full object download. Skipped entirely when
    // the caller asked for a forced refresh.
    const { data: existing } = forceRefresh
      ? { data: [] as { name: string }[] }
      : await admin.storage.from(BUCKET).list("", { limit: 1, search: hash });

    const cached = existing?.find((o) => o.name.startsWith(`${hash}.`));
    if (cached && !forceRefresh) {
      const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(cached.name);
      console.log("Cache HIT:", cached.name);
      return new Response(
        JSON.stringify({ success: true, cached: true, url: pub.publicUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // When forcing a refresh, proactively remove any prior objects sharing
    // this hash. `upsert: true` already overwrites bytes for the same key,
    // but the upstream content-type may have changed (e.g. jpg → webp),
    // which would yield a *different* object name and leave the old file
    // orphaned forever. Listing + bulk-removing is cheap and idempotent.
    if (forceRefresh) {
      const { data: stale } = await admin.storage
        .from(BUCKET)
        .list("", { limit: 10, search: hash });
      const staleNames = (stale ?? [])
        .filter((o) => o.name.startsWith(`${hash}.`))
        .map((o) => o.name);
      if (staleNames.length > 0) {
        const { error: removeError } = await admin.storage
          .from(BUCKET)
          .remove(staleNames);
        if (removeError) {
          console.warn("Stale removal warning:", removeError.message);
        } else {
          console.log("Removed stale cache entries:", staleNames.join(", "));
        }
      }
    }

    // ── Rate limit upstream fetches ─────────────────────────────────
    // Only requests that actually need to hit LinkedIn count toward the
    // limit — cache hits short-circuited above are free. This keeps
    // normal browsing unaffected while preventing rapid re-imports of
    // the same contact (or a mass re-import) from hammering upstream.
    // 30 upstream fetches / 10 minutes per user is generous for typical
    // CRM workflows but blocks pathological loops.
    const rl = await checkRateLimit({
      userId: auth.userId,
      functionName: "proxy-linkedin-avatar",
      maxCalls: 30,
      windowMinutes: 10,
      corsHeaders,
    });
    if (rl.errorResponse) return rl.errorResponse;

    // ── Cache miss → fetch upstream ─────────────────────────────────
    console.log("Cache MISS, fetching:", url.substring(0, 80));
    const upstream = await fetch(url, {
      // Pretend to be a browser so LinkedIn returns the image, not an HTML
      // login wall. We don't send cookies / referrer.
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/png,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!upstream.ok) {
      console.log("Upstream fetch failed:", upstream.status);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Upstream returned ${upstream.status}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return new Response(
        JSON.stringify({ success: false, error: "Upstream did not return an image" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bytes = new Uint8Array(await upstream.arrayBuffer());
    const ext = pickExtension(url, contentType);
    const objectName = `${hash}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(objectName, bytes, {
        contentType,
        cacheControl: "31536000", // 1 year — same URL hash means same image
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload failed:", uploadError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to cache image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(objectName);
    console.log("Cached:", objectName, `(${bytes.byteLength} bytes)`);

    return new Response(
      JSON.stringify({ success: true, cached: false, url: pub.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("proxy-linkedin-avatar error:", e instanceof Error ? e.message : e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

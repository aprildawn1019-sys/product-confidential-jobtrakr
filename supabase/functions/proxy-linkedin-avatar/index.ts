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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "linkedin-avatars";

// Cache TTL — LinkedIn photos rarely change, but stale ones look bad
// (someone updates their photo, we keep showing the old one forever).
// 30 days is a balance between freshness and bandwidth/cost. Override
// per-request with `force: true` to bypass entirely.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** True when a stored object is older than our TTL and should be refetched. */
function isExpired(createdAt: string | undefined | null): boolean {
  if (!createdAt) return false; // unknown age → treat as fresh, don't churn
  const age = Date.now() - new Date(createdAt).getTime();
  return Number.isFinite(age) && age > CACHE_TTL_MS;
}

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

    const { url, force } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid 'url'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const bypassCache = force === true;

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
    // without paying for a full object download. We also use the
    // returned `created_at` to enforce the TTL.
    const { data: existing } = await admin.storage
      .from(BUCKET)
      .list("", { limit: 1, search: hash });

    const cached = existing?.find((o) => o.name.startsWith(`${hash}.`));
    if (cached && !bypassCache && !isExpired(cached.created_at)) {
      const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(cached.name);
      console.log("Cache HIT:", cached.name);
      // Bust browser caches by appending the storage object's mtime — same
      // bytes still resolve from CDN, but a stale `<img>` will refetch
      // when we return a different URL.
      const bust = cached.updated_at || cached.created_at || "";
      const url = bust ? `${pub.publicUrl}?v=${encodeURIComponent(bust)}` : pub.publicUrl;
      return new Response(
        JSON.stringify({ success: true, cached: true, url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Stale or forced refresh — drop the existing object so the upload
    // path below replaces it cleanly even if the extension changes.
    if (cached && (bypassCache || isExpired(cached.created_at))) {
      console.log(
        bypassCache ? "Force refresh, evicting:" : "TTL expired, evicting:",
        cached.name,
      );
      await admin.storage.from(BUCKET).remove([cached.name]);
    }

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

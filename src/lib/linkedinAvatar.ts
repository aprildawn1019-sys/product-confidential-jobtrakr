/**
 * Pure helpers for extracting a LinkedIn profile photo URL from raw HTML.
 *
 * This module mirrors the extraction logic that runs inside the
 * `scrape-linkedin` edge function (Deno). We keep a Node-importable copy
 * here for two reasons:
 *
 *   1. It lets us unit-test the parsing rules from vitest without spinning
 *      up the Deno runtime.
 *   2. The front-end can reuse the same rules if we ever need to parse
 *      HTML client-side (e.g. paste-a-LinkedIn-page workflow).
 *
 * IMPORTANT: when you change the extraction rules, update both this file
 * AND `supabase/functions/scrape-linkedin/index.ts` (`extractAvatarFromHtml`).
 * The two implementations should stay byte-for-byte equivalent in behavior.
 */

/**
 * Pull the first usable profile-photo URL out of a raw HTML document.
 *
 * Priority order (most stable / publicly accessible first):
 *   1. <meta property="og:image" content="…">
 *   2. <meta name="twitter:image" content="…">
 *   3. JSON-LD `image` field (string, `.url`, or `.contentUrl`)
 *
 * Returns "" when no candidate is found. Never throws — malformed JSON-LD
 * is silently ignored so a single bad <script> block can't break parsing.
 */
export function extractAvatarFromHtml(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return og[1];

  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (tw?.[1]) return tw[1];

  const jsonLd = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLd?.[1]) {
    try {
      const parsed = JSON.parse(jsonLd[1]);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of candidates) {
        const img = node?.image;
        if (typeof img === "string") return img;
        if (typeof img?.url === "string") return img.url;
        if (typeof img?.contentUrl === "string") return img.contentUrl;
      }
    } catch {
      /* malformed JSON-LD — fall through to "" */
    }
  }
  return "";
}

/**
 * Heuristic: does this URL look like it points at LinkedIn's CDN?
 * Used by tests to assert that we DID surface a LinkedIn photo URL even
 * though we know the browser will likely fail to load it (CORS / 403).
 */
export function isLinkedInMediaUrl(url: string): boolean {
  return /(?:^|\.)licdn\.com\//i.test(url) || /linkedin\.com\/.+\.(jpg|jpeg|png|webp)/i.test(url);
}

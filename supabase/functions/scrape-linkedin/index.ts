import { getAIConfig } from "../_shared/ai-config.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // SECURITY: require auth — Firecrawl scrapes consume credits and the function fetches arbitrary URLs.
    const auth = await requireUser(req, corsHeaders);
    if (auth.errorResponse) return auth.errorResponse;

    const { url } = await req.json();
    if (!url) throw new Error("Missing LinkedIn URL");

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;

    // Normalize LinkedIn URL — strip trailing slashes, query params, locale prefixes
    formattedUrl = formattedUrl.split("?")[0].replace(/\/+$/, "");

    // Extract the LinkedIn username slug from the URL
    const linkedinMatch = formattedUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
    const rawSlug = linkedinMatch?.[1] || "";
    const slug = rawSlug.replace(/-/g, " ");

    const ai = getAIConfig("google/gemini-2.5-flash");
    if (!ai) throw new Error("No AI provider configured. Set OPENAI_API_KEY or LOVABLE_API_KEY.");

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    let profileContent = "";
    // Track the contact's profile photo URL across strategies. We prefer
    // og:image / JSON-LD `image` because they're stable, public, and
    // returned without authentication. We never fail the request if we
    // can't find one — the UI falls back to initials.
    let avatarUrl = "";

    /** Pull the first og:image / twitter:image / JSON-LD image out of raw HTML. */
    const extractAvatarFromHtml = (html: string): string => {
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
        } catch { /* ignore */ }
      }
      return "";
    };

    // Strategy 1: Try Firecrawl SCRAPE on the LinkedIn URL directly.
    // We request `markdown` (for the AI extraction below) AND `rawHtml` so
    // we can grab og:image without a separate request.
    if (firecrawlKey) {
      console.log("Strategy 1: Firecrawl scrape of LinkedIn URL");
      try {
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: formattedUrl,
            formats: ["markdown", "rawHtml"],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        if (scrapeResp.ok) {
          const scrapeData = await scrapeResp.json();
          const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
          const rawHtml = scrapeData.data?.rawHtml || scrapeData.rawHtml || "";
          if (markdown.length > 50) {
            profileContent = markdown.substring(0, 6000);
            console.log("Firecrawl scrape success, content length:", profileContent.length);
          }
          if (rawHtml) {
            const found = extractAvatarFromHtml(rawHtml);
            if (found) {
              avatarUrl = found;
              console.log("Avatar from Firecrawl rawHtml:", avatarUrl.substring(0, 80));
            }
          }
        } else {
          console.log("Firecrawl scrape status:", scrapeResp.status);
        }
      } catch (e) {
        console.log("Firecrawl scrape error:", e.message);
      }
    }

    // Strategy 2: Firecrawl search with the full LinkedIn URL as query
    if (profileContent.length < 100 && firecrawlKey && rawSlug) {
      console.log("Strategy 2: Firecrawl search for profile URL");
      try {
        const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `site:linkedin.com/in/${rawSlug} current position`,
            limit: 5,
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        if (searchResp.ok) {
          const searchData = await searchResp.json();
          const results = searchData.data || [];
          const combined = results
            .map((r: any) => {
              const md = r.markdown || "";
              const title = r.title || "";
              const desc = r.description || "";
              return `${title}\n${desc}\n${md}`;
            })
            .join("\n---\n")
            .substring(0, 6000);
          if (combined.length > 50) {
            profileContent = combined;
            console.log("Firecrawl search success, content length:", profileContent.length);
          }
        }
      } catch (e) {
        console.log("Search error:", e.message);
      }
    }

    // Strategy 3: Google search for the person's name + LinkedIn
    if (profileContent.length < 100 && firecrawlKey && slug) {
      console.log("Strategy 3: Web search for person name");
      try {
        const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `"${slug}" linkedin profile current role company`,
            limit: 5,
          }),
        });

        if (searchResp.ok) {
          const searchData = await searchResp.json();
          const results = searchData.data || [];
          profileContent = results
            .map((r: any) => `${r.title || ""} - ${r.description || ""}`)
            .join("\n")
            .substring(0, 4000);
          console.log("Web search content length:", profileContent.length);
        }
      } catch (e) {
        console.log("Web search error:", e.message);
      }
    }

    // Strategy 4: Direct fetch for JSON-LD or meta tags. Even if Strategy 1
    // already filled `profileContent`, we still try this if we don't yet
    // have an avatar URL — it's the cheapest way to grab og:image.
    if (profileContent.length < 100 || !avatarUrl) {
      console.log("Strategy 4: Direct fetch for meta/JSON-LD");
      try {
        const directResp = await fetch(formattedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Accept": "text/html",
          },
          redirect: "follow",
        });

        if (directResp.ok) {
          const html = await directResp.text();
          if (!avatarUrl) {
            const found = extractAvatarFromHtml(html);
            if (found) {
              avatarUrl = found;
              console.log("Avatar from direct fetch:", avatarUrl.substring(0, 80));
            }
          }
          if (profileContent.length < 100) {
            const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
            if (jsonLdMatch) {
              profileContent = jsonLdMatch[1];
              console.log("Found JSON-LD data");
            } else {
              const metaContent: string[] = [];
              const metaMatches = html.matchAll(/<meta[^>]*(?:name|property)="([^"]*)"[^>]*content="([^"]*)"[^>]*>/gi);
              for (const m of metaMatches) {
                if (m[1].includes("title") || m[1].includes("description") || m[1].includes("og:")) {
                  metaContent.push(`${m[1]}: ${m[2]}`);
                }
              }
              if (metaContent.length > 0) {
                profileContent = metaContent.join("\n");
                console.log("Extracted meta tags:", metaContent.length);
              }
            }
          }
        }
      } catch (e) {
        console.log("Direct fetch failed:", e.message);
      }
    }

    // Fallback: use URL slug
    if (profileContent.length < 30) {
      profileContent = `LinkedIn profile URL: ${formattedUrl}\nName from URL slug: ${slug}`;
      console.log("Using URL-only extraction");
    }

    // Use AI to extract structured contact info
    const aiResp = await fetch(`${ai.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ai.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          {
            role: "system",
            content: `You extract contact information from LinkedIn profile data. Rules:
1. Parse JSON-LD structured data if present
2. Convert URL slugs to proper capitalized names (e.g. 'john-doe-123' → 'John Doe', 'jane-smith-mba' → 'Jane Smith')
3. Remove trailing numbers, credentials, and suffixes from URL-derived names
4. Look for current job title and company in the content
5. If no company or role can be determined from the content, return empty strings for those fields — do NOT guess
6. Always return the LinkedIn URL as provided`,
          },
          {
            role: "user",
            content: `Extract contact details from this LinkedIn profile:\n\nURL: ${formattedUrl}\nURL slug: ${rawSlug}\n\nProfile content:\n${profileContent}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_contact",
            description: "Extract contact details from a LinkedIn profile",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Full name (properly capitalized)" },
                role: { type: "string", description: "Current job title/headline. Empty string if unknown." },
                company: { type: "string", description: "Current company name. Empty string if unknown." },
                linkedin: { type: "string", description: "LinkedIn profile URL" },
              },
              required: ["name", "role", "company", "linkedin"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_contact" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ success: false, error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ success: false, error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI extraction failed");
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No data extracted from profile");

    const contact = JSON.parse(toolCall.function.arguments);
    contact.linkedin = contact.linkedin || formattedUrl;
    // Attach the profile photo URL we discovered (if any). The client
    // stores it on the contact and renders it in the avatar circle, with
    // an automatic fallback to initials if the image fails to load.
    if (avatarUrl) contact.avatar_url = avatarUrl;

    console.log("Extracted:", contact.name, "|", contact.role, "|", contact.company, "| avatar:", avatarUrl ? "yes" : "no");

    return new Response(JSON.stringify({ success: true, data: contact }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-linkedin error:", e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

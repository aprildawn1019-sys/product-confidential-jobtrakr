const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) throw new Error("Missing LinkedIn URL");

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;

    // Extract the LinkedIn username slug from the URL
    const linkedinMatch = formattedUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
    const slug = linkedinMatch?.[1]?.replace(/-/g, " ") || "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Strategy 1: Try Firecrawl search for public info (fast, no scraping)
    let profileContent = "";
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (firecrawlKey && slug) {
      console.log("Searching for LinkedIn profile info:", slug);
      try {
        const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `"${slug}" linkedin current position company title`,
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
          console.log("Search returned content length:", profileContent.length);
        }
      } catch (e) {
        console.log("Search error, continuing:", e.message);
      }
    }

    // Strategy 2: Try direct fetch for JSON-LD (public profiles embed structured data)
    if (profileContent.length < 100) {
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
          const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
          if (jsonLdMatch) {
            profileContent = jsonLdMatch[1];
            console.log("Found JSON-LD data");
          } else {
            // Extract meta tags as fallback
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
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "Extract contact info from LinkedIn profile data. Parse JSON-LD if present. Convert URL slugs to proper names (e.g. 'john-doe' → 'John Doe'). Return data via the tool.",
          },
          {
            role: "user",
            content: `Extract details from this LinkedIn profile:\n\nURL: ${formattedUrl}\n\n${profileContent}`,
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
                name: { type: "string", description: "Full name" },
                role: { type: "string", description: "Current job title/headline" },
                company: { type: "string", description: "Current company" },
                linkedin: { type: "string", description: "LinkedIn profile URL" },
              },
              required: ["name"],
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

    console.log("Extracted:", contact.name, "|", contact.role, "|", contact.company);

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

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

    // Extract the LinkedIn username from the URL for search
    const linkedinMatch = formattedUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
    const slug = linkedinMatch?.[1]?.replace(/-/g, " ") || "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Strategy: Use Firecrawl search to find public info about this LinkedIn profile
    let profileContent = "";

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (firecrawlKey && slug) {
      console.log("Searching for LinkedIn profile info via Firecrawl:", slug);
      try {
        const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `site:linkedin.com/in "${slug}" current position company`,
            limit: 3,
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        if (searchResp.ok) {
          const searchData = await searchResp.json();
          const results = searchData.data || [];
          profileContent = results
            .map((r: any) => `${r.title || ""}\n${r.description || ""}\n${r.markdown || ""}`)
            .join("\n\n")
            .substring(0, 6000);
          console.log("Firecrawl search returned content length:", profileContent.length);
        } else {
          console.log("Firecrawl search failed, falling back to AI-only extraction");
        }
      } catch (e) {
        console.log("Firecrawl search error, falling back:", e.message);
      }
    }

    // If Firecrawl didn't return enough content, try a direct fetch as fallback
    // (public profiles sometimes return partial HTML)
    if (profileContent.length < 100) {
      console.log("Trying direct fetch for public profile data...");
      try {
        const directResp = await fetch(formattedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
          },
          redirect: "follow",
        });

        if (directResp.ok) {
          let html = await directResp.text();
          // Try to extract JSON-LD structured data first (LinkedIn embeds this for public profiles)
          const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
          if (jsonLdMatch) {
            profileContent = jsonLdMatch[1];
            console.log("Found JSON-LD data, length:", profileContent.length);
          } else {
            // Clean HTML fallback
            html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
            html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
            html = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            profileContent = html.substring(0, 8000);
            console.log("Using cleaned HTML, length:", profileContent.length);
          }
        } else {
          console.log("Direct fetch returned status:", directResp.status);
        }
      } catch (e) {
        console.log("Direct fetch failed:", e.message);
      }
    }

    // If we still have no content, ask AI to infer from the URL slug alone
    if (profileContent.length < 50) {
      profileContent = `LinkedIn profile URL: ${formattedUrl}\nProfile slug: ${slug}\nNo page content could be retrieved. Please extract what you can from the URL.`;
      console.log("No content retrieved, using URL-only extraction");
    }

    console.log("Sending to AI for extraction...");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Extract contact information from LinkedIn profile data. If there's JSON-LD data, parse it for name, jobTitle, and worksFor. If only a URL slug is available, convert the slug to a proper name (e.g. 'john-doe' → 'John Doe'). Return structured data using the provided tool.",
          },
          {
            role: "user",
            content: `Extract the person's details from this LinkedIn profile data:\n\nURL: ${formattedUrl}\n\n${profileContent}`,
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

    console.log("Extracted contact:", contact.name, contact.company);

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

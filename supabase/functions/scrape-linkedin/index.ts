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

    // Use Firecrawl to scrape LinkedIn (handles JS rendering and anti-bot)
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) throw new Error("Firecrawl connector not configured. Enable it in Settings → Connectors.");

    console.log("Scraping LinkedIn via Firecrawl:", formattedUrl);

    const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!scrapeResp.ok) {
      const errData = await scrapeResp.json().catch(() => ({}));
      console.error("Firecrawl error:", scrapeResp.status, errData);
      if (scrapeResp.status === 402) throw new Error("Firecrawl credits exhausted. Please top up your Firecrawl plan.");
      throw new Error(`Failed to scrape LinkedIn page (status ${scrapeResp.status})`);
    }

    const scrapeData = await scrapeResp.json();
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

    if (!markdown || markdown.length < 50) {
      console.error("Firecrawl returned insufficient content:", markdown.substring(0, 200));
      throw new Error("Could not extract content from LinkedIn profile. The page may require login.");
    }

    const cleaned = markdown.substring(0, 8000);
    console.log("Got markdown content, length:", cleaned.length);

    // Use AI to extract structured contact info
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Extract contact information from a LinkedIn profile page. Return structured data using the provided tool." },
          { role: "user", content: `Extract the person's details from this LinkedIn profile content:\n\n${cleaned}` },
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

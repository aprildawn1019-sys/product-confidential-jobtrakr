import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) throw new Error("Missing LinkedIn URL");

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!resp.ok) throw new Error(`Failed to fetch LinkedIn page: ${resp.status}`);

    let html = await resp.text();
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
    html = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const cleaned = html.substring(0, 8000);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
    if (!toolCall) throw new Error("No data extracted");

    const contact = JSON.parse(toolCall.function.arguments);
    contact.linkedin = contact.linkedin || url;

    return new Response(JSON.stringify({ success: true, data: contact }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

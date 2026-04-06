import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_CALLS = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("authorization") || "";

    // Get user from JWT
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting check
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count } = await supabaseClient
      .from("api_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("function_name", "ai-pm-role-feed")
      .gte("called_at", windowStart);

    if ((count ?? 0) >= RATE_LIMIT_MAX_CALLS) {
      return new Response(JSON.stringify({ error: `Rate limit exceeded. You can search up to ${RATE_LIMIT_MAX_CALLS} times per hour. Please try again later.` }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record this call
    await supabaseClient.from("api_rate_limits").insert({ user_id: user.id, function_name: "ai-pm-role-feed" });

    const { keywords, locations } = await req.json();
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const ai = getAIConfig("google/gemini-3-flash-preview");

    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ai) {
      return new Response(JSON.stringify({ error: "No AI provider configured. Set OPENAI_API_KEY or LOVABLE_API_KEY." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build search queries
    const roleTerms = keywords?.length
      ? keywords.map((k: string) => `"AI Product Manager" ${k}`)
      : ['"AI Product Manager"', '"AI Product Management" hiring', '"ML Product Manager"'];

    const anyLocation = locations?.includes("Any Location");
    const locationStr = anyLocation ? "" : (locations?.length ? ` ${locations.join(" OR ")}` : "");

    // Search via Firecrawl
    const allResults: any[] = [];
    for (const query of roleTerms.slice(0, 3)) {
      try {
        const res = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query + locationStr + " job posting",
            limit: 8,
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        if (res.status === 429) {
          console.warn("Firecrawl rate limited, continuing with partial results");
          break;
        }
        if (res.status === 402) {
          return new Response(JSON.stringify({ error: "Firecrawl credits exhausted. Please top up your Firecrawl plan." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await res.json();
        if (data.data) allResults.push(...data.data);
        else if (data.success && Array.isArray(data)) allResults.push(...data);
      } catch (e) {
        console.error("Firecrawl search error:", e);
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueResults = allResults.filter((r) => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    if (uniqueResults.length === 0) {
      return new Response(JSON.stringify({ jobs: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build AI prompt
    const listingsText = uniqueResults
      .slice(0, 15)
      .map((r, i) => `--- Listing ${i + 1} ---\nURL: ${r.url}\nTitle: ${r.title || "N/A"}\nDescription: ${r.description || ""}\nContent: ${(r.markdown || "").slice(0, 1500)}`)
      .join("\n\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a job data extraction specialist. Extract structured job posting data from raw web search results. Focus on AI Product Management roles. Extract skills mentioned in job descriptions. Only include legitimate job postings, not articles or blog posts.`,
          },
          {
            role: "user",
            content: `Extract job postings from these search results:\n\n${listingsText}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_jobs",
              description: "Extract structured job postings from search results",
              parameters: {
                type: "object",
                properties: {
                  jobs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        company: { type: "string" },
                        location: { type: "string" },
                        type: { type: "string", enum: ["remote", "hybrid", "onsite"] },
                        salary: { type: "string" },
                        url: { type: "string" },
                        description: { type: "string" },
                        skills: {
                          type: "array",
                          items: { type: "string" },
                          description: "Key skills mentioned in the job description",
                        },
                      },
                      required: ["title", "company", "location", "type", "url", "description", "skills"],
                    },
                  },
                },
                required: ["jobs"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_jobs" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    let jobs: any[] = [];
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const parsed = JSON.parse(toolCall.function.arguments);
        jobs = parsed.jobs || [];
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }

    return new Response(JSON.stringify({ jobs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-pm-role-feed error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

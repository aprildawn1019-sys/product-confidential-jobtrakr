import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description } = await req.json();
    if (!description || description.trim().length < 20) {
      return new Response(JSON.stringify({ skills: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = getAIConfig("google/gemini-2.5-flash-lite");
    if (!ai) {
      return new Response(JSON.stringify({ error: "No AI provider configured. Set OPENAI_API_KEY or LOVABLE_API_KEY." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${ai.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ai.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          {
            role: "system",
            content: "You are a skills extraction specialist. Extract the key professional skills, technologies, and competencies mentioned in job descriptions. Return them ranked by prominence/importance in the description. Normalize skill names (e.g., 'ML' → 'Machine Learning', 'PM' → 'Product Management'). Limit to top 20 skills.",
          },
          {
            role: "user",
            content: `Extract skills from this job description:\n\n${description.slice(0, 3000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_skills",
              description: "Return ranked list of skills from a job description",
              parameters: {
                type: "object",
                properties: {
                  skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "Skills ranked by prominence",
                  },
                },
                required: ["skills"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_skills" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", res.status);
      return new Response(JSON.stringify({ skills: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    let skills: string[] = [];
    try {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const parsed = JSON.parse(toolCall.function.arguments);
        skills = parsed.skills || [];
      }
    } catch (e) {
      console.error("Parse error:", e);
    }

    return new Response(JSON.stringify({ skills }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-job-skills error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText } = await req.json();
    if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Resume text is required (min 20 characters)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `You are a resume parser. Extract structured data from the resume text provided. Be thorough and accurate. For skills, extract both technical and soft skills. For the summary, write a concise 2-3 sentence professional summary based on the resume content. You MUST call the extract_profile tool.`,
          },
          { role: "user", content: `Parse this resume and extract profile data:\n\n${resumeText}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_profile",
              description: "Extract structured profile data from a resume",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "2-3 sentence professional summary" },
                  skills: { type: "array", items: { type: "string" }, description: "List of key skills" },
                  target_roles: { type: "array", items: { type: "string" }, description: "Likely target job titles based on experience" },
                  industries: { type: "array", items: { type: "string" }, description: "Industries the candidate has experience in" },
                  locations: { type: "array", items: { type: "string" }, description: "Locations mentioned (city, state format)" },
                  resume_text: { type: "string", description: "Cleaned-up version of the resume text" },
                },
                required: ["summary", "skills", "target_roles", "industries", "resume_text"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_profile" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI parsing failed");
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const profile = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-resume error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

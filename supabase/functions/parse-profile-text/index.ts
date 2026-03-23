import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { text, section } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Text is required (min 10 characters)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const toolsBySection: Record<string, object> = {
      preferences: {
        type: "function",
        function: {
          name: "extract_preferences",
          description: "Extract job preference data from text",
          parameters: {
            type: "object",
            properties: {
              company_sizes: { type: "array", items: { type: "string" }, description: "Preferred company sizes (e.g. Startup, Mid-size, Enterprise)" },
              work_style: { type: "string", enum: ["ic", "manager", "executive", "open"], description: "Work style preference" },
              travel_willingness: { type: "string", enum: ["none", "occasional", "moderate", "frequent", "open"], description: "Travel willingness" },
              start_availability: { type: "string", enum: ["immediately", "2_weeks", "1_month", "2_months", "flexible"], description: "Start availability" },
              culture_preferences: { type: "array", items: { type: "string" }, description: "Culture preferences (e.g. Collaborative, Fast-paced)" },
              remote_preference: { type: "string", enum: ["remote_only", "remote_or_local", "local_only", "open"], description: "Remote work preference" },
              locations: { type: "array", items: { type: "string" }, description: "Preferred locations" },
              target_roles: { type: "array", items: { type: "string" }, description: "Target job roles/titles" },
              industries: { type: "array", items: { type: "string" }, description: "Preferred industries" },
              must_haves: { type: "array", items: { type: "string" }, description: "Must-have requirements" },
              nice_to_haves: { type: "array", items: { type: "string" }, description: "Nice-to-have preferences" },
              dealbreakers: { type: "array", items: { type: "string" }, description: "Dealbreakers" },
              min_base_salary: { type: "number", description: "Minimum base salary if mentioned" },
              compensation_notes: { type: "string", description: "Any compensation notes" },
            },
            required: ["company_sizes", "culture_preferences"],
            additionalProperties: false,
          },
        },
      },
      skills: {
        type: "function",
        function: {
          name: "extract_skills",
          description: "Extract skills profile data from text",
          parameters: {
            type: "object",
            properties: {
              technical_skills: { type: "array", items: { type: "string" }, description: "Technical/hard skills" },
              soft_skills: { type: "array", items: { type: "string" }, description: "Soft/interpersonal skills" },
              tools_platforms: { type: "array", items: { type: "string" }, description: "Tools and platforms" },
              certifications: { type: "array", items: { type: "string" }, description: "Certifications" },
              spoken_languages: { type: "array", items: { type: "string" }, description: "Spoken languages" },
              years_experience: { type: "number", description: "Years of experience if mentioned" },
              skills: { type: "array", items: { type: "string" }, description: "General skill keywords" },
              summary: { type: "string", description: "Professional summary if apparent from text" },
            },
            required: ["technical_skills", "soft_skills", "tools_platforms"],
            additionalProperties: false,
          },
        },
      },
    };

    const sectionKey = section === "skills" ? "skills" : "preferences";
    const toolName = sectionKey === "skills" ? "extract_skills" : "extract_preferences";
    const tool = toolsBySection[sectionKey];

    const systemPrompt = sectionKey === "skills"
      ? "You are a skills profile parser. Extract structured skills data from the text. Be thorough. You MUST call the extract_skills tool."
      : "You are a job preferences parser. Extract structured job preference data from the text. Be thorough. You MUST call the extract_preferences tool.";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse this text and extract ${sectionKey} data:\n\n${text.slice(0, 10000)}` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI parsing failed");
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-profile-text error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

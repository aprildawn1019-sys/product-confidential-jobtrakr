import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { requireUser } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

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
    // SECURITY: verify the JWT signature before trusting any user identity.
    const auth = await requireUser(req, corsHeaders);
    if (auth.errorResponse) return auth.errorResponse;
    const userId = auth.user.id;

    // Per-user rate limit: 20 cover letters per hour.
    const rl = await checkRateLimit({
      userId,
      functionName: "generate-cover-letter",
      maxCalls: 20,
      windowMinutes: 60,
      corsHeaders,
    });
    if (rl.errorResponse) return rl.errorResponse;

    const { jobTitle, company, jobDescription } = await req.json();

    if (!jobDescription) {
      return new Response(JSON.stringify({ error: "Job description is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's profile for resume/skills (server-trusted userId from verified JWT)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let resumeText = "";
    let skills: string[] = [];
    let summary = "";

    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/job_search_profile?user_id=eq.${userId}&select=resume_text,skills,summary&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );
    const profiles = await profileRes.json();
    if (profiles?.[0]) {
      resumeText = profiles[0].resume_text || "";
      skills = profiles[0].skills || [];
      summary = profiles[0].summary || "";
    }

    const ai = getAIConfig("google/gemini-3-flash-preview");
    if (!ai) throw new Error("No AI provider configured. Set OPENAI_API_KEY or LOVABLE_API_KEY.");

    const systemPrompt = `You are an expert career coach and professional cover letter writer. 
Write compelling, personalized cover letters that:
- Align the candidate's experience with the specific job requirements
- Use a professional but warm tone
- Highlight relevant skills and achievements
- Are concise (3-4 paragraphs)
- Include a strong opening that shows knowledge of the company
- End with a confident call to action
- Do NOT include placeholder brackets like [Your Name] - write it as a complete letter
- Do NOT include the date or address header - just the letter body`;

    const userPrompt = `Write a cover letter for this position:

**Position:** ${jobTitle} at ${company}

**Job Description:**
${jobDescription}

${resumeText ? `**Candidate's Resume/Experience:**\n${resumeText}` : ""}
${skills.length > 0 ? `**Key Skills:** ${skills.join(", ")}` : ""}
${summary ? `**Professional Summary:** ${summary}` : ""}

Write a tailored cover letter that connects my experience to this specific role.`;

    const aiRes = await fetch(`${ai.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ai.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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
      throw new Error("AI generation failed");
    }

    const aiData = await aiRes.json();
    const coverLetter = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ coverLetter }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-cover-letter error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

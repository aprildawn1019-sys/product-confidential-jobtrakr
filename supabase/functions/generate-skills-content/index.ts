import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, topSkills, profileSummary, targetRoles } = await req.json();

    if (!type || !topSkills?.length) {
      return new Response(
        JSON.stringify({ error: "type and topSkills are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiConfig = getAIConfig("google/gemini-2.5-flash");
    if (!aiConfig) {
      return new Response(
        JSON.stringify({ error: "No AI configuration available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (type === "resume_keywords") {
      systemPrompt = `You are an expert resume writer and ATS optimization specialist. Generate a highly optimized, comma-separated list of resume keywords that will maximize ATS match rates. Include variations (e.g. both acronyms and full terms). Order by relevance and impact. Return ONLY the comma-separated keywords, nothing else.`;
      userPrompt = `Based on these top in-demand skills from job descriptions: ${topSkills.join(", ")}
${profileSummary ? `\nCandidate summary: ${profileSummary}` : ""}
${targetRoles?.length ? `\nTarget roles: ${targetRoles.join(", ")}` : ""}

Generate an optimized, ATS-friendly comma-separated keyword list (25-35 keywords). Include the most relevant skills plus related competencies, methodologies, and tools that would strengthen a resume for these types of roles.`;
    } else if (type === "linkedin_headline") {
      systemPrompt = `You are a LinkedIn branding expert. Create a compelling, keyword-rich LinkedIn headline that maximizes profile visibility and recruiter interest. The headline should be professional, impactful, and under 120 characters. Return ONLY the headline text, nothing else.`;
      userPrompt = `Based on the candidate's own skills and competencies: ${topSkills.join(", ")}
${targetRoles?.length ? `\nTarget roles: ${targetRoles.join(", ")}` : ""}
${profileSummary ? `\nCandidate summary: ${profileSummary}` : ""}

Generate a compelling LinkedIn headline that highlights the candidate's strongest skills and aligns with their target roles. Use pipe (|) or bullet separators. Make it attention-grabbing for recruiters.`;
    } else {
      return new Response(
        JSON.stringify({ error: "type must be 'resume_keywords' or 'linkedin_headline'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`${aiConfig.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({ success: true, content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-skills-content error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

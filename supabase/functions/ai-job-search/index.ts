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
    const { profile, dismissed, activeBoards } = await req.json();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const profileContext = `
TARGET ROLES: ${profile.target_roles?.join(", ")}
LOCATIONS: ${profile.locations?.join(", ")} (also open to remote US positions)
REMOTE PREFERENCE: ${profile.remote_preference}
MIN BASE SALARY: $${profile.min_base_salary?.toLocaleString() || "Not specified"}
COMPENSATION NOTES: ${profile.compensation_notes || "None"}
MUST HAVES: ${profile.must_haves?.join("; ")}
NICE TO HAVES: ${profile.nice_to_haves?.join("; ")}
INDUSTRIES (ranked): ${profile.industries?.join(", ")}
KEY SKILLS: ${profile.skills?.join(", ")}
PROFESSIONAL SUMMARY: ${profile.summary}
    `.trim();

    const dismissedContext = dismissed?.length
      ? `\n\nEXCLUDE these previously dismissed jobs (do NOT include them):\n${dismissed.map((d: any) => `- ${d.title} at ${d.company}`).join("\n")}`
      : "";

    const boardsContext = activeBoards?.length
      ? `\n\nSOURCE JOBS FROM THESE JOB BOARDS/PLATFORMS (use these as the job_source field):\n${activeBoards.map((b: any) => `- ${b.name}${b.url ? ` (${b.url})` : ""}`).join("\n")}\n\nFor each job, specify which of these sources the job would realistically be found on. Use company ATS sites (Workday, Greenhouse, Lever) when the job would be posted directly on the company's careers page.`
      : "";

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a job search assistant. Given a candidate's profile and preferences, generate realistic, high-quality job listings that would match their criteria. 

Create 8-12 job listings that this candidate should apply to RIGHT NOW. Make them realistic — use real company names that actually hire for these roles, realistic salary ranges, and accurate job descriptions.

Focus on:
1. Roles matching their target titles (VP Product, Head of Product, Sr Director PM, Director PM)
2. Mix of remote and Michigan-local opportunities
3. Industries they prefer (Life Sciences/Biotech first, then EdTech, then B2B SaaS)
4. Roles that value their specific experience (post-acquisition integration, P&L ownership, AI strategy, international expansion)

For each job, provide:
- A realistic, working careers page URL (use real company career page patterns like careers.company.com/jobs/... or company.com/careers/...)
- How long ago the job was posted (e.g. "2 days ago", "1 week ago", "3 weeks ago") — make it realistic
- The name and title of a hiring manager or recruiter if plausible (e.g. "Sarah Chen, VP Engineering" or "Talent Acquisition Team")

Use actual well-known companies in these industries that hire for these roles.

You MUST call the generate_jobs tool with the results.`,
            },
            {
              role: "user",
              content: `Find matching job opportunities for this candidate:\n\n${profileContext}${dismissedContext}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_jobs",
                description: "Return a list of matching job opportunities",
                parameters: {
                  type: "object",
                  properties: {
                    jobs: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          company: { type: "string", description: "Company name" },
                          title: { type: "string", description: "Job title" },
                          location: { type: "string", description: "Location (city, state or Remote)" },
                          type: { type: "string", enum: ["remote", "hybrid", "onsite"], description: "Work arrangement" },
                          salary: { type: "string", description: "Salary range e.g. $200K-$260K" },
                          match_score: { type: "number", description: "How well this matches the profile 0-100" },
                          match_reason: { type: "string", description: "Why this is a good match in 1-2 sentences" },
                          url: { type: "string", description: "Real careers page URL for this job posting" },
                          posted_ago: { type: "string", description: "How long ago posted, e.g. '2 days ago', '1 week ago'" },
                          hiring_contact: { type: "string", description: "Hiring manager or recruiter name and title if available, e.g. 'Sarah Chen, VP Engineering'" },
                        },
                        required: ["company", "title", "location", "type", "salary", "match_score", "match_reason", "url", "posted_ago"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["jobs"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_jobs" } },
        }),
      }
    );

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      throw new Error("AI job search failed");
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("AI did not return structured data");
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Sort by match score descending
    if (result.jobs) {
      result.jobs.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0));
    }

    return new Response(JSON.stringify({ success: true, data: result.jobs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-job-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

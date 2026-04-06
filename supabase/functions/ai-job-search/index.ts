import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Search real job boards via Firecrawl
async function searchRealJobs(
  profile: any,
  searchParams: any,
  activeBoards: any[]
): Promise<{ url: string; title: string; description: string; markdown?: string }[]> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    console.log("Firecrawl not configured, skipping real search");
    return [];
  }

  const roles = profile.target_roles?.slice(0, 3) || [];
  const anyLocation = profile.locations?.includes("Any Location");
  const locations = anyLocation ? [] : (profile.locations?.slice(0, 2) || []);
  const remoteOnly = searchParams?.remoteOnly || false;
  const focusKeywords = searchParams?.focusKeywords || "";
  const recencyFilter = searchParams?.recencyFilter || "any";

  // Build search queries from profile
  const queries: string[] = [];
  for (const role of roles) {
    const locationPart = remoteOnly ? "remote" : anyLocation ? "" : locations.join(" OR ");
    const keywordPart = focusKeywords ? ` ${focusKeywords}` : "";
    queries.push(`${role} job ${locationPart}${keywordPart}`);
  }

  // Add board-specific searches
  for (const board of activeBoards.slice(0, 3)) {
    if (board.url) {
      const role = roles[0] || "product leader";
      queries.push(`site:${new URL(board.url).hostname} ${role}`);
    }
  }

  // Map recency to Firecrawl tbs parameter
  const tbsMap: Record<string, string> = {
    "3days": "qdr:d3",
    "1week": "qdr:w",
    "2weeks": "qdr:w2",
    "1month": "qdr:m",
    "any": "",
  };
  const tbs = tbsMap[recencyFilter] || "";

  const allResults: { url: string; title: string; description: string; markdown?: string }[] = [];

  // Run searches in parallel (limit to 4 to avoid rate limits)
  const searchPromises = queries.slice(0, 4).map(async (query) => {
    try {
      console.log("Firecrawl search:", query);
      const response = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 5,
          tbs: tbs || undefined,
          scrapeOptions: { formats: ["markdown"] },
        }),
      });

      if (!response.ok) {
        console.error(`Firecrawl search failed for "${query}": ${response.status}`);
        return [];
      }

      const data = await response.json();
      return (data.data || []).map((r: any) => ({
        url: r.url,
        title: r.title || "",
        description: r.description || "",
        markdown: r.markdown?.slice(0, 2000) || "",
      }));
    } catch (e) {
      console.error(`Firecrawl search error for "${query}":`, e);
      return [];
    }
  });

  const results = await Promise.all(searchPromises);
  for (const batch of results) {
    allResults.push(...batch);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profile, dismissed, activeBoards, searchParams } = await req.json();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = getAIConfig("google/gemini-2.5-flash");
    if (!ai) throw new Error("No AI provider configured. Set OPENAI_API_KEY or LOVABLE_API_KEY.");

    // Step 1: Search real job boards via Firecrawl
    const realResults = await searchRealJobs(profile, searchParams, activeBoards || []);
    console.log(`Found ${realResults.length} real job postings from Firecrawl`);

    const anyLocation = profile.locations?.includes("Any Location");
    const profileContext = `
TARGET ROLES: ${profile.target_roles?.join(", ")}
LOCATIONS: ${anyLocation ? "Any Location (no location preference)" : profile.locations?.join(", ")} (also open to remote US positions)
REMOTE PREFERENCE: ${profile.remote_preference}
MIN BASE SALARY: $${profile.min_base_salary?.toLocaleString() || "Not specified"}
COMPENSATION NOTES: ${profile.compensation_notes || "None"}
MUST HAVES: ${profile.must_haves?.join("; ")}
NICE TO HAVES: ${profile.nice_to_haves?.join("; ")}
INDUSTRIES (ranked): ${profile.industries?.join(", ")}
KEY SKILLS: ${profile.skills?.join(", ")}
PROFESSIONAL SUMMARY: ${profile.summary}
    `.trim();

    const resultCount = searchParams?.resultCount || 10;
    const minMatchScore = searchParams?.minMatchScore || 0;
    const remoteOnly = searchParams?.remoteOnly || false;
    const recencyFilter = searchParams?.recencyFilter || "any";
    const creativityLevel = searchParams?.creativityLevel || "balanced";
    const focusKeywords = searchParams?.focusKeywords || "";

    const recencyMap: Record<string, string> = {
      "3days": "posted within the last 3 days",
      "1week": "posted within the last week",
      "2weeks": "posted within the last 2 weeks",
      "1month": "posted within the last month",
      "any": "",
    };
    const recencyInstruction = recencyMap[recencyFilter] || "";

    const creativityMap: Record<string, string> = {
      conservative: "Stick very closely to the candidate's exact target roles and industries. Only suggest roles that are a near-perfect match.",
      balanced: "Suggest a mix of close matches and some stretch opportunities that leverage transferable skills.",
      exploratory: "Cast a wide net. Include adjacent roles, unexpected industries, and creative lateral moves that could leverage the candidate's experience in novel ways.",
    };
    const creativityInstruction = creativityMap[creativityLevel] || creativityMap.balanced;

    const dismissedContext = dismissed?.length
      ? `\n\nEXCLUDE these previously dismissed jobs (do NOT include them):\n${dismissed.map((d: any) => `- ${d.title} at ${d.company}`).join("\n")}`
      : "";

    const boardsContext = activeBoards?.length
      ? `\n\nACTIVE JOB BOARDS:\n${activeBoards.map((b: any) => `- ${b.name}${b.url ? ` (${b.url})` : ""}`).join("\n")}`
      : "";

    // Build real results context for AI
    const realJobsContext = realResults.length > 0
      ? `\n\nREAL JOB POSTINGS FOUND (from live web search — use these URLs and details as-is, score them against the candidate profile):\n${realResults.map((r, i) => `
[Job ${i + 1}]
URL: ${r.url}
Title: ${r.title}
Description: ${r.description}
Content Preview: ${r.markdown?.slice(0, 500) || "N/A"}
`).join("\n")}`
      : "";

    const realJobCount = realResults.length;
    const aiSupplementCount = Math.max(0, resultCount - Math.min(realJobCount, resultCount));

    const paramInstructions = [
      realJobCount > 0
        ? `STEP 1: Score and include the ${realJobCount} REAL job postings provided above. Use their EXACT URLs — do NOT modify or fabricate URLs for these. Extract company name, title, location, salary, and other details from the content provided. Only include real postings that score above ${minMatchScore || 0}.`
        : "",
      aiSupplementCount > 0
        ? `STEP 2: Generate ${aiSupplementCount} ADDITIONAL AI-suggested companies to research. For these AI-generated suggestions, clearly mark job_source as "AI Suggestion" and set the URL to the company's actual careers page (e.g. careers.company.com or company.com/careers). Do NOT fabricate specific job posting URLs.`
        : "",
      `Return up to ${resultCount} total results.`,
      minMatchScore > 0 ? `Only include jobs with a match score of ${minMatchScore} or higher.` : "",
      remoteOnly ? "Only include REMOTE positions." : "",
      recencyInstruction ? `Prefer jobs that were ${recencyInstruction}.` : "",
      creativityInstruction,
      focusKeywords ? `Focus areas: ${focusKeywords}. Prioritize roles emphasizing these skills.` : "",
    ].filter(Boolean).join("\n");

    // Step 2: Send to AI for scoring real results + supplementing with suggestions
    const aiRes = await fetch(
      `${ai.baseUrl}/v1/chat/completions`,
      {
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
              content: `You are a job search assistant that combines REAL job postings with AI-powered suggestions.

${paramInstructions}

IMPORTANT RULES:
- For REAL job postings (provided in the context): Keep their exact URLs. Extract details from the content. Score them against the candidate profile.
- For AI suggestions: Use real company names that actually hire for these roles. Set job_source to "AI Suggestion". Use the company's main careers page URL only — never fabricate a specific job posting URL.
- All match_score values must honestly reflect how well the job fits the candidate.

You MUST call the generate_jobs tool with the results.`,
            },
            {
              role: "user",
              content: `Find matching job opportunities for this candidate:\n\n${profileContext}${dismissedContext}${boardsContext}${realJobsContext}`,
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
                          url: { type: "string", description: "URL to the job posting or company careers page" },
                          posted_ago: { type: "string", description: "How long ago posted, e.g. '2 days ago', '1 week ago'" },
                          hiring_contact: { type: "string", description: "Hiring manager or recruiter name and title if available" },
                          job_source: { type: "string", description: "Source: the actual job board/site name for real postings, or 'AI Suggestion' for AI-generated ones" },
                          skills: { type: "array", items: { type: "string" }, description: "Key skills and technologies mentioned or implied for this role, top 10" },
                        },
                        required: ["company", "title", "location", "type", "salary", "match_score", "match_reason", "url", "job_source", "skills"],
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

    return new Response(
      JSON.stringify({
        success: true,
        data: result.jobs,
        meta: { realJobsFound: realJobCount, aiSuggestions: aiSupplementCount },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-job-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

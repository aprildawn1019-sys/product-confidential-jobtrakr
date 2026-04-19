import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SlimJob { id: string; title: string; company: string; status: string; fitScore?: number | null }
interface SlimContact { id: string; name: string; company: string; role?: string; networkRole?: string; warmth?: string }
interface SlimTargetCo { id: string; name: string; priority: string; status: string }
interface SlimRecReq { id: string; contactId: string; status: string; requestedAt: string }

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { user, errorResponse } = await requireUser(req, corsHeaders);
  if (errorResponse) return errorResponse;

  try {
    const { jobs = [], contacts = [], targetCompanies = [], recommendationRequests = [] } = await req.json() as {
      jobs?: SlimJob[];
      contacts?: SlimContact[];
      targetCompanies?: SlimTargetCo[];
      recommendationRequests?: SlimRecReq[];
    };

    const aiConfig = getAIConfig("google/gemini-2.5-flash");
    if (!aiConfig) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a job-search strategy assistant. Given a job seeker's current pipeline, suggest 3-6 NON-OBVIOUS next actions that connect different parts of their workflow. Focus on referral leverage and cross-entity opportunities (e.g. "Champion at Acme + saved Acme job that hasn't been applied to → ask champion for referral first").

Return ONLY valid JSON in this exact shape:
{
  "suggestions": [
    {
      "id": "short-stable-id",
      "lane": "networking" | "referrals" | "applications",
      "urgency": "today" | "soon" | "later",
      "title": "<=70 chars, action-oriented",
      "rationale": "<=120 chars, why this matters now",
      "actionLabel": "<=20 chars button text",
      "contactId": "uuid if action targets a specific contact, else omit",
      "jobId": "uuid if action targets a specific job, else omit",
      "targetCompanyId": "uuid if action targets a specific target company, else omit",
      "href": "/contacts?highlight=<id> or /jobs/<id> or /target-companies"
    }
  ]
}

Rules:
- Skip obvious actions (overdue follow-ups, scheduled interviews, dream-co-with-zero-contacts) — those are already surfaced.
- Prefer connecting champions (warmth=champion) or boosters (networkRole=booster) to specific jobs/companies.
- Never invent IDs. Only reference IDs that appear in the input.
- Max 6 suggestions. Prioritize quality over quantity.`;

    const userPrompt = JSON.stringify({ jobs, contacts, targetCompanies, recommendationRequests });

    const resp = await fetch(`${aiConfig.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI error", resp.status, text);
      return new Response(JSON.stringify({ error: `AI request failed: ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content || "{}";
    let parsed: { suggestions?: unknown[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { suggestions: [] };
    }

    // Validate IDs exist in input — strip hallucinated references
    const jobIds = new Set(jobs.map((j) => j.id));
    const contactIds = new Set(contacts.map((c) => c.id));
    const tcIds = new Set(targetCompanies.map((t) => t.id));

    const cleaned = (parsed.suggestions || [])
      .filter((s: any) => s && typeof s.title === "string")
      .map((s: any) => ({
        id: typeof s.id === "string" ? s.id : crypto.randomUUID(),
        lane: ["networking", "referrals", "applications"].includes(s.lane) ? s.lane : "networking",
        urgency: ["today", "soon", "later"].includes(s.urgency) ? s.urgency : "soon",
        title: String(s.title).slice(0, 100),
        rationale: typeof s.rationale === "string" ? s.rationale.slice(0, 160) : undefined,
        actionLabel: typeof s.actionLabel === "string" ? s.actionLabel.slice(0, 24) : "Take action",
        contactId: typeof s.contactId === "string" && contactIds.has(s.contactId) ? s.contactId : undefined,
        jobId: typeof s.jobId === "string" && jobIds.has(s.jobId) ? s.jobId : undefined,
        targetCompanyId: typeof s.targetCompanyId === "string" && tcIds.has(s.targetCompanyId) ? s.targetCompanyId : undefined,
        href: typeof s.href === "string" ? s.href : undefined,
      }))
      .slice(0, 6);

    return new Response(JSON.stringify({ suggestions: cleaned, userId: user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-next-actions error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { getAIConfig } from "../_shared/ai-config.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Scoreboard {
  applications: { current: number; previous: number; delta: number };
  outreach: { current: number; previous: number; delta: number };
  interviews: { current: number; previous: number; delta: number };
  weekStart: string;
  weeklyHistory: { week: string; applications: number; interviews: number; outreach: number }[];
}

interface PlanAction {
  id: string;
  title: string;
  rationale?: string;
  category?: string;
}

// Get the Monday of the ISO week containing `d`
function startOfISOWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { user, errorResponse } = await requireUser(req, corsHeaders);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const force: boolean = !!body?.force;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const now = new Date();
    const thisWeek = startOfISOWeek(now);
    const thisWeekStr = isoDateOnly(thisWeek);

    // 1. Check cache: if a plan exists for this week and not forced, return it
    if (!force) {
      const { data: cached } = await admin
        .from("weekly_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", thisWeekStr)
        .maybeSingle();

      if (cached) {
        return new Response(
          JSON.stringify({
            scoreboard: cached.scoreboard,
            plan: cached.plan,
            generatedAt: cached.generated_at,
            cached: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 2. Pull last 4 weeks of activity (slim payload)
    const fourWeeksAgo = new Date(thisWeek);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const fourWeeksAgoStr = isoDateOnly(fourWeeksAgo);

    const [jobsRes, activitiesRes, interviewsRes, contactsRes] = await Promise.all([
      admin.from("jobs").select("id,title,company,status,applied_date,created_at").eq("user_id", user.id).limit(200),
      admin.from("contact_activities").select("id,contact_id,activity_type,activity_date").eq("user_id", user.id).gte("activity_date", fourWeeksAgoStr).limit(500),
      admin.from("interviews").select("id,job_id,date,status").eq("user_id", user.id).gte("date", fourWeeksAgoStr).limit(200),
      admin.from("contacts").select("id,name,company,role,relationship_warmth,network_role,last_contacted_at").eq("user_id", user.id).limit(200),
    ]);

    const jobs = jobsRes.data ?? [];
    const activities = activitiesRes.data ?? [];
    const interviews = interviewsRes.data ?? [];
    const contacts = contactsRes.data ?? [];

    // 3. Compute scoreboard: this week vs last week + 8-week history
    const weekStarts: Date[] = [];
    for (let i = 7; i >= 0; i--) {
      const w = new Date(thisWeek);
      w.setDate(w.getDate() - i * 7);
      weekStarts.push(w);
    }

    const bucketIdx = (iso: string | null | undefined): number => {
      if (!iso) return -1;
      const t = new Date(iso).getTime();
      if (isNaN(t)) return -1;
      for (let i = weekStarts.length - 1; i >= 0; i--) {
        if (t >= weekStarts[i].getTime()) return i;
      }
      return -1;
    };

    const weekly = weekStarts.map((w) => ({
      week: isoDateOnly(w),
      applications: 0,
      interviews: 0,
      outreach: 0,
    }));

    for (const j of jobs) {
      const idx = bucketIdx(j.applied_date);
      if (idx >= 0) weekly[idx].applications++;
    }
    for (const i of interviews) {
      const idx = bucketIdx(i.date);
      if (idx >= 0) weekly[idx].interviews++;
    }
    for (const a of activities) {
      const idx = bucketIdx(a.activity_date);
      if (idx >= 0) weekly[idx].outreach++;
    }

    const current = weekly[weekly.length - 1];
    const previous = weekly[weekly.length - 2] ?? { applications: 0, interviews: 0, outreach: 0 };

    const scoreboard: Scoreboard = {
      applications: { current: current.applications, previous: previous.applications, delta: current.applications - previous.applications },
      outreach: { current: current.outreach, previous: previous.outreach, delta: current.outreach - previous.outreach },
      interviews: { current: current.interviews, previous: previous.interviews, delta: current.interviews - previous.interviews },
      weekStart: thisWeekStr,
      weeklyHistory: weekly,
    };

    // 4. Call AI for 3 freeform plan actions
    const aiConfig = getAIConfig("google/gemini-2.5-flash");
    let plan: PlanAction[] = [];

    if (aiConfig) {
      // Slim the data for the AI
      const slimContacts = contacts.slice(0, 40).map((c) => ({
        id: c.id, name: c.name, company: c.company, role: c.role,
        warmth: c.relationship_warmth, networkRole: c.network_role,
        lastContacted: c.last_contacted_at,
      }));
      const slimJobs = jobs
        .filter((j) => !["rejected", "withdrawn", "closed"].includes(j.status))
        .slice(0, 30)
        .map((j) => ({ id: j.id, title: j.title, company: j.company, status: j.status, applied: j.applied_date }));

      const systemPrompt = `You are a job-search coach giving a weekly action plan.

Given a user's last 4 weeks of activity (scoreboard + entities), recommend exactly 3 SPECIFIC, freeform actions for the coming week. Each action should reference real entities (jobs, contacts, companies) by name when applicable. Examples of GOOD actions:
- "Follow up with Maria at Stripe — warm, no contact in 12 days"
- "Apply to the 4 saved Senior PM roles before they get stale"
- "Re-engage 3 cold contacts at Linear, your strongest target"
- "Update your resume — outreach is up but applications stalled"

BAD actions (too generic, never use):
- "Network more"
- "Apply to more jobs"
- "Stay positive"

Return ONLY valid JSON in this shape:
{
  "actions": [
    {
      "id": "stable-short-id",
      "title": "<=100 chars, specific and concrete",
      "rationale": "<=140 chars, why this matters this week",
      "category": "outreach" | "applications" | "follow-up" | "preparation" | "strategy"
    }
  ]
}

Rules:
- Exactly 3 actions.
- Be specific. Reference real names/companies from the data when possible.
- Read the scoreboard trends — if applications dropped, address it. If outreach spiked but no interviews, suggest follow-up.
- Avoid generic motivational fluff.`;

      const userPrompt = JSON.stringify({
        scoreboard: {
          thisWeek: { apps: current.applications, outreach: current.outreach, interviews: current.interviews },
          lastWeek: { apps: previous.applications, outreach: previous.outreach, interviews: previous.interviews },
          last4Weeks: weekly.slice(-4),
        },
        jobs: slimJobs,
        contacts: slimContacts,
      });

      try {
        const aiResp = await fetch(`${aiConfig.baseUrl}/v1/chat/completions`, {
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

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const content: string = aiData?.choices?.[0]?.message?.content || "{}";
          try {
            const parsed = JSON.parse(content);
            const raw = Array.isArray(parsed.actions) ? parsed.actions : [];
            plan = raw.slice(0, 3).map((a: any, idx: number) => ({
              id: typeof a.id === "string" ? a.id : `action-${idx}`,
              title: String(a.title || "").slice(0, 140),
              rationale: typeof a.rationale === "string" ? a.rationale.slice(0, 200) : undefined,
              category: ["outreach", "applications", "follow-up", "preparation", "strategy"].includes(a.category) ? a.category : "strategy",
            })).filter((a: PlanAction) => a.title.length > 0);
          } catch (parseErr) {
            console.error("Plan JSON parse error:", parseErr);
          }
        } else {
          const errText = await aiResp.text();
          console.error("AI gateway error:", aiResp.status, errText);
          if (aiResp.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (aiResp.status === 402) {
            return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds to continue." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (aiErr) {
        console.error("AI call failed:", aiErr);
      }
    }

    // 5. Fallback if AI failed
    if (plan.length === 0) {
      plan = [
        { id: "fallback-1", title: "Log this week's outreach so the plan can sharpen.", category: "strategy" },
      ];
    }

    // 6. Cache the result
    const generatedAt = new Date().toISOString();
    await admin.from("weekly_plans").upsert(
      {
        user_id: user.id,
        week_start: thisWeekStr,
        generated_at: generatedAt,
        scoreboard: scoreboard as unknown as Record<string, unknown>,
        plan: plan as unknown as Record<string, unknown>[],
      },
      { onConflict: "user_id,week_start" },
    );

    return new Response(
      JSON.stringify({ scoreboard, plan, generatedAt, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-weekly-plan error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

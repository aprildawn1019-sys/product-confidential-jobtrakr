import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { headers, sampleRows } = await req.json();

    if (!headers || !Array.isArray(headers)) {
      return new Response(JSON.stringify({ error: "headers array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const targetFields = [
      { name: "company", description: "Company or employer name", required: true },
      { name: "title", description: "Job title, position, or role name", required: true },
      { name: "location", description: "City, state, country, or 'Remote'" },
      { name: "type", description: "Work arrangement: remote, hybrid, or onsite" },
      { name: "salary", description: "Salary, pay, or compensation" },
      { name: "url", description: "Job posting URL or link" },
      { name: "status", description: "Application status: saved, applied, screening, interviewing, offer, rejected, withdrawn" },
      { name: "notes", description: "Any notes or comments" },
      { name: "description", description: "Job description text" },
    ];

    const prompt = `You are a data mapping assistant. Given CSV/spreadsheet column headers and sample data rows, map each header to the most appropriate job tracking field.

Target fields:
${targetFields.map(f => `- "${f.name}": ${f.description}${f.required ? " (REQUIRED)" : ""}`).join("\n")}

Input headers (by index): ${JSON.stringify(headers)}

Sample data rows: ${JSON.stringify((sampleRows || []).slice(0, 3))}

Return a mapping object where keys are target field names and values are the column index (0-based) that best matches. Only include fields that have a reasonable match. If no column matches a field, omit it.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You map spreadsheet columns to database fields. Return only the tool call." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "column_mapping",
            description: "Return the mapping from target field names to column indices",
            parameters: {
              type: "object",
              properties: {
                mapping: {
                  type: "object",
                  description: "Keys are field names (company, title, location, type, salary, url, status, notes, description). Values are 0-based column indices.",
                  additionalProperties: { type: "number" },
                },
              },
              required: ["mapping"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "column_mapping" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed.mapping), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("map-bulk-columns error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

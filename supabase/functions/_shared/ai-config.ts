/**
 * Shared AI configuration helper for all edge functions.
 *
 * Priority:
 *   1. OPENAI_API_KEY  — self-hosted (any OpenAI-compatible provider)
 *   2. LOVABLE_API_KEY — Lovable Cloud (default when hosted on Lovable)
 *
 * When using OPENAI_API_KEY you can also set:
 *   AI_BASE_URL  — defaults to https://api.openai.com
 *   AI_MODEL     — defaults to gpt-4o-mini
 */
export function getAIConfig(defaultModel: string): {
  apiKey: string;
  baseUrl: string;
  model: string;
} | null {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    return {
      apiKey: openaiKey,
      baseUrl: Deno.env.get("AI_BASE_URL") || "https://api.openai.com",
      model: Deno.env.get("AI_MODEL") || "gpt-4o-mini",
    };
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      apiKey: lovableKey,
      baseUrl: "https://ai.gateway.lovable.dev",
      model: defaultModel,
    };
  }

  return null;
}

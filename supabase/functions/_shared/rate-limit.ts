import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

/**
 * Per-user rate limiting backed by the `api_rate_limits` table.
 *
 * Counts how many times `userId` has called `functionName` within the last
 * `windowMinutes` and rejects if the count is at or above `maxCalls`. On
 * success, records the call so the next check sees it.
 *
 * Returns `{ errorResponse }` non-null when the user should be blocked —
 * the handler must return that response immediately.
 */
export async function checkRateLimit(opts: {
  userId: string;
  functionName: string;
  maxCalls: number;
  windowMinutes: number;
  corsHeaders: Record<string, string>;
}): Promise<{ errorResponse: Response | null }> {
  const { userId, functionName, maxCalls, windowMinutes, corsHeaders } = opts;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count, error: countError } = await admin
    .from("api_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("function_name", functionName)
    .gte("called_at", windowStart);

  if (countError) {
    // Fail open on infrastructure errors so a transient DB issue doesn't lock users out,
    // but log it so we can detect abuse of the failure mode.
    console.error(`[rate-limit] count failed for ${functionName}:`, countError);
    return { errorResponse: null };
  }

  if ((count ?? 0) >= maxCalls) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          error: `Rate limit exceeded. You can call this up to ${maxCalls} times per ${
            windowMinutes === 60 ? "hour" : `${windowMinutes} minutes`
          }. Please try again later.`,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      ),
    };
  }

  // Record the call. Don't block the request if the insert fails — just log it.
  const { error: insertError } = await admin
    .from("api_rate_limits")
    .insert({ user_id: userId, function_name: functionName });
  if (insertError) {
    console.error(`[rate-limit] insert failed for ${functionName}:`, insertError);
  }

  return { errorResponse: null };
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

/**
 * Verifies the JWT in the Authorization header and returns the authenticated user.
 * Returns { user, errorResponse } — if errorResponse is non-null, return it directly from the handler.
 *
 * Always uses `getUser(token)` so the signature is cryptographically validated by Supabase
 * (never trust a manually-decoded JWT payload).
 */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<
  | { user: { id: string; email?: string }; errorResponse: null }
  | { user: null; errorResponse: Response }
> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      user: null,
      errorResponse: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const token = authHeader.replace(/^[Bb]earer\s+/, "");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) {
      return {
        user: null,
        errorResponse: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      };
    }
    return {
      user: { id: data.user.id, email: data.user.email ?? undefined },
      errorResponse: null,
    };
  } catch (_e) {
    return {
      user: null,
      errorResponse: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
}

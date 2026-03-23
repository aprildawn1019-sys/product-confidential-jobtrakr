import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function getValidToken(userId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("google_tokens").select("*").eq("user_id", userId).single();
  if (!data) return null;

  // Check if token is expired (with 5 min buffer)
  if (new Date(data.expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return data.access_token;
  }

  // Refresh the token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("Token refresh failed:", await res.text());
    // Delete stale tokens
    await admin.from("google_tokens").delete().eq("user_id", userId);
    return null;
  }

  const tokens = await res.json();
  await admin.from("google_tokens").update({
    access_token: tokens.access_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return tokens.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: "Google Calendar credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = await getUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (action === "status") {
      const admin = getSupabaseAdmin();
      const { data } = await admin.from("google_tokens").select("id, expires_at").eq("user_id", userId).single();
      return new Response(JSON.stringify({ connected: !!data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange") {
      const { code, redirect_uri } = await req.json();
      if (!code || !redirect_uri) {
        return new Response(JSON.stringify({ error: "Missing code or redirect_uri" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri,
          grant_type: "authorization_code",
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Token exchange failed:", err);
        return new Response(JSON.stringify({ error: "Token exchange failed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokens = await res.json();
      if (!tokens.refresh_token) {
        return new Response(JSON.stringify({ error: "No refresh token received. Please revoke app access in Google Account settings and try again." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const admin = getSupabaseAdmin();
      await admin.from("google_tokens").upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      const admin = getSupabaseAdmin();
      await admin.from("google_tokens").delete().eq("user_id", userId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calendar event operations require a valid token
    const accessToken = await getValidToken(userId);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Google Calendar not connected", needsAuth: true }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

    if (action === "create-event") {
      const { summary, description, date, time, duration_minutes = 60 } = await req.json();
      const startDateTime = time
        ? `${date}T${time}:00`
        : `${date}T09:00:00`;
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + duration_minutes * 60 * 1000);

      const event = {
        summary,
        description: description || "",
        start: { dateTime: startDate.toISOString(), timeZone: "UTC" },
        end: { dateTime: endDate.toISOString(), timeZone: "UTC" },
      };

      const res = await fetch(CALENDAR_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Create event failed:", err);
        return new Response(JSON.stringify({ error: "Failed to create calendar event" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const created = await res.json();
      return new Response(JSON.stringify({ success: true, eventId: created.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-event") {
      const { eventId, summary, description, date, time, duration_minutes = 60 } = await req.json();
      if (!eventId) {
        return new Response(JSON.stringify({ error: "Missing eventId" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const startDateTime = time ? `${date}T${time}:00` : `${date}T09:00:00`;
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + duration_minutes * 60 * 1000);

      const event = {
        summary,
        description: description || "",
        start: { dateTime: startDate.toISOString(), timeZone: "UTC" },
        end: { dateTime: endDate.toISOString(), timeZone: "UTC" },
      };

      const res = await fetch(`${CALENDAR_API}/${eventId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Update event failed:", err);
        return new Response(JSON.stringify({ error: "Failed to update calendar event" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await res.json();
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-event") {
      const { eventId } = await req.json();
      if (!eventId) {
        return new Response(JSON.stringify({ error: "Missing eventId" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${CALENDAR_API}/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok && res.status !== 404) {
        const err = await res.text();
        console.error("Delete event failed:", err);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-events") {
      const now = new Date().toISOString();
      const res = await fetch(
        `${CALENDAR_API}?timeMin=${now}&maxResults=50&singleEvents=true&orderBy=startTime&q=Interview`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("List events failed:", err);
        return new Response(JSON.stringify({ error: "Failed to list calendar events" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      return new Response(JSON.stringify({ events: data.items || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("google-calendar error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

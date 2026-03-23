import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const GOOGLE_CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

// Client ID is public (publishable) - stored in code
// The Client Secret is stored as a backend secret and used only in the edge function
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID || "";

export function useGoogleCalendar() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar/status");
      if (!error && data) {
        setConnected(data.connected);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Handle OAuth callback from Google (redirects with ?code=...&state=gcal)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state === "gcal") {
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      url.searchParams.delete("scope");
      url.searchParams.delete("authuser");
      url.searchParams.delete("prompt");
      window.history.replaceState({}, "", url.pathname);

      // Exchange code for tokens
      (async () => {
        try {
          const redirectUri = `${window.location.origin}/interviews`;
          const { data, error } = await supabase.functions.invoke("google-calendar/exchange", {
            body: { code, redirect_uri: redirectUri },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          setConnected(true);
          toast({ title: "Google Calendar connected!", description: "Your interviews will now sync to Google Calendar." });
        } catch (e: any) {
          toast({ title: "Calendar connection failed", description: e.message, variant: "destructive" });
        }
      })();
    }
  }, []);

  const connect = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      toast({
        title: "Configuration needed",
        description: "Google Calendar Client ID is not configured. Please add VITE_GOOGLE_CALENDAR_CLIENT_ID.",
        variant: "destructive",
      });
      return;
    }

    const redirectUri = `${window.location.origin}/interviews`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_CALENDAR_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state: "gcal",
    });

    window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await supabase.functions.invoke("google-calendar/disconnect");
      setConnected(false);
      toast({ title: "Google Calendar disconnected" });
    } catch {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    }
  }, []);

  const createEvent = useCallback(async (params: {
    summary: string;
    description?: string;
    date: string;
    time?: string;
  }) => {
    if (!connected) return null;
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar/create-event", {
        body: params,
      });
      if (error) throw error;
      if (data?.error) {
        if (data.needsAuth) {
          setConnected(false);
          return null;
        }
        throw new Error(data.error);
      }
      return data?.eventId || null;
    } catch (e: any) {
      console.error("Create calendar event failed:", e);
      return null;
    }
  }, [connected]);

  const updateEvent = useCallback(async (eventId: string, params: {
    summary: string;
    description?: string;
    date: string;
    time?: string;
  }) => {
    if (!connected || !eventId) return;
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar/update-event", {
        body: { eventId, ...params },
      });
      if (error) throw error;
    } catch (e: any) {
      console.error("Update calendar event failed:", e);
    }
  }, [connected]);

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!connected || !eventId) return;
    try {
      await supabase.functions.invoke("google-calendar/delete-event", {
        body: { eventId },
      });
    } catch (e: any) {
      console.error("Delete calendar event failed:", e);
    }
  }, [connected]);

  return {
    connected,
    loading,
    connect,
    disconnect,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}

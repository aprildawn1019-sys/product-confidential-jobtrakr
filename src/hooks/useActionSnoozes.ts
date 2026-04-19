import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addDays } from "date-fns";

export type SnoozeDuration = "1d" | "3d" | "1w";

const DURATION_DAYS: Record<SnoozeDuration, number> = {
  "1d": 1,
  "3d": 3,
  "1w": 7,
};

/**
 * Manages per-user snoozes for command-center actions.
 * Snoozes are keyed by `action_signature` and persist across sessions.
 */
export function useActionSnoozes() {
  const [snoozes, setSnoozes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("action_snoozes")
      .select("action_signature, snoozed_until")
      .gte("snoozed_until", new Date().toISOString());
    if (!error && data) {
      const map: Record<string, string> = {};
      for (const row of data) {
        map[row.action_signature] = row.snoozed_until;
      }
      setSnoozes(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const snooze = useCallback(async (signature: string, duration: SnoozeDuration) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;
    const until = addDays(new Date(), DURATION_DAYS[duration]).toISOString();
    setSnoozes((prev) => ({ ...prev, [signature]: until }));
    await supabase
      .from("action_snoozes")
      .upsert(
        { user_id: userId, action_signature: signature, snoozed_until: until },
        { onConflict: "user_id,action_signature" },
      );
  }, []);

  const unsnooze = useCallback(async (signature: string) => {
    setSnoozes((prev) => {
      const next = { ...prev };
      delete next[signature];
      return next;
    });
    await supabase.from("action_snoozes").delete().eq("action_signature", signature);
  }, []);

  return { snoozes, loading, snooze, unsnooze, refresh };
}

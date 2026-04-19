import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { DerivedAction } from "@/lib/actionEngine";
import type {
  Job,
  Contact,
  TargetCompany,
  RecommendationRequest,
} from "@/types/jobTracker";

interface FetchAiSuggestionsArgs {
  jobs: Job[];
  contacts: Contact[];
  targetCompanies: TargetCompany[];
  recommendationRequests: RecommendationRequest[];
}

/**
 * On-demand AI suggestions for the Command Center.
 * Not auto-fetched — user clicks "Suggest next steps" to spend tokens.
 */
export function useAiSuggestedActions() {
  const [suggestions, setSuggestions] = useState<DerivedAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const fetchSuggestions = useCallback(async (args: FetchAiSuggestionsArgs) => {
    setLoading(true);
    try {
      // Slim payload — names + key signals only, never full notes
      const payload = {
        jobs: args.jobs
          .filter((j) => !["rejected", "withdrawn", "closed"].includes(j.status))
          .slice(0, 40)
          .map((j) => ({ id: j.id, title: j.title, company: j.company, status: j.status, fitScore: j.fitScore })),
        contacts: args.contacts
          .slice(0, 80)
          .map((c) => ({ id: c.id, name: c.name, company: c.company, role: c.role, networkRole: c.networkRole, warmth: c.relationshipWarmth })),
        targetCompanies: args.targetCompanies
          .filter((tc) => tc.status !== "archived")
          .slice(0, 30)
          .map((tc) => ({ id: tc.id, name: tc.name, priority: tc.priority, status: tc.status })),
        recommendationRequests: args.recommendationRequests
          .slice(0, 30)
          .map((r) => ({ id: r.id, contactId: r.contactId, status: r.status, requestedAt: r.requestedAt })),
      };
      const { data, error } = await supabase.functions.invoke("suggest-next-actions", { body: payload });
      if (error) throw error;
      const items: DerivedAction[] = (data?.suggestions || []).map((s: any, idx: number) => ({
        signature: `ai:${s.id || idx}:${s.contactId || s.jobId || s.targetCompanyId || "global"}`,
        lane: s.lane || "networking",
        urgency: s.urgency || "soon",
        source: "ai" as const,
        priorityScore: 250 + idx, // ranked below signals/nudges by default
        title: s.title,
        subtitle: s.rationale,
        actionLabel: s.actionLabel || "Take action",
        href: s.href,
        contactId: s.contactId,
        jobId: s.jobId,
        targetCompanyId: s.targetCompanyId,
      }));
      setSuggestions(items);
      setLastFetchedAt(new Date());
      toast({ title: "Suggestions ready", description: `${items.length} AI suggestion${items.length === 1 ? "" : "s"} added.` });
    } catch (e: any) {
      const msg = e?.message || "Could not fetch AI suggestions";
      toast({ title: "AI suggestions failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setSuggestions([]), []);

  return { suggestions, loading, lastFetchedAt, fetchSuggestions, clear };
}

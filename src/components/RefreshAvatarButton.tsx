import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Per-contact "Refresh avatar" action.
 *
 * Flow:
 *   1. Re-invokes `scrape-linkedin` with `forceAvatarRefresh: true`.
 *   2. The edge function evicts the cached image, fetches the current
 *      og:image, and uploads a new copy with a cache-busted URL.
 *   3. We persist the new URL on the contact via `onRefreshed`.
 *
 * The button is disabled when the contact has no LinkedIn URL — there's
 * no stable input to re-scrape from in that case.
 */
interface RefreshAvatarButtonProps {
  contactId: string;
  linkedinUrl?: string | null;
  /** Persist the new avatar URL on the contact (or clear it if `null`). */
  onRefreshed: (avatarUrl: string | null) => void;
  /** Compact icon-only mode for dense contact cards. */
  compact?: boolean;
}

export default function RefreshAvatarButton({
  contactId,
  linkedinUrl,
  onRefreshed,
  compact = false,
}: RefreshAvatarButtonProps) {
  const [refreshing, setRefreshing] = useState(false);
  const disabled = !linkedinUrl?.trim() || refreshing;

  const handleRefresh = async () => {
    if (disabled || !linkedinUrl) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-linkedin", {
        body: { url: linkedinUrl, forceAvatarRefresh: true },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Refresh failed");

      const newUrl: string | null = data.data?.avatar_url ?? null;
      onRefreshed(newUrl);

      toast({
        title: newUrl ? "Avatar refreshed" : "No new photo found",
        description: newUrl
          ? "Latest LinkedIn photo cached."
          : "We couldn't find a profile photo on the LinkedIn page.",
      });
    } catch (e) {
      toast({
        title: "Couldn't refresh avatar",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Tooltip text adapts to disabled reason so users understand *why* they
  // can't click — most often: no LinkedIn URL on the contact.
  const tooltip = !linkedinUrl?.trim()
    ? "Add a LinkedIn URL to refresh the avatar"
    : refreshing
    ? "Refreshing…"
    : "Refresh avatar from LinkedIn";

  const button = compact ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleRefresh}
      disabled={disabled}
      aria-label={tooltip}
      data-testid={`refresh-avatar-${contactId}`}
    >
      <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
    </Button>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={disabled}
      aria-label={tooltip}
      data-testid={`refresh-avatar-${contactId}`}
    >
      <RefreshCw className={refreshing ? "h-3.5 w-3.5 mr-1 animate-spin" : "h-3.5 w-3.5 mr-1"} />
      {refreshing ? "Refreshing" : "Refresh avatar"}
    </Button>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* span wrapper lets the tooltip work even when the button is disabled */}
          <span className="inline-flex">{button}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

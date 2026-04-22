import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, CheckCircle2, UserCircle2, AlertCircle, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ContactAvatar from "@/components/ContactAvatar";
import type { Contact, NetworkRole } from "@/types/jobTracker";
import { NETWORK_ROLES } from "@/types/jobTracker";
import { getUseAvatarProxy } from "@/lib/privacyPrefs";

interface AddContactDialogProps {
  onAdd: (contact: Omit<Contact, "id" | "createdAt">) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultCompany?: string;
  defaultNetworkRole?: NetworkRole;
  hideTrigger?: boolean;
}

// Tracks what we were able to pull from a LinkedIn fetch so the UI can
// surface a clear, honest status badge to the user.
//   - idle:      no fetch attempted yet (or form was reset)
//   - extracted: fetch succeeded and at least one field was populated
//   - partial:   fetch succeeded but returned no usable fields
//   - failed:    fetch threw / returned an error
// Avatars are intentionally NOT part of this status — LinkedIn blocks
// hotlinking, so contacts always render with initials regardless.
type ImportStatus = "idle" | "extracted" | "partial" | "failed";

export default function AddContactDialog({
  onAdd,
  open: controlledOpen,
  onOpenChange,
  defaultCompany,
  defaultNetworkRole,
  hideTrigger,
}: AddContactDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [fetchingLinkedin, setFetchingLinkedin] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [extractedFields, setExtractedFields] = useState<string[]>([]);
  // Captures the most recent fetch failure so we can render an inline
  // error block (instead of relying solely on the toast, which disappears
  // before the user can act on it). `attemptedUrl` is preserved so the
  // retry button always hits the exact URL that originally failed, even
  // if the user has since edited the LinkedIn input.
  const [importError, setImportError] = useState<{
    message: string;
    attemptedUrl: string;
  } | null>(null);
  const [form, setForm] = useState({
    name: "", company: defaultCompany || "", role: "", email: "", phone: "", linkedin: "", notes: "",
    relationshipWarmth: "", conversationLog: "", networkRole: defaultNetworkRole || "",
  });

  // Sync prefill when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      setForm(f => ({
        ...f,
        company: defaultCompany ?? f.company,
        networkRole: defaultNetworkRole ?? f.networkRole,
      }));
    }
  }, [open, defaultCompany, defaultNetworkRole]);

  // The `overrideUrl` parameter lets the inline retry button replay the
  // exact URL that originally failed, even if the input has changed since.
  const handleLinkedinFetch = async (overrideUrl?: string) => {
    const url = (overrideUrl ?? form.linkedin).trim();
    if (!url || fetchingLinkedin) return;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    setFetchingLinkedin(true);
    // Clear any prior error so the inline block disappears while retrying.
    setImportError(null);
    try {
      // Honor the user's privacy pref: when avatar proxying is disabled,
      // tell the edge function to skip the cache step and return the raw
      // LinkedIn URL (or no avatar at all) instead of writing to storage.
      const useAvatarProxy = getUseAvatarProxy();
      const { data, error } = await supabase.functions.invoke("scrape-linkedin", {
        body: { url: fullUrl, useAvatarProxy },
      });
      if (error || !data?.success) {
        // Surface the richest error info available: explicit data.error,
        // then the FunctionsError message, falling back to a generic note.
        throw new Error(data?.error || error?.message || "Unknown error from scrape-linkedin");
      }
      const d = data.data;
      // Track which specific fields the scraper actually returned so the
      // status badge can list them (e.g. "Extracted: name, role").
      const got: string[] = [];
      if (d.name) got.push("name");
      if (d.role) got.push("role");
      if (d.company) got.push("company");
      setForm(f => ({
        ...f,
        name: d.name || f.name,
        role: d.role || f.role,
        company: d.company || f.company,
        linkedin: d.linkedin || f.linkedin,
      }));
      setExtractedFields(got);
      setImportStatus(got.length > 0 ? "extracted" : "partial");
      toast({
        title: got.length > 0 ? "Contact info extracted!" : "No info extracted",
        description: got.length > 0
          ? `Found: ${d.name || "Unknown"}`
          : "LinkedIn returned no usable fields — fill in manually.",
      });
    } catch (e: any) {
      const message = e?.message || "Failed to reach the LinkedIn scraper.";
      setImportStatus("failed");
      setExtractedFields([]);
      setImportError({ message, attemptedUrl: fullUrl });
      // Toast is kept for users who already moved focus away, but the
      // inline error block is now the source of truth for actionability.
      toast({ title: "LinkedIn fetch failed", description: message, variant: "destructive" });
    } finally {
      setFetchingLinkedin(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.company) return;
    onAdd({
      ...form,
      relationshipWarmth: form.relationshipWarmth || undefined,
      conversationLog: form.conversationLog || undefined,
      networkRole: (form.networkRole || undefined) as any,
    });
    setForm({
      name: "", company: "", role: "", email: "", phone: "", linkedin: "", notes: "",
      relationshipWarmth: "", conversationLog: "", networkRole: "",
    });
    setImportStatus("idle");
    setExtractedFields([]);
    setImportError(null);
    setOpen(false);
  };

  // Renders the import status badge shown next to the avatar. Always shows
  // *something* so users immediately understand: (a) avatars are initials-
  // only by design, and (b) whether their LinkedIn fetch succeeded.
  const renderStatusBadge = () => {
    if (fetchingLinkedin) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Fetching from LinkedIn…
        </Badge>
      );
    }
    if (importStatus === "extracted") {
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Extracted: {extractedFields.join(", ")}
        </Badge>
      );
    }
    if (importStatus === "partial") {
      return (
        <Badge variant="warning" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          No fields extracted
        </Badge>
      );
    }
    if (importStatus === "failed") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          LinkedIn fetch failed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <UserCircle2 className="h-3 w-3" />
        Using initials only
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button><Plus className="h-4 w-4" /> Add Contact</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Add Connection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar + import status. Avatar is always initials (LinkedIn
              blocks hotlinking profile photos). The badge tells the user
              exactly what state the LinkedIn import is in so they're never
              guessing whether the Fetch button worked. */}
          <div className="flex items-center gap-3">
            <ContactAvatar name={form.name || "?"} size="lg" />
            <div className="flex-1 space-y-1.5">
              {renderStatusBadge()}
              <p className="text-[11px] text-muted-foreground leading-tight">
                Contacts use initials — LinkedIn blocks third-party apps from showing profile photos.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Company *</Label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Job title" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@company.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <div className="flex gap-2">
                <Input value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} placeholder="linkedin.com/in/..." className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={() => handleLinkedinFetch()} disabled={!form.linkedin.trim() || fetchingLinkedin} className="shrink-0">
                  {fetchingLinkedin ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Warmth</Label>
              <Select value={form.relationshipWarmth} onValueChange={v => setForm(f => ({ ...f, relationshipWarmth: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">❄️ Cold</SelectItem>
                  <SelectItem value="warm">🌤️ Warm</SelectItem>
                  <SelectItem value="hot">🔥 Hot</SelectItem>
                  <SelectItem value="champion">🏆 Champion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Inline error block — appears only when the most recent
              LinkedIn fetch failed. Stays visible until the user retries,
              dismisses, or successfully fetches, so they can read the
              underlying error and act on it (vs. a toast that auto-hides).
              Retry replays the *exact* URL that originally failed via the
              `attemptedUrl` we captured at fetch time. */}
          {importError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <p className="font-medium text-destructive">LinkedIn import failed</p>
                  <p className="text-muted-foreground break-words">{importError.message}</p>
                  <p className="text-[11px] text-muted-foreground break-all font-mono">
                    {importError.attemptedUrl}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleLinkedinFetch(importError.attemptedUrl)}
                      disabled={fetchingLinkedin}
                      className="h-7 gap-1.5"
                    >
                      {fetchingLinkedin ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Retry
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setImportError(null)}
                      className="h-7 gap-1.5 text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Network Role</Label>
              <Select value={form.networkRole} onValueChange={v => setForm(f => ({ ...f, networkRole: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent>
                  {NETWORK_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex flex-col">
                        <span>{r.emoji} {r.label}</span>
                        <span className="text-[10px] text-muted-foreground">{r.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Conversation Notes</Label>
            <Textarea value={form.conversationLog} onChange={e => setForm(f => ({ ...f, conversationLog: e.target.value }))} placeholder="Initial notes about this contact..." rows={3} />
          </div>
          <Button type="submit" className="w-full">Add Contact</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

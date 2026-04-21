import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { FileStack, Plus, Trash2, Pencil, Save, X, Loader2, Star, Copy, Check, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import RichTextEditor from "@/components/RichTextEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  extractTextFromResumeFile,
  plainTextToResumeHtml,
  ResumeFileError,
} from "@/lib/resumeFileParser";

interface ResumeVersion {
  id: string;
  name: string;
  content: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

const textToHtml = (text: string) => {
  const raw = text.startsWith("<")
    ? text
    : text.split("\n\n").map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
};

const htmlToPlainText = (html: string) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};

export default function Resumes() {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("resume_versions")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load resumes", description: error.message, variant: "destructive" });
    } else if (data) {
      setVersions(data as ResumeVersion[]);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const isFirst = versions.length === 0;
      const { data, error } = await supabase
        .from("resume_versions")
        .insert({
          user_id: user.id,
          name: newName.trim(),
          content: "",
          is_primary: isFirst,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setVersions((prev) => [data as ResumeVersion, ...prev]);
        setExpandedId(data.id);
        setEditingId(data.id);
        setEditName(data.name);
        setEditContent("");
      }
      setNewName("");
      setCreateOpen(false);
      toast({ title: "Resume created", description: isFirst ? "Marked as primary." : undefined });
    } catch (e: any) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (v: ResumeVersion) => {
    setEditingId(v.id);
    setEditName(v.name);
    setEditContent(textToHtml(v.content));
    setExpandedId(v.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditContent("");
  };

  const handleSave = async (id: string) => {
    if (!editName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("resume_versions")
        .update({ name: editName.trim(), content: editContent })
        .eq("id", id);
      if (error) throw error;
      setVersions((prev) =>
        prev.map((v) => (v.id === id ? { ...v, name: editName.trim(), content: editContent } : v))
      );
      handleCancelEdit();
      toast({ title: "Saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const target = versions.find((v) => v.id === id);
    const { error } = await supabase.from("resume_versions").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setVersions((prev) => prev.filter((v) => v.id !== id));
    toast({ title: "Resume deleted" });

    // If we deleted the primary and another exists, promote the most recently updated.
    if (target?.is_primary) {
      const remaining = versions.filter((v) => v.id !== id);
      if (remaining.length > 0) {
        const next = [...remaining].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))[0];
        await handleMakePrimary(next.id, true);
      }
    }
  };

  const handleMakePrimary = async (id: string, silent = false) => {
    const { error } = await supabase
      .from("resume_versions")
      .update({ is_primary: true })
      .eq("id", id);
    if (error) {
      toast({ title: "Could not set primary", description: error.message, variant: "destructive" });
      return;
    }
    setVersions((prev) =>
      prev.map((v) => ({ ...v, is_primary: v.id === id })).sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
    );
    if (!silent) toast({ title: "Set as primary", description: "AI matching and cover letters will use this version." });
  };

  const handleDuplicate = async (v: ResumeVersion) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("resume_versions")
        .insert({
          user_id: user.id,
          name: `${v.name} (copy)`,
          content: v.content,
          is_primary: false,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) setVersions((prev) => [data as ResumeVersion, ...prev]);
      toast({ title: "Duplicated" });
    } catch (e: any) {
      toast({ title: "Duplicate failed", description: e.message, variant: "destructive" });
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(htmlToPlainText(content));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileStack className="h-7 w-7 text-primary" />
            Resumes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Store multiple resume versions. Mark one as primary — that version powers AI job matching and cover letter generation.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Resume
        </Button>
      </div>

      {versions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
              <FileStack className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No resumes yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Create your first resume version. You can keep separate variants for different role types — your primary version is what AI matching uses.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create First Resume
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {versions.map((v) => {
            const isExpanded = expandedId === v.id;
            const isEditing = editingId === v.id;
            const isCopied = copiedId === v.id;
            return (
              <Card key={v.id} className="transition-shadow hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => setExpandedId(isExpanded ? null : v.id)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{v.name}</p>
                        {v.is_primary && (
                          <Badge className="bg-accent/15 text-accent border border-accent/30 hover:bg-accent/15 gap-1 text-[10px] uppercase tracking-wide">
                            <Star className="h-3 w-3 fill-current" /> Primary
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(v.updated_at), { addSuffix: true })}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {!v.is_primary && (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleMakePrimary(v.id)}>
                          <Star className="h-3.5 w-3.5 mr-1" /> Make primary
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(v.id, v.content)} title="Copy text">
                        {isCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(v)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(v)} title="Duplicate">
                        <FileStack className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{v.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes this resume version. {v.is_primary && versions.length > 1 ? "Another version will be promoted to primary." : ""}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(v.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(isExpanded ? null : v.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      {isEditing ? (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs">Version name</Label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. FinTech tilt" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Resume content</Label>
                            <RichTextEditor
                              content={editContent}
                              onChange={setEditContent}
                              placeholder="Paste or write your resume here..."
                            />
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={saving}>
                              <X className="h-3.5 w-3.5 mr-1" /> Cancel
                            </Button>
                            <Button size="sm" onClick={() => handleSave(v.id)} disabled={saving || !editName.trim()}>
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                              Save
                            </Button>
                          </div>
                        </>
                      ) : v.content ? (
                        <div
                          className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed max-h-96 overflow-y-auto prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: textToHtml(v.content) }}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic px-1">Empty — click Edit to add content.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New resume version</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Version name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Base, FinTech tilt, Staff PM"
              onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) handleCreate(); }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              You'll add the resume content right after creating it.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

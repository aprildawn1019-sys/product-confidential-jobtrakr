import { useState, useEffect } from "react";
import { FileText, Copy, Check, Trash2, ChevronDown, ChevronUp, ExternalLink, Loader2, Plus, Globe, Sparkles, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import CompanyAvatar from "@/components/CompanyAvatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Job } from "@/types/jobTracker";

interface CoverLetter {
  id: string;
  job_id: string | null;
  job_title: string;
  company: string;
  content: string;
  created_at: string;
}

interface CoverLettersProps {
  jobs?: Job[];
}

export default function CoverLetters({ jobs = [] }: CoverLettersProps) {
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generate dialog state
  const [genOpen, setGenOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("manual");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState("");

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cover_letters")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setLetters(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("cover_letters").delete().eq("id", id);
    setLetters(prev => prev.filter(l => l.id !== id));
    if (expandedId === id) setExpandedId(null);
    toast({ title: "Cover letter deleted" });
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = letters.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.job_title.toLowerCase().includes(q) || l.company.toLowerCase().includes(q);
  });

  // --- Generate dialog helpers ---
  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const effectiveTitle = selectedJob ? selectedJob.title : manualTitle;
  const effectiveCompany = selectedJob ? selectedJob.company : manualCompany;
  const effectiveJobId = selectedJob ? selectedJob.id : null;
  const effectiveUrl = selectedJob?.url;

  const resetGenDialog = () => {
    setSelectedJobId("manual");
    setManualTitle("");
    setManualCompany("");
    setJobDescription("");
    setGeneratedLetter("");
  };

  const handleScrape = async () => {
    if (!effectiveUrl) return;
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-job", {
        body: { url: effectiveUrl, returnDescription: true },
      });
      if (error) throw error;
      if (data?.data?.description) {
        setJobDescription(data.data.description);
        toast({ title: "Job description extracted!" });
      } else {
        toast({ title: "Couldn't extract description", description: "Please paste it manually.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Scrape failed", description: "Please paste the job description manually.", variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      toast({ title: "Please provide a job description", variant: "destructive" });
      return;
    }
    if (!effectiveTitle.trim() || !effectiveCompany.trim()) {
      toast({ title: "Please provide a job title and company", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setGeneratedLetter("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: {
          jobTitle: effectiveTitle,
          company: effectiveCompany,
          jobDescription: jobDescription.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedLetter(data.coverLetter || "");

      // Save to DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: inserted } = await supabase.from("cover_letters").insert({
          user_id: user.id,
          job_id: effectiveJobId,
          job_title: effectiveTitle,
          company: effectiveCompany,
          content: data.coverLetter,
        }).select().single();
        if (inserted) setLetters(prev => [inserted, ...prev]);
      }

      toast({ title: "Cover letter generated!" });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyGenerated = () => {
    navigator.clipboard.writeText(generatedLetter);
    toast({ title: "Copied to clipboard" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Cover Letters
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate, view, and manage all your cover letters.
          </p>
        </div>
        <Button onClick={() => { resetGenDialog(); setGenOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Generate Cover Letter
        </Button>
      </div>

      {letters.length > 0 && (
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by job title or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Badge variant="secondary" className="shrink-0">{filtered.length} letter{filtered.length !== 1 ? "s" : ""}</Badge>
        </div>
      )}

      {letters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No cover letters yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Generate a tailored cover letter in seconds using AI. Pick a job from your tracker or enter details manually.
            </p>
            <Button onClick={() => { resetGenDialog(); setGenOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Generate Your First Cover Letter
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No cover letters match your search.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(letter => {
            const isExpanded = expandedId === letter.id;
            const isCopied = copiedId === letter.id;
            return (
              <Card key={letter.id} className="transition-shadow hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CompanyAvatar company={letter.company} />
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => setExpandedId(isExpanded ? null : letter.id)}
                    >
                      <p className="font-medium text-sm truncate">{letter.job_title}</p>
                      <p className="text-xs text-muted-foreground">{letter.company} · {formatDistanceToNow(new Date(letter.created_at), { addSuffix: true })}</p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(letter.id, letter.content)}>
                        {isCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      {letter.job_id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={`/jobs/${letter.job_id}`}><ExternalLink className="h-3.5 w-3.5" /></a>
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete cover letter?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the cover letter for {letter.job_title} at {letter.company}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(letter.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(isExpanded ? null : letter.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                      {letter.content}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generate Cover Letter Dialog */}
      <Dialog open={genOpen} onOpenChange={o => { setGenOpen(o); if (!o) resetGenDialog(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Cover Letter
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Job selector */}
            <div>
              <Label>Select a Job</Label>
              <Select value={selectedJobId} onValueChange={v => { setSelectedJobId(v); setJobDescription(""); setGeneratedLetter(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tracked job or enter manually" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">✍️ Enter manually</SelectItem>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title} — {j.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Manual fields when no job selected */}
            {!selectedJob && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Job Title *</Label>
                  <Input value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="e.g. Product Manager" />
                </div>
                <div>
                  <Label>Company *</Label>
                  <Input value={manualCompany} onChange={e => setManualCompany(e.target.value)} placeholder="e.g. Stripe" />
                </div>
              </div>
            )}

            {/* Job description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Job Description *</Label>
                {effectiveUrl && (
                  <Button type="button" variant="secondary" size="sm" onClick={handleScrape} disabled={scraping}>
                    {scraping ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Globe className="h-3.5 w-3.5 mr-1" />}
                    Extract from URL
                  </Button>
                )}
              </div>
              <Textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                rows={6}
                className="text-sm"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || !jobDescription.trim() || !effectiveTitle.trim() || !effectiveCompany.trim()}
              className="w-full gap-2"
              size="lg"
            >
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4" />Generate Cover Letter</>}
            </Button>

            {generatedLetter && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Generated Cover Letter</Label>
                  <Button variant="ghost" size="sm" onClick={handleCopyGenerated} className="gap-1">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                  {generatedLetter}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

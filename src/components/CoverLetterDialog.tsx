import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, Copy, Check, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Job } from "@/types/jobTracker";

interface CoverLetterDialogProps {
  job: Job;
}

export default function CoverLetterDialog({ job }: CoverLetterDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [copied, setCopied] = useState(false);

  // Try to scrape job description from URL when opened
  const handleScrapeDescription = async () => {
    if (!job.url) return;
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-job", {
        body: { url: job.url, returnDescription: true },
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
    setLoading(true);
    setCoverLetter("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: {
          jobTitle: job.title,
          company: job.company,
          jobDescription: jobDescription.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCoverLetter(data.coverLetter || "");

      // Save to DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("cover_letters").insert({
          user_id: user.id,
          job_id: job.id,
          job_title: job.title,
          company: job.company,
          content: data.coverLetter,
        });
      }
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setCoverLetter(""); setJobDescription(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FileText className="h-3.5 w-3.5" />Cover Letter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Generate Cover Letter</DialogTitle>
          <p className="text-sm text-muted-foreground">{job.title} at {job.company}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Job Description</Label>
              {job.url && (
                <Button type="button" variant="secondary" size="sm" onClick={handleScrapeDescription} disabled={scraping}>
                  {scraping ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Globe className="h-3.5 w-3.5 mr-1" />}
                  Extract from URL
                </Button>
              )}
            </div>
            <Textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the job description here, or click 'Extract from URL' above..."
              rows={6}
              className="text-sm"
            />
          </div>

          <Button onClick={handleGenerate} disabled={loading || !jobDescription.trim()} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</> : "Generate Cover Letter"}
          </Button>

          {coverLetter && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Generated Cover Letter</Label>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {coverLetter}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Globe, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Job, JobStatus } from "@/types/jobTracker";

interface AddJobDialogProps {
  onAdd: (job: Omit<Job, "id" | "createdAt">) => void;
}

export default function AddJobDialog({ onAdd }: AddJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [form, setForm] = useState({ company: "", title: "", location: "", type: "remote" as Job["type"], salary: "", url: "", status: "saved" as JobStatus });

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    try {
      let urlToScrape = scrapeUrl.trim();
      if (!urlToScrape.startsWith("http")) urlToScrape = `https://${urlToScrape}`;

      const { data, error } = await supabase.functions.invoke("scrape-job", {
        body: { url: urlToScrape },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Scrape failed");

      const d = data.data;
      setForm(f => ({
        ...f,
        company: d.company || f.company,
        title: d.title || f.title,
        location: d.location || f.location,
        type: (["remote", "hybrid", "onsite"].includes(d.type) ? d.type : f.type) as Job["type"],
        salary: d.salary || f.salary,
        url: urlToScrape,
      }));
      toast({ title: "Job details extracted!", description: "Review and edit the auto-filled fields below." });
    } catch (e: any) {
      console.error("Scrape error:", e);
      toast({ title: "Scrape failed", description: e.message || "Could not extract job details from that URL.", variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company || !form.title) return;
    onAdd({ ...form, appliedDate: form.status !== "saved" ? new Date().toISOString().split("T")[0] : undefined });
    setForm({ company: "", title: "", location: "", type: "remote", salary: "", url: "", status: "saved" });
    setScrapeUrl("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Add Job</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Add Job Posting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scrape from URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Import from URL</Label>
            <div className="flex gap-2">
              <Input
                value={scrapeUrl}
                onChange={e => setScrapeUrl(e.target.value)}
                placeholder="Paste job posting URL..."
                className="flex-1"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleScrape} disabled={scraping || !scrapeUrl.trim()}>
                {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scrape"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Auto-fill fields from a job posting page</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company *</Label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Stripe" />
            </div>
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior Engineer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Remote" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as Job["type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Salary Range</Label>
              <Input value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="e.g. $150k-$200k" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as JobStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="saved">Saved</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="screening">Screening</SelectItem>
                  <SelectItem value="interviewing">Interviewing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full">Add Job</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

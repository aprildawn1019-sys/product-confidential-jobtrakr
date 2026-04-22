import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Globe, Loader2, Linkedin, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchLinkedinDeduped } from "@/lib/linkedinFetchDedup";
import { toast } from "@/hooks/use-toast";
import type { Job, JobStatus, Contact } from "@/types/jobTracker";

interface AddJobDialogProps {
  onAdd: (job: Omit<Job, "id" | "createdAt">) => void;
  contacts: Contact[];
  onLinkContact?: (jobId: string, contactId: string) => void;
}

export default function AddJobDialog({ onAdd, contacts, onLinkContact }: AddJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [fetchingLinkedin, setFetchingLinkedin] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [form, setForm] = useState({
    company: "", title: "", location: "", type: "remote" as Job["type"],
    salary: "", url: "", status: "saved" as JobStatus, description: "",
    posterName: "", posterEmail: "", posterPhone: "", posterRole: "",
  });

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    try {
      let urlToScrape = scrapeUrl.trim();
      if (!urlToScrape.startsWith("http")) urlToScrape = `https://${urlToScrape}`;
      const { data, error } = await supabase.functions.invoke("scrape-job", { body: { url: urlToScrape } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Scrape failed");
      const d = data.data;
      setForm(f => ({
        ...f, company: d.company || f.company, title: d.title || f.title,
        location: d.location || f.location,
        type: (["remote", "hybrid", "onsite"].includes(d.type) ? d.type : f.type) as Job["type"],
        salary: d.salary || f.salary, url: urlToScrape, description: d.description || f.description,
      }));
      toast({ title: "Job details extracted!", description: "Review and edit the auto-filled fields below." });
    } catch (e: any) {
      toast({ title: "Scrape failed", description: e.message, variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  const handleFetchLinkedin = async () => {
    // Local guard prevents re-entry within this dialog while a request is
    // already in flight. The button below is also disabled on this flag,
    // but defensive code here protects against rapid synchronous calls
    // before React flushes the disabled state to the DOM.
    if (!linkedinUrl.trim() || fetchingLinkedin) return;
    setFetchingLinkedin(true);
    try {
      let url = linkedinUrl.trim();
      if (!url.startsWith("http")) url = `https://${url}`;
      // Shared dedup helper: if AddContactDialog (or another AddJobDialog)
      // is already fetching this exact URL, we await the same Promise
      // instead of firing a second upstream call.
      const { data, error } = await fetchLinkedinDeduped(url, false);
      if (error) throw error;
      if (!(data as { success?: boolean })?.success) {
        throw new Error((data as { error?: string })?.error || "Fetch failed");
      }
      const d = (data as { data: { name?: string; role?: string; company?: string } }).data;
      setForm(f => ({
        ...f,
        posterName: d.name || f.posterName,
        posterRole: d.role || f.posterRole,
        company: d.company || f.company,
      }));
      toast({ title: "Contact info extracted!", description: `Found: ${d.name || "Unknown"}` });
    } catch (e: any) {
      toast({ title: "LinkedIn fetch failed", description: e.message, variant: "destructive" });
    } finally {
      setFetchingLinkedin(false);
    }
  };

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    if (contactId) {
      const c = contacts.find(c => c.id === contactId);
      if (c) {
        setForm(f => ({
          ...f,
          posterName: c.name || f.posterName,
          posterRole: c.role || f.posterRole,
          posterEmail: c.email || f.posterEmail,
          posterPhone: c.phone || f.posterPhone,
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company || !form.title) return;
    onAdd({
      ...form,
      appliedDate: form.status !== "saved" ? new Date().toISOString().split("T")[0] : undefined,
    });
    // Note: linking contact after add requires the new job ID, handled by parent if needed
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setForm({ company: "", title: "", location: "", type: "remote", salary: "", url: "", status: "saved", description: "", posterName: "", posterEmail: "", posterPhone: "", posterRole: "" });
    setScrapeUrl("");
    setLinkedinUrl("");
    setSelectedContactId("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Add Job</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Add Job Posting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scrape from URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Import from URL</Label>
            <div className="flex gap-2">
              <Input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} placeholder="Paste job posting URL..." className="flex-1" />
              <Button type="button" variant="secondary" size="sm" onClick={handleScrape} disabled={scraping || !scrapeUrl.trim()}>
                {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scrape"}
              </Button>
            </div>
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
          <div className="space-y-2">
            <Label>Job Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Paste or type the job description..." rows={4} />
          </div>

          {/* Contact / Recruiter Section */}
          <div className="space-y-3 rounded-lg border border-border p-3">
            <Label className="flex items-center gap-1.5 text-sm font-semibold"><User className="h-3.5 w-3.5" /> Contact / Recruiter</Label>

            {contacts.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Link existing contact</Label>
                <Select value={selectedContactId} onValueChange={handleContactSelect}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select a contact..." /></SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} — {c.role} at {c.company}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Linkedin className="h-3 w-3" /> Auto-fill from LinkedIn</Label>
              <div className="flex gap-2">
                <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="linkedin.com/in/username" className="flex-1 h-8 text-sm" />
                <Button type="button" variant="secondary" size="sm" className="h-8" onClick={handleFetchLinkedin} disabled={fetchingLinkedin || !linkedinUrl.trim()}>
                  {fetchingLinkedin ? <Loader2 className="h-3 w-3 animate-spin" /> : "Fetch"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Name" value={form.posterName} onChange={e => setForm(f => ({ ...f, posterName: e.target.value }))} className="h-8 text-sm" />
              <Input placeholder="Role" value={form.posterRole} onChange={e => setForm(f => ({ ...f, posterRole: e.target.value }))} className="h-8 text-sm" />
              <Input placeholder="Email" value={form.posterEmail} onChange={e => setForm(f => ({ ...f, posterEmail: e.target.value }))} className="h-8 text-sm" />
              <Input placeholder="Phone" value={form.posterPhone} onChange={e => setForm(f => ({ ...f, posterPhone: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>

          <Button type="submit" className="w-full">Add Job</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

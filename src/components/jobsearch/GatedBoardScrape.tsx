import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Link } from "lucide-react";
import type { Job } from "@/types/jobTracker";

interface GatedBoardScrapeProps {
  onAddJob: (job: Omit<Job, "id" | "createdAt">) => void;
}

export function GatedBoardScrape({ onAddJob }: GatedBoardScrapeProps) {
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);

  const handleScrape = async () => {
    if (!url.trim()) return;
    setScraping(true);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-job", {
        body: { url: url.trim() },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Scrape failed");

      const job = data.data;
      onAddJob({
        company: job.company || "Unknown",
        title: job.title || "Unknown Role",
        location: job.location || "",
        type: job.type || "remote",
        salary: job.salary || "",
        url: url.trim(),
        status: "saved",
        description: job.description || "",
        notes: `Scraped from gated board.\n${job.notes || ""}`.trim(),
      });

      toast({ title: "Job added!", description: `${job.title} at ${job.company} added to your tracker.` });
      setUrl("");
    } catch (e: any) {
      console.error("Scrape error:", e);
      toast({ title: "Scrape failed", description: e.message || "Could not extract job details.", variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Paste a job URL from a gated board to auto-scrape…"
          className="pl-9 text-sm"
          onKeyDown={e => e.key === "Enter" && handleScrape()}
        />
      </div>
      <Button variant="outline" size="sm" onClick={handleScrape} disabled={scraping || !url.trim()}>
        {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {scraping ? "Scraping…" : "Add"}
      </Button>
    </div>
  );
}

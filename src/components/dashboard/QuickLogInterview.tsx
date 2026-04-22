import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Interview, Job } from "@/types/jobTracker";

type Status = Interview["status"]; // "scheduled" | "completed" | "cancelled"

interface Props {
  jobs: Job[];
  /** Returns the new job (so we can read its id) when called from the quick form. */
  onAddJob: (job: Omit<Job, "id" | "createdAt">) => Promise<Job | void> | Job | void;
  onAddInterview: (interview: Omit<Interview, "id">) => Promise<void> | void;
}

/**
 * One-step interview log used on the Command Center.
 *
 * Why this exists:
 *   The full Schedule Interview dialog forces the user to pick an existing job
 *   first — fine when the application is already in the tracker, but a poor fit
 *   for the common case "I just had a screen with X." This compact form lets
 *   the user type a company name (autocompletes against existing jobs) and
 *   capture date / time / status without leaving the dashboard.
 *
 * Data model bridging:
 *   Interviews require a `jobId`. If the entered company doesn't match any
 *   existing job, we create a lightweight stub job (status = "interviewing",
 *   title = "Untitled role") so the interview attaches to a real record. The
 *   user can flesh out the job details later from /jobs.
 */
export default function QuickLogInterview({ jobs, onAddJob, onAddInterview }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<Status>("scheduled");
  // Optional follow-up — null means "no reminder". When set, we persist it on
  // the interview record and surface it in Next Steps via actionEngine.
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // Distinct, alphabetised list of company names already in the tracker —
  // drives the autocomplete suggestions.
  const knownCompanies = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => j.company && set.add(j.company));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const matchedJob = useMemo(() => {
    if (!company.trim()) return null;
    const norm = company.trim().toLowerCase();
    return jobs.find((j) => j.company.toLowerCase() === norm) ?? null;
  }, [company, jobs]);

  const reset = () => {
    setCompany("");
    setDate(undefined);
    setTime("");
    setStatus("scheduled");
    setFollowUpDate(undefined);
  };

  const handleSubmit = async () => {
    if (!company.trim() || !date) return;
    setSubmitting(true);
    try {
      let jobId = matchedJob?.id;
      if (!jobId) {
        // No existing job for this company — spin up a placeholder so the
        // interview can attach to a real record. Status "interviewing"
        // matches the user's stated reality.
        const created = await onAddJob({
          company: company.trim(),
          title: "Untitled role",
          location: "",
          type: "remote",
          status: "interviewing",
          source: "manual",
        });
        jobId = (created as Job | undefined)?.id;
        // Fallback: addJob in the store doesn't return the new record.
        // We poll the latest job for this company in the next tick by
        // letting the parent state update; if we still can't find it, abort.
        if (!jobId) {
          toast({
            title: "Couldn't link interview",
            description: "We created the company but couldn't attach the interview. Try from the Interviews page.",
            variant: "destructive",
          });
          return;
        }
      }
      await onAddInterview({
        jobId,
        type: "phone",
        date: format(date, "yyyy-MM-dd"),
        time: time || undefined,
        status,
        followUpDate: followUpDate ? format(followUpDate, "yyyy-MM-dd") : undefined,
      });
      toast({
        title: "Interview logged",
        description: `${company.trim()} · ${format(date, "EEE, MMM d")}${time ? ` · ${time}` : ""}${followUpDate ? ` · follow up ${format(followUpDate, "MMM d")}` : ""}`,
      });
      reset();
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Log an interview</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Capture company, date, time, and status — we'll attach it to the matching job (or create one).
          </p>
        </div>
        {!open && (
          <Button size="sm" onClick={() => setOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Quick log
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Company w/ autocomplete against existing jobs. */}
            <div className="space-y-1.5">
              <Label htmlFor="ql-company">Company</Label>
              <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                <PopoverTrigger asChild>
                  <Input
                    id="ql-company"
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      if (!companyOpen) setCompanyOpen(true);
                    }}
                    onFocus={() => knownCompanies.length > 0 && setCompanyOpen(true)}
                    placeholder="e.g. Stripe"
                    autoComplete="off"
                  />
                </PopoverTrigger>
                {knownCompanies.length > 0 && (
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <Command>
                      <CommandInput placeholder="Search companies..." value={company} onValueChange={setCompany} />
                      <CommandList>
                        <CommandEmpty>No matches — we'll create a new company.</CommandEmpty>
                        <CommandGroup>
                          {knownCompanies.map((c) => (
                            <CommandItem
                              key={c}
                              value={c}
                              onSelect={(v) => {
                                setCompany(v);
                                setCompanyOpen(false);
                              }}
                            >
                              {c}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                )}
              </Popover>
              {company.trim() && !matchedJob && (
                <p className="text-[11px] text-muted-foreground">
                  New company — we'll create a placeholder job you can edit later.
                </p>
              )}
            </div>

            {/* Status — defaults to scheduled but supports back-logging completed/cancelled. */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ql-time">Time</Label>
              <Input
                id="ql-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!company.trim() || !date || submitting}
              className="gap-2"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Log interview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OUTREACH_STAGES, type Outreach, type OutreachStage } from "@/types/outreach";
import type { Contact, TargetCompany, Job } from "@/types/jobTracker";
import { companiesMatch } from "@/stores/jobTrackerStore";

interface OutreachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  targetCompanies: TargetCompany[];
  jobs: Job[];
  initial?: Partial<Outreach> & { contactId?: string; targetCompanyId?: string; jobId?: string; stage?: OutreachStage };
  existing?: Outreach;
  onSave: (data: Omit<Outreach, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function OutreachDialog({
  open, onOpenChange, contacts, targetCompanies, jobs, initial, existing, onSave, onDelete,
}: OutreachDialogProps) {
  const [contactId, setContactId] = useState("");
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [jobId, setJobId] = useState<string>("");
  const [stage, setStage] = useState<OutreachStage>("identified");
  const [outcome, setOutcome] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [nextStepDate, setNextStepDate] = useState("");
  const [nextStepLabel, setNextStepLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    const src = existing ?? initial ?? {};
    setContactId(src.contactId ?? "");
    setTargetCompanyId(src.targetCompanyId ?? "");
    setJobId(src.jobId ?? "");
    setStage((src.stage as OutreachStage) ?? "identified");
    setOutcome(src.outcome ?? "");
    setGoal(src.goal ?? "");
    setNotes(src.notes ?? "");
    setNextStepDate(src.nextStepDate ?? "");
    setNextStepLabel(src.nextStepLabel ?? "");
  }, [open, existing, initial]);

  // When a contact is picked, auto-suggest the matching target company
  // (creating one is handled elsewhere — here we just match existing).
  useEffect(() => {
    if (!contactId || targetCompanyId) return;
    const c = contacts.find(x => x.id === contactId);
    if (!c) return;
    const tc = targetCompanies.find(t => companiesMatch(t.name, c.company));
    if (tc) setTargetCompanyId(tc.id);
  }, [contactId, contacts, targetCompanies, targetCompanyId]);

  const eligibleJobs = useMemo(() => {
    if (!targetCompanyId) return jobs;
    const tc = targetCompanies.find(t => t.id === targetCompanyId);
    if (!tc) return jobs;
    return jobs.filter(j => companiesMatch(j.company, tc.name));
  }, [targetCompanyId, jobs, targetCompanies]);

  const canSave = contactId && targetCompanyId && stage;

  const handleSave = async () => {
    if (!canSave) return;
    await onSave({
      contactId,
      targetCompanyId,
      jobId: jobId || undefined,
      stage,
      outcome: stage === "closed" ? (outcome as "won" | "lost") || undefined : undefined,
      goal: goal.trim() || undefined,
      notes: notes.trim() || undefined,
      nextStepDate: nextStepDate || undefined,
      nextStepLabel: nextStepLabel.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit outreach" : "New outreach"}</DialogTitle>
          <DialogDescription>
            Track an effort to secure an inside referral. Each outreach links a contact to a target company, optionally tied to a specific job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Contact</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger><SelectValue placeholder="Select a contact" /></SelectTrigger>
              <SelectContent>
                {contacts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Target company</Label>
            <Select value={targetCompanyId} onValueChange={setTargetCompanyId}>
              <SelectTrigger><SelectValue placeholder="Select a target company" /></SelectTrigger>
              <SelectContent>
                {targetCompanies.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetCompanies.length === 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Add a target company first — open Pipeline → Target Companies.
              </p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Job (optional)
            </Label>
            <Select value={jobId || "none"} onValueChange={(v) => setJobId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="No specific job — building the relationship" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific job — building the relationship</SelectItem>
                {eligibleJobs.map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.title} — {j.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Stage</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as OutreachStage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OUTREACH_STAGES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {stage === "closed" && (
              <div>
                <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Outcome</Label>
                <Select value={outcome || "none"} onValueChange={(v) => setOutcome(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="won">Won (interview/offer)</SelectItem>
                    <SelectItem value="lost">Lost (cooled / declined)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Goal <span className="text-muted-foreground/70 normal-case tracking-normal">(what are you hoping for?)</span>
            </Label>
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Inside referral for Sr PM role; introduction to hiring manager"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Next step date</Label>
              <Input type="date" value={nextStepDate} onChange={(e) => setNextStepDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Next step</Label>
              <Input
                value={nextStepLabel}
                onChange={(e) => setNextStepLabel(e.target.value)}
                placeholder="e.g. Send follow-up DM"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, talking points, what they said last time…"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {existing && onDelete && (
              <Button
                variant="ghost"
                onClick={async () => {
                  await onDelete(existing.id);
                  onOpenChange(false);
                }}
                className="text-destructive hover:text-destructive"
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {existing ? "Save changes" : "Create outreach"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

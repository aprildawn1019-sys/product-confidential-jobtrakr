import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Briefcase, Users, ArrowRight } from "lucide-react";
import { companiesMatch } from "@/stores/jobTrackerStore";
import type { TargetCompany, TargetCompanyPriority, TargetCompanyStatus, Job, Contact } from "@/types/jobTracker";

interface MergePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: TargetCompany[];
  jobs: Job[];
  contacts: Contact[];
  onConfirm: (
    primaryId: string,
    duplicateIds: string[],
    mergedFields: Partial<TargetCompany>,
    duplicateNames: string[],
  ) => Promise<void>;
}

const priorityRank: Record<TargetCompanyPriority, number> = { dream: 3, strong: 2, interested: 1 };

function pickDefaultPrimary(cluster: TargetCompany[]): TargetCompany {
  // Highest priority, then oldest
  return [...cluster].sort((a, b) => {
    const p = priorityRank[b.priority] - priorityRank[a.priority];
    if (p !== 0) return p;
    return a.createdAt.localeCompare(b.createdAt);
  })[0];
}

function firstNonEmpty<T extends string | undefined>(values: T[]): T | undefined {
  return values.find(v => v && v.toString().trim().length > 0);
}

function dedupeNotes(notes: (string | undefined)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of notes) {
    if (!n) continue;
    const trimmed = n.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out.join("\n\n---\n\n");
}

export default function MergePreviewDialog({
  open, onOpenChange, cluster, jobs, contacts, onConfirm,
}: MergePreviewDialogProps) {
  const [primaryId, setPrimaryId] = useState<string>(() => pickDefaultPrimary(cluster).id);
  const [merged, setMerged] = useState<Partial<TargetCompany>>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset when cluster or open changes
  useEffect(() => {
    if (!open) return;
    const def = pickDefaultPrimary(cluster);
    setPrimaryId(def.id);
  }, [open, cluster]);

  const primary = useMemo(() => cluster.find(c => c.id === primaryId) ?? cluster[0], [cluster, primaryId]);

  // Compute merged defaults whenever primary changes
  useEffect(() => {
    if (!primary) return;
    const others = cluster.filter(c => c.id !== primary.id);
    const all = [primary, ...others];
    setMerged({
      name: primary.name,
      website: firstNonEmpty(all.map(c => c.website)),
      careersUrl: firstNonEmpty(all.map(c => c.careersUrl)),
      industry: firstNonEmpty(all.map(c => c.industry)),
      size: firstNonEmpty(all.map(c => c.size)),
      priority: all.map(c => c.priority).sort((a, b) => priorityRank[b] - priorityRank[a])[0],
      status: primary.status,
      notes: dedupeNotes(all.map(c => c.notes)),
    });
  }, [primary, cluster]);

  const allNames = cluster.map(c => c.name);
  const linkedJobs = useMemo(
    () => jobs.filter(j => allNames.some(n => companiesMatch(j.company, n))).length,
    [jobs, allNames],
  );
  const linkedContacts = useMemo(
    () => contacts.filter(c => allNames.some(n => companiesMatch(c.company, n))).length,
    [contacts, allNames],
  );

  const handleConfirm = async () => {
    if (!primary) return;
    setSubmitting(true);
    try {
      const duplicateIds = cluster.filter(c => c.id !== primary.id).map(c => c.id);
      const duplicateNames = cluster.filter(c => c.id !== primary.id).map(c => c.name);
      await onConfirm(primary.id, duplicateIds, merged, duplicateNames);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview merged company</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Primary picker */}
          <div>
            <Label className="text-xs text-muted-foreground">Keep as primary record</Label>
            <Select value={primaryId} onValueChange={setPrimaryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {cluster.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.priority} · {c.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              The {cluster.length - 1} other record{cluster.length - 1 === 1 ? "" : "s"} will be deleted after merging.
            </p>
          </div>

          {/* Re-link summary */}
          <Card className="p-3 bg-muted/40">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{linkedJobs}</span>
                <span className="text-muted-foreground">jobs</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">renamed to "{merged.name}"</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{linkedContacts}</span>
                <span className="text-muted-foreground">contacts</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">renamed</span>
              </div>
            </div>
          </Card>

          {/* Editable merged fields */}
          <div className="space-y-3">
            <div>
              <Label>Company Name</Label>
              <Input value={merged.name ?? ""} onChange={e => setMerged(m => ({ ...m, name: e.target.value }))} />
              <SourceChips values={cluster.map(c => ({ id: c.id, value: c.name }))} current={merged.name} onPick={v => setMerged(m => ({ ...m, name: v }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={merged.priority} onValueChange={v => setMerged(m => ({ ...m, priority: v as TargetCompanyPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dream">🌟 Dream</SelectItem>
                    <SelectItem value="strong">💪 Strong</SelectItem>
                    <SelectItem value="interested">👀 Interested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={merged.status} onValueChange={v => setMerged(m => ({ ...m, status: v as TargetCompanyStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="researching">Researching</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Website</Label>
                <Input value={merged.website ?? ""} onChange={e => setMerged(m => ({ ...m, website: e.target.value }))} />
                <SourceChips values={cluster.map(c => ({ id: c.id, value: c.website }))} current={merged.website} onPick={v => setMerged(m => ({ ...m, website: v }))} />
              </div>
              <div>
                <Label>Careers URL</Label>
                <Input value={merged.careersUrl ?? ""} onChange={e => setMerged(m => ({ ...m, careersUrl: e.target.value }))} />
                <SourceChips values={cluster.map(c => ({ id: c.id, value: c.careersUrl }))} current={merged.careersUrl} onPick={v => setMerged(m => ({ ...m, careersUrl: v }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Industry</Label>
                <Input value={merged.industry ?? ""} onChange={e => setMerged(m => ({ ...m, industry: e.target.value }))} />
                <SourceChips values={cluster.map(c => ({ id: c.id, value: c.industry }))} current={merged.industry} onPick={v => setMerged(m => ({ ...m, industry: v }))} />
              </div>
              <div>
                <Label>Company Size</Label>
                <Input value={merged.size ?? ""} onChange={e => setMerged(m => ({ ...m, size: e.target.value }))} />
                <SourceChips values={cluster.map(c => ({ id: c.id, value: c.size }))} current={merged.size} onPick={v => setMerged(m => ({ ...m, size: v }))} />
              </div>
            </div>

            <div>
              <Label>Notes (concatenated, deduplicated)</Label>
              <Textarea
                value={merged.notes ?? ""}
                onChange={e => setMerged(m => ({ ...m, notes: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={submitting || !merged.name?.trim()}>
            {submitting ? "Merging..." : `Confirm merge (${cluster.length} → 1)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SourceChips({
  values, current, onPick,
}: {
  values: { id: string; value?: string }[];
  current?: string;
  onPick: (v: string) => void;
}) {
  const unique = Array.from(
    new Map(values.filter(v => v.value && v.value.trim()).map(v => [v.value!.trim(), v.value!.trim()])).values(),
  );
  if (unique.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {unique.map((v, i) => (
        <Badge
          key={i}
          variant={v === current ? "default" : "outline"}
          className="cursor-pointer text-xs font-normal"
          onClick={() => onPick(v)}
        >
          {v.length > 40 ? v.slice(0, 37) + "..." : v}
        </Badge>
      ))}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Building2, Briefcase, Calendar, Sparkles, Target, Users, Flame, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ContactAvatar from "@/components/ContactAvatar";
import { pillClass } from "@/lib/pillStyles";
import { cn } from "@/lib/utils";
import { companiesMatch } from "@/stores/jobTrackerStore";
import type { Contact, Job, TargetCompany } from "@/types/jobTracker";
import type { Outreach, OutreachStage, OutreachOutcome } from "@/types/outreach";
import { OUTREACH_STAGE_LABEL, OUTREACH_OUTCOME_LABEL } from "@/types/outreach";
import OutreachDialog from "@/components/networking/OutreachDialog";

interface NetworkingPipelineProps {
  outreaches: Outreach[];
  contacts: Contact[];
  targetCompanies: TargetCompany[];
  jobs: Job[];
  onAddOutreach: (data: Omit<Outreach, "id" | "createdAt" | "updatedAt">) => Promise<Outreach | undefined>;
  onUpdateOutreach: (id: string, updates: Partial<Outreach>) => Promise<void>;
  onDeleteOutreach: (id: string) => Promise<void>;
}

/** Stage colour tones — warmth builds left-to-right toward the referral ask. */
const STAGE_TONE: Record<OutreachStage, "amber-strong" | "amber-soft" | "navy-muted" | "slate"> = {
  identified:     "slate",
  engaged:        "navy-muted",
  referral_asked: "amber-soft",
  closed:         "slate",
};

/** Per-column background — same warmth gradient. The Closed lane is neutral
 *  because its meaning is carried by the per-card outcome chip, not the column. */
const STAGE_COLUMN_BG: Record<OutreachStage, string> = {
  identified:     "bg-muted/40",
  engaged:        "bg-primary/[0.05]",
  referral_asked: "bg-accent/[0.07]",
  closed:         "bg-muted/40",
};

const ALL_STAGES: OutreachStage[] = ["identified", "engaged", "referral_asked", "closed"];

const STAGE_ORDER: Record<OutreachStage, number> = {
  identified: 1, engaged: 2, referral_asked: 3, closed: 0,
};

/** Per-outcome chip styling on Closed cards. Only `referral_made` is the win. */
const OUTCOME_CHIP: Record<OutreachOutcome, { tone: "amber-strong" | "slate"; icon: typeof CheckCircle2 }> = {
  referral_made: { tone: "amber-strong", icon: CheckCircle2 },
  no_referral:   { tone: "slate",        icon: XCircle },
  job_closed:    { tone: "slate",        icon: XCircle },
  other:         { tone: "slate",        icon: XCircle },
};

export default function NetworkingPipeline({
  outreaches, contacts, targetCompanies, jobs,
  onAddOutreach, onUpdateOutreach, onDeleteOutreach,
}: NetworkingPipelineProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Outreach | undefined>();
  const [seed, setSeed] = useState<{ contactId?: string; targetCompanyId?: string; jobId?: string } | undefined>();
  const [dragOverStage, setDragOverStage] = useState<OutreachStage | null>(null);

  const handleDragStart = (e: React.DragEvent, outreachId: string) => {
    e.dataTransfer.setData("text/plain", outreachId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, stage: OutreachStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stage) setDragOverStage(stage);
  };
  const handleDragLeave = (stage: OutreachStage) => {
    if (dragOverStage === stage) setDragOverStage(null);
  };
  const handleDrop = async (e: React.DragEvent, stage: OutreachStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const o = outreaches.find(x => x.id === id);
    if (!o || o.stage === stage) return;
    // Moving into "closed" requires an outcome — open the dialog pre-set to closed
    // so the user can select referral made / no referral / job closed / other.
    if (stage === "closed" && !o.outcome) {
      setEditing({ ...o, stage: "closed" });
      setSeed(undefined);
      setDialogOpen(true);
      return;
    }
    await onUpdateOutreach(id, { stage });
  };

  const contactById = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);
  const jobById = useMemo(() => new Map(jobs.map(j => [j.id, j])), [jobs]);
  const targetById = useMemo(() => new Map(targetCompanies.map(t => [t.id, t])), [targetCompanies]);

  const activeJobs = useMemo(
    () => jobs.filter(j => ["saved", "applied", "screening", "interviewing"].includes(j.status)),
    [jobs],
  );
  const hotOpenings = useMemo(() => {
    return activeJobs.map(job => {
      const tcMatch = targetCompanies.find(t => companiesMatch(t.name, job.company));
      const related = outreaches.filter(o =>
        o.jobId === job.id ||
        (tcMatch && o.targetCompanyId === tcMatch.id && !o.jobId),
      );
      const headline = related
        .filter(o => o.stage !== "closed")
        .sort((a, b) => STAGE_ORDER[b.stage] - STAGE_ORDER[a.stage])[0];
      const contactsAtCompany = contacts.filter(c => companiesMatch(c.company, job.company));
      return { job, related, headline, contactsAtCompany, targetCompany: tcMatch };
    }).sort((a, b) => {
      // Most-advanced referral path first; jobs with zero contacts last.
      const score = (x: { headline?: Outreach; contactsAtCompany: Contact[] }) => {
        if (x.headline) return 100 + STAGE_ORDER[x.headline.stage];
        return x.contactsAtCompany.length > 0 ? 50 : 0;
      };
      return score(b) - score(a);
    });
  }, [activeJobs, outreaches, targetCompanies, contacts]);

  const targetWithStatus = useMemo(() => {
    return targetCompanies
      .filter(t => t.status !== "archived")
      .map(target => {
        const related = outreaches.filter(o => o.targetCompanyId === target.id && o.stage !== "closed");
        const contactsAtCompany = contacts.filter(c => companiesMatch(c.company, target.name));
        const headline = related.sort((a, b) => STAGE_ORDER[b.stage] - STAGE_ORDER[a.stage])[0];
        return { target, related, headline, contactsAtCompany };
      })
      .sort((a, b) => {
        const score = (x: { headline?: Outreach; contactsAtCompany: Contact[] }) => {
          if (x.headline) return 100 + STAGE_ORDER[x.headline.stage];
          return x.contactsAtCompany.length > 0 ? 50 : 0;
        };
        return score(b) - score(a);
      });
  }, [targetCompanies, outreaches, contacts]);

  const outreachByStage = useMemo(() => {
    const map: Record<OutreachStage, Outreach[]> = {
      identified: [], engaged: [], referral_asked: [], closed: [],
    };
    outreaches.forEach(o => map[o.stage].push(o));
    Object.keys(map).forEach(k => {
      map[k as OutreachStage].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
    return map;
  }, [outreaches]);

  const openNew = (s?: typeof seed) => {
    setEditing(undefined);
    setSeed(s);
    setDialogOpen(true);
  };
  const openEdit = (o: Outreach) => {
    setEditing(o);
    setSeed(undefined);
    setDialogOpen(true);
  };
  const handleSave = async (data: Omit<Outreach, "id" | "createdAt" | "updatedAt">) => {
    if (editing) {
      await onUpdateOutreach(editing.id, data);
    } else {
      await onAddOutreach(data);
    }
  };

  const renderOutreachCard = (o: Outreach) => {
    const contact = contactById.get(o.contactId);
    const job = o.jobId ? jobById.get(o.jobId) : undefined;
    const target = targetById.get(o.targetCompanyId);
    const outcomeChip = o.stage === "closed" && o.outcome ? OUTCOME_CHIP[o.outcome] : null;
    const OutcomeIcon = outcomeChip?.icon;
    return (
      <button
        key={o.id}
        draggable
        onDragStart={e => handleDragStart(e, o.id)}
        onClick={() => openEdit(o)}
        className="group w-full cursor-grab rounded-md border border-border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:cursor-grabbing"
      >
        <div className="flex items-start gap-3">
          {contact && <ContactAvatar name={contact.name} avatarUrl={contact.avatarUrl} size="sm" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{contact?.name ?? "Unknown contact"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {contact?.role ? `${contact.role} · ` : ""}{target?.name ?? contact?.company}
            </p>
            {outcomeChip && OutcomeIcon && (
              <p className={cn(
                "mt-2 inline-flex max-w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-medium",
                outcomeChip.tone === "amber-strong"
                  ? "bg-accent/15 text-accent-foreground"
                  : "bg-muted text-muted-foreground",
              )}>
                <OutcomeIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{OUTREACH_OUTCOME_LABEL[o.outcome!]}</span>
              </p>
            )}
            {job && !outcomeChip && (
              <p className="mt-2 inline-flex max-w-full items-center gap-1 truncate rounded bg-primary/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-primary">
                <Briefcase className="h-3 w-3 shrink-0" />
                <span className="truncate">{job.title}</span>
              </p>
            )}
            {o.nextStepLabel && o.stage !== "closed" && (
              <p className="mt-2 flex items-center gap-1 truncate text-xs text-foreground/80">
                <Calendar className="h-3 w-3 text-accent-foreground/70" />
                <span className="truncate">{o.nextStepLabel}</span>
                {o.nextStepDate && <span className="text-muted-foreground">· {o.nextStepDate}</span>}
              </p>
            )}
          </div>
        </div>
      </button>
    );
  };

  // Conversion = referral wins ÷ everything that reached the ask stage (still open + closed of any kind that came from there).
  const referralsAsked = outreachByStage.referral_asked.length
    + outreaches.filter(o => o.stage === "closed" && (o.referralAskedAt || o.outcome === "referral_made")).length;
  const referralsMade = outreaches.filter(o => o.stage === "closed" && o.outcome === "referral_made").length;
  const conversionPct = referralsAsked > 0 ? Math.round((referralsMade / referralsAsked) * 100) : null;

  if (outreaches.length === 0 && targetCompanies.length === 0 && contacts.length === 0) {
    return (
      <div className="mx-auto max-w-3xl pt-12">
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
            <Sparkles className="h-6 w-6 text-accent-foreground" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">
            Networking Pipeline
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Track every effort to land an inside referral — your highest-conversion path to interviews and offers.
            Add contacts and target companies first, then track outreach here.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => navigate("/contacts")} variant="outline">Add contacts</Button>
            <Button onClick={() => navigate("/target-companies")}>Add target companies</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Networking Pipeline
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            One outcome: <span className="font-medium text-foreground">an inside referral</span>.
            {referralsAsked > 0 && (
              <>
                {" "}You've made <span className="font-medium text-foreground">{referralsMade}</span> referral{referralsMade === 1 ? "" : "s"} from <span className="font-medium text-foreground">{referralsAsked}</span> ask{referralsAsked === 1 ? "" : "s"}
                {conversionPct !== null && (
                  <> · <span className="font-medium text-accent-foreground">{conversionPct}%</span> conversion</>
                )}.
              </>
            )}
          </p>
        </div>
        <Button onClick={() => openNew()} className="shrink-0" size="sm">
          <Plus className="h-4 w-4" />
          New outreach
        </Button>
      </div>

      {/* ── ZONE 1: KANBAN (the engine — primary work surface) ──── */}
      <section>
        <header className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Outreach in flight
          </h2>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {ALL_STAGES.map(stage => {
            const cards = outreachByStage[stage];
            const isAsk = stage === "referral_asked";
            const isClosed = stage === "closed";
            return (
              <div key={stage} className="flex min-w-0 flex-col">
                <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                  <span className={cn(pillClass(STAGE_TONE[stage], "sm"), "uppercase tracking-wider")}>
                    {OUTREACH_STAGE_LABEL[stage]}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      isAsk ? "text-accent-foreground" : "text-muted-foreground",
                    )}
                  >
                    {cards.length}
                  </span>
                </div>
                <div
                  onDragOver={e => handleDragOver(e, stage)}
                  onDragLeave={() => handleDragLeave(stage)}
                  onDrop={e => handleDrop(e, stage)}
                  className={cn(
                    "min-h-[220px] flex-1 space-y-2 rounded-lg border border-border/60 p-2 transition-colors",
                    STAGE_COLUMN_BG[stage],
                    isAsk && "border-accent/30",
                    isClosed && "border-dashed",
                    dragOverStage === stage && "border-primary/60 bg-primary/[0.08] ring-2 ring-primary/30",
                  )}
                >
                  {cards.length === 0 ? (
                    <p className="px-2 py-8 text-center text-xs italic text-muted-foreground/70">
                      {isClosed ? "Wins and dead-ends will land here." : "Drop a card here or nothing yet."}
                    </p>
                  ) : (
                    cards.map(o => renderOutreachCard(o))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── ZONE 2: FEEDERS — surfaces that fuel the pipeline ──── */}
      <section>
        <header className="mb-3">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Add to pipeline
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Live opportunities and dream companies waiting for outreach.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Feeder 1 — Hot Openings */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Open roles</p>
              </div>
              {hotOpenings.length > 3 && (
                <button onClick={() => navigate("/jobs")} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                  +{hotOpenings.length - 3} more →
                </button>
              )}
            </div>
            {hotOpenings.length === 0 ? (
              <Card className="px-4 py-3 text-sm text-muted-foreground">
                No active job postings yet.{" "}
                <button className="text-primary hover:underline" onClick={() => navigate("/jobs")}>Add a job</button>.
              </Card>
            ) : (
              <div className="space-y-2">
                {hotOpenings.slice(0, 3).map(({ job, headline, contactsAtCompany, targetCompany }) => (
                  <Card key={job.id} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight text-foreground">{job.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.company}</p>
                    </div>
                    {contactsAtCompany.length > 0 && (
                      <div className="hidden shrink-0 items-center -space-x-1.5 sm:flex">
                        {contactsAtCompany.slice(0, 2).map(c => (
                          <div key={c.id} className="rounded-full ring-2 ring-card">
                            <ContactAvatar name={c.name} avatarUrl={c.avatarUrl} size="sm" />
                          </div>
                        ))}
                        {contactsAtCompany.length > 2 && (
                          <span className="pl-2.5 text-xs font-medium text-muted-foreground">
                            +{contactsAtCompany.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="shrink-0">
                      {headline ? (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => openEdit(headline)}>
                          {OUTREACH_STAGE_LABEL[headline.stage]}
                        </Button>
                      ) : contactsAtCompany.length > 0 ? (
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => openNew({
                            contactId: contactsAtCompany[0].id,
                            targetCompanyId: targetCompany?.id,
                            jobId: job.id,
                          })}
                        >
                          Start outreach
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => navigate("/contacts")}>
                          Find contact
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Feeder 2 — Target Companies */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-accent-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Dream companies</p>
              </div>
              {targetWithStatus.length > 3 ? (
                <button onClick={() => navigate("/target-companies")} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                  +{targetWithStatus.length - 3} more →
                </button>
              ) : (
                <button onClick={() => navigate("/target-companies")} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                  Manage →
                </button>
              )}
            </div>
            {targetWithStatus.length === 0 ? (
              <Card className="px-4 py-3 text-sm text-muted-foreground">
                No target companies yet.{" "}
                <button className="text-primary hover:underline" onClick={() => navigate("/target-companies")}>Add one</button>.
              </Card>
            ) : (
              <div className="space-y-2">
                {targetWithStatus.slice(0, 3).map(({ target, headline, contactsAtCompany }) => (
                  <Card key={target.id} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/30">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 ring-1 ring-accent/20">
                      <Building2 className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight text-foreground">{target.name}</p>
                      <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground">
                        {target.industry && <span className="truncate">{target.industry}</span>}
                        {contactsAtCompany.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {contactsAtCompany.length}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {headline ? (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => openEdit(headline)}>
                          {OUTREACH_STAGE_LABEL[headline.stage]}
                        </Button>
                      ) : contactsAtCompany.length > 0 ? (
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => openNew({
                            contactId: contactsAtCompany[0].id,
                            targetCompanyId: target.id,
                          })}
                        >
                          Start outreach
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => navigate("/contacts")}>
                          Find contact
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <OutreachDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contacts={contacts}
        targetCompanies={targetCompanies}
        jobs={jobs}
        initial={seed}
        existing={editing}
        onSave={handleSave}
        onDelete={onDeleteOutreach}
      />
    </div>
  );
}

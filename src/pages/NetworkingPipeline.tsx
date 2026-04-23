import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ExternalLink, Building2, Briefcase, Calendar, Sparkles, Target, Users, Flame, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ContactAvatar from "@/components/ContactAvatar";
import { pillClass } from "@/lib/pillStyles";
import { cn } from "@/lib/utils";
import { companiesMatch } from "@/stores/jobTrackerStore";
import type { Contact, Job, TargetCompany } from "@/types/jobTracker";
import type { Outreach, OutreachStage } from "@/types/outreach";
import { OUTREACH_STAGE_LABEL } from "@/types/outreach";
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

const STAGE_TONE: Record<OutreachStage, "amber-strong" | "amber-soft" | "navy-muted" | "slate"> = {
  identified:      "slate",
  contacted:       "navy-muted",
  in_conversation: "navy-muted",
  referral_asked:  "amber-soft",
  referral_made:   "amber-strong",
  closed:          "slate",
};

/**
 * Left-edge accent on Kanban cards. Drives instant scan: as eyes move
 * down a column, all cards share a tone; as eyes move *across* columns,
 * the tone warms toward the referral. No new hues — just opacity on the
 * existing primary/accent tokens.
 */
const STAGE_BORDER: Record<OutreachStage, string> = {
  identified:      "border-l-muted-foreground/30",
  contacted:       "border-l-primary/40",
  in_conversation: "border-l-primary/60",
  referral_asked:  "border-l-accent/60",
  referral_made:   "border-l-accent",
  closed:          "border-l-muted-foreground/20",
};

/**
 * Per-column header treatment for the Kanban. Same logic as cards: warmth
 * builds left-to-right toward the referral milestone.
 */
const STAGE_COLUMN_BG: Record<OutreachStage, string> = {
  identified:      "bg-muted/40",
  contacted:       "bg-primary/[0.04]",
  in_conversation: "bg-primary/[0.06]",
  referral_asked:  "bg-accent/[0.06]",
  referral_made:   "bg-accent/[0.10]",
  closed:          "bg-muted/40",
};

const ACTIVE_STAGES: OutreachStage[] = ["identified", "contacted", "in_conversation", "referral_asked", "referral_made"];

export default function NetworkingPipeline({
  outreaches, contacts, targetCompanies, jobs,
  onAddOutreach, onUpdateOutreach, onDeleteOutreach,
}: NetworkingPipelineProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Outreach | undefined>();
  const [seed, setSeed] = useState<{ contactId?: string; targetCompanyId?: string; jobId?: string } | undefined>();

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
      const stageOrder: Record<OutreachStage, number> = {
        identified: 1, contacted: 2, in_conversation: 3,
        referral_asked: 4, referral_made: 5, closed: 0,
      };
      const headline = related
        .filter(o => o.stage !== "closed")
        .sort((a, b) => stageOrder[b.stage] - stageOrder[a.stage])[0];
      const contactsAtCompany = contacts.filter(c => companiesMatch(c.company, job.company));
      return { job, related, headline, contactsAtCompany, targetCompany: tcMatch };
    }).sort((a, b) => {
      // Most-advanced referral path first; jobs with zero contacts last.
      const score = (x: typeof activeJobs[number] extends never ? never : { headline?: Outreach; contactsAtCompany: Contact[] }) => {
        if (x.headline) {
          const stageOrder: Record<OutreachStage, number> = {
            identified: 1, contacted: 2, in_conversation: 3,
            referral_asked: 4, referral_made: 5, closed: 0,
          };
          return 100 + stageOrder[x.headline.stage];
        }
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
        const stageOrder: Record<OutreachStage, number> = {
          identified: 1, contacted: 2, in_conversation: 3,
          referral_asked: 4, referral_made: 5, closed: 0,
        };
        const headline = related.sort((a, b) => stageOrder[b.stage] - stageOrder[a.stage])[0];
        return { target, related, headline, contactsAtCompany };
      })
      .sort((a, b) => {
        const score = (x: { headline?: Outreach; contactsAtCompany: Contact[] }) => {
          if (x.headline) {
            const stageOrder: Record<OutreachStage, number> = {
              identified: 1, contacted: 2, in_conversation: 3,
              referral_asked: 4, referral_made: 5, closed: 0,
            };
            return 100 + stageOrder[x.headline.stage];
          }
          return x.contactsAtCompany.length > 0 ? 50 : 0;
        };
        return score(b) - score(a);
      });
  }, [targetCompanies, outreaches, contacts]);

  const outreachByStage = useMemo(() => {
    const map: Record<OutreachStage, Outreach[]> = {
      identified: [], contacted: [], in_conversation: [],
      referral_asked: [], referral_made: [], closed: [],
    };
    outreaches.forEach(o => map[o.stage].push(o));
    Object.keys(map).forEach(k => {
      map[k as OutreachStage].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
    return map;
  }, [outreaches]);

  const totalActive = ACTIVE_STAGES.reduce((sum, s) => sum + outreachByStage[s].length, 0);
  const referralsMade = outreachByStage.referral_made.length + outreaches.filter(o => o.stage === "closed" && o.referralMadeAt).length;
  const referralsAsked = outreachByStage.referral_asked.length + referralsMade;

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

  const renderOutreachCard = (o: Outreach, compact = false) => {
    const contact = contactById.get(o.contactId);
    const job = o.jobId ? jobById.get(o.jobId) : undefined;
    const target = targetById.get(o.targetCompanyId);
    return (
      <button
        key={o.id}
        onClick={() => openEdit(o)}
        className={cn(
          "group w-full rounded-md border border-l-[3px] border-border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
          STAGE_BORDER[o.stage],
          compact && "p-2.5",
        )}
      >
        <div className="flex items-start gap-2.5">
          {contact && <ContactAvatar name={contact.name} avatarUrl={contact.avatarUrl} size="sm" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">{contact?.name ?? "Unknown contact"}</p>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {contact?.role ? `${contact.role} · ` : ""}{target?.name ?? contact?.company}
            </p>
            {job && (
              <p className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded bg-primary/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <Briefcase className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{job.title}</span>
              </p>
            )}
            {o.nextStepLabel && (
              <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] font-medium text-foreground/80">
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
    <div className="space-y-10">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Networking Pipeline
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            One outcome: <span className="font-medium text-foreground">an inside referral</span>. Three entry points: open jobs, target companies, and warm contacts. Move outreach forward stage by stage.
          </p>
        </div>
        <Button onClick={() => openNew()} className="shrink-0">
          <Plus className="h-4 w-4" />
          New outreach
        </Button>
      </div>

      {/* ── SCOREBOARD ─────────────────────────────────────────── */}
      {/* Each tile maps to a step in the funnel. Tone intensifies as you near the referral, so the eye lands on the milestone metrics. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="relative overflow-hidden p-4">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-muted-foreground/30" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active outreach</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">{totalActive}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">in flight</p>
        </Card>
        <Card className="relative overflow-hidden p-4">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-accent/50" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Referrals asked</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">{referralsAsked}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">explicitly requested</p>
        </Card>
        <Card className="relative overflow-hidden p-4">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-foreground/80">Referrals made</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">{referralsMade}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">put forward to DM</p>
        </Card>
        <Card className="relative overflow-hidden p-4">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/60" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conversion</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
            {referralsAsked > 0 ? `${Math.round((referralsMade / referralsAsked) * 100)}%` : "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">asked → made</p>
        </Card>
      </div>

      {/* ── ZONE 1: HOT OPENINGS (Job-triggered — primary/navy identity) ── */}
      <section>
        <header className="mb-4 flex items-end justify-between gap-3 border-l-[3px] border-primary/70 pl-3">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Job 1 · Open Roles</p>
            </div>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground">
              Hot openings — who can help?
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Active job postings, ranked by referral path strength.
            </p>
          </div>
        </header>
        {hotOpenings.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No active job postings yet. <button className="text-primary hover:underline" onClick={() => navigate("/jobs")}>Add a job</button> to start tracking.
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {hotOpenings.slice(0, 9).map(({ job, headline, contactsAtCompany, targetCompany }) => {
              const tone = headline ? STAGE_TONE[headline.stage] : (contactsAtCompany.length > 0 ? "amber-soft" : "slate");
              const accentBar =
                headline?.stage === "referral_made" ? "bg-accent" :
                headline?.stage === "referral_asked" ? "bg-accent/60" :
                headline ? "bg-primary/50" :
                contactsAtCompany.length > 0 ? "bg-accent/40" : "bg-muted-foreground/20";
              return (
                <Card key={job.id} className="relative overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className={cn("absolute inset-y-0 left-0 w-1", accentBar)} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{job.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{job.company}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      aria-label="Open job"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-3">
                    {headline ? (
                      <span className={cn(pillClass(tone, "sm"), "uppercase tracking-wider")}>
                        {OUTREACH_STAGE_LABEL[headline.stage]}
                      </span>
                    ) : contactsAtCompany.length > 0 ? (
                      <span className={cn(pillClass("amber-soft", "sm"), "uppercase tracking-wider")}>
                        {contactsAtCompany.length} contact{contactsAtCompany.length === 1 ? "" : "s"} — start outreach
                      </span>
                    ) : (
                      <span className={cn(pillClass("slate", "sm"), "uppercase tracking-wider")}>
                        No contact yet
                      </span>
                    )}
                  </div>
                  {contactsAtCompany.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {contactsAtCompany.slice(0, 5).map(c => <ContactAvatar key={c.id} name={c.name} avatarUrl={c.avatarUrl} size="sm" />)}
                      {contactsAtCompany.length > 5 && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                          +{contactsAtCompany.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    {headline ? (
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openEdit(headline)}>
                        Update outreach
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    ) : contactsAtCompany.length > 0 ? (
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => openNew({
                          contactId: contactsAtCompany[0].id,
                          targetCompanyId: targetCompany?.id,
                          jobId: job.id,
                        })}
                      >
                        Start outreach
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate("/contacts")}>
                        Find a contact
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── ZONE 2: TARGET COMPANIES (Company-triggered — accent/amber identity) ── */}
      <section>
        <header className="mb-4 flex items-end justify-between gap-3 border-l-[3px] border-accent pl-3">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-accent-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">Job 2 · Dream Companies</p>
            </div>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground">
              Target companies — relationship status
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Where you stand on getting an inside referral, even if no role is open.
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate("/target-companies")}>
            Manage
          </Button>
        </header>
        {targetWithStatus.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No target companies yet.{" "}
            <button className="text-primary hover:underline" onClick={() => navigate("/target-companies")}>
              Add one
            </button>{" "}
            to start tracking referral readiness.
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {targetWithStatus.slice(0, 9).map(({ target, headline, contactsAtCompany }) => {
              const accentBar =
                headline?.stage === "referral_made" ? "bg-accent" :
                headline?.stage === "referral_asked" ? "bg-accent/60" :
                headline ? "bg-primary/50" :
                contactsAtCompany.length > 0 ? "bg-accent/40" : "bg-muted-foreground/20";
              return (
                <Card key={target.id} className="relative overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className={cn("absolute inset-y-0 left-0 w-1", accentBar)} />
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 ring-1 ring-accent/20">
                      <Building2 className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{target.name}</p>
                      {target.industry && (
                        <p className="truncate text-xs text-muted-foreground">{target.industry}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {headline ? (
                      <span className={cn(pillClass(STAGE_TONE[headline.stage], "sm"), "uppercase tracking-wider")}>
                        {OUTREACH_STAGE_LABEL[headline.stage]}
                      </span>
                    ) : contactsAtCompany.length > 0 ? (
                      <span className={cn(pillClass("amber-soft", "sm"), "uppercase tracking-wider")}>
                        {contactsAtCompany.length} contact{contactsAtCompany.length === 1 ? "" : "s"} — no outreach
                      </span>
                    ) : (
                      <span className={cn(pillClass("slate", "sm"), "uppercase tracking-wider")}>
                        No contact yet
                      </span>
                    )}
                    {contactsAtCompany.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {contactsAtCompany.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    {headline ? (
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openEdit(headline)}>
                        Update
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    ) : contactsAtCompany.length > 0 ? (
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => openNew({
                          contactId: contactsAtCompany[0].id,
                          targetCompanyId: target.id,
                        })}
                      >
                        Start outreach
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate("/contacts")}>
                        Find a contact
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── ZONE 3: KANBAN (the engine — neutral surface, stage-tinted columns) ── */}
      <section>
        <header className="mb-4 border-l-[3px] border-foreground/40 pl-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">The Engine</p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground">
            Outreach in flight
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every active referral effort. Click a card to update stage and notes. Warmth builds left-to-right.
          </p>
        </header>

        {/* Progression rail — visualizes the journey, even when columns are empty */}
        <div className="mb-3 hidden items-center gap-1 px-1 md:flex">
          {ACTIVE_STAGES.map((stage, i) => (
            <div key={stage} className="flex flex-1 items-center gap-1">
              <div
                className={cn(
                  "h-1 flex-1 rounded-full",
                  stage === "identified" && "bg-muted-foreground/20",
                  stage === "contacted" && "bg-primary/30",
                  stage === "in_conversation" && "bg-primary/50",
                  stage === "referral_asked" && "bg-accent/50",
                  stage === "referral_made" && "bg-accent",
                )}
              />
              {i < ACTIVE_STAGES.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />}
            </div>
          ))}
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {ACTIVE_STAGES.map(stage => {
              const cards = outreachByStage[stage];
              const isMilestone = stage === "referral_asked" || stage === "referral_made";
              return (
                <div key={stage} className="w-72 shrink-0">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(pillClass(STAGE_TONE[stage], "sm"), "uppercase tracking-wider")}>
                        {OUTREACH_STAGE_LABEL[stage]}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isMilestone ? "text-accent-foreground" : "text-muted-foreground",
                        )}
                      >
                        {cards.length}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "min-h-[140px] space-y-2 rounded-lg border border-border/60 p-2 transition-colors",
                      STAGE_COLUMN_BG[stage],
                      isMilestone && "border-accent/30",
                    )}
                  >
                    {cards.length === 0 ? (
                      <p className="px-2 py-6 text-center text-[11px] italic text-muted-foreground/70">
                        Nothing here.
                      </p>
                    ) : (
                      cards.map(o => renderOutreachCard(o, true))
                    )}
                  </div>
                </div>
              );
            })}
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

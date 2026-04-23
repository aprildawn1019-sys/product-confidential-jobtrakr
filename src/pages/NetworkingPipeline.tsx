import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ExternalLink, Building2, Briefcase, Calendar, Sparkles } from "lucide-react";
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
      const aStage = a.headline ? 1 : 0;
      const bStage = b.headline ? 1 : 0;
      return aStage - bStage;
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
        if (!a.headline && b.headline) return -1;
        if (a.headline && !b.headline) return 1;
        return 0;
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
          "group w-full rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm",
          compact && "p-2.5",
        )}
      >
        <div className="flex items-start gap-2.5">
          {contact && <ContactAvatar contact={contact} size="sm" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">{contact?.name ?? "Unknown contact"}</p>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {contact?.role ? `${contact.role} · ` : ""}{target?.name ?? contact?.company}
            </p>
            {job && (
              <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                <span className="truncate">{job.title}</span>
              </p>
            )}
            {o.nextStepLabel && (
              <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-foreground/80">
                <Calendar className="h-3 w-3" />
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
    <div className="space-y-8">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active outreach</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">{totalActive}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Referrals asked</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">{referralsAsked}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Referrals made</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">{referralsMade}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conversion</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
            {referralsAsked > 0 ? `${Math.round((referralsMade / referralsAsked) * 100)}%` : "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">asked → made</p>
        </Card>
      </div>

      <section>
        <header className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
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
            {hotOpenings.slice(0, 9).map(({ job, headline, contactsAtCompany, targetCompany }) => (
              <Card key={job.id} className="p-4">
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
                    <span className={cn(pillClass(STAGE_TONE[headline.stage], "sm"), "uppercase tracking-wider")}>
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
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {contactsAtCompany.slice(0, 5).map(c => <ContactAvatar key={c.id} contact={c} size="sm" />)}
                  {contactsAtCompany.length > 5 && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      +{contactsAtCompany.length - 5}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  {headline ? (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openEdit(headline)}>
                      Update outreach
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
            ))}
          </div>
        )}
      </section>

      <section>
        <header className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
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
            {targetWithStatus.slice(0, 9).map(({ target, headline, contactsAtCompany }) => (
              <Card key={target.id} className="p-4">
                <div className="flex items-start gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{target.name}</p>
                    {target.industry && (
                      <p className="truncate text-xs text-muted-foreground">{target.industry}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3">
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
                </div>
                <div className="mt-3 flex gap-2">
                  {headline ? (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openEdit(headline)}>
                      Update
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
            ))}
          </div>
        )}
      </section>

      <section>
        <header className="mb-3">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Outreach in flight
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every active referral effort. Click a card to update stage and notes.
          </p>
        </header>
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {ACTIVE_STAGES.map(stage => {
              const cards = outreachByStage[stage];
              return (
                <div key={stage} className="w-72 shrink-0">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(pillClass(STAGE_TONE[stage], "sm"), "uppercase tracking-wider")}>
                        {OUTREACH_STAGE_LABEL[stage]}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">{cards.length}</span>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-lg bg-muted/40 p-2 min-h-[120px]">
                    {cards.length === 0 ? (
                      <p className="px-2 py-4 text-center text-[11px] text-muted-foreground">
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

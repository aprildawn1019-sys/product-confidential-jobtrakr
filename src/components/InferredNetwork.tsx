import { useState, useMemo } from "react";
import { Users, Building2, Briefcase, Link2, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { companiesMatch } from "@/stores/jobTrackerStore";
import type { Contact, Job, JobContact, ContactConnection } from "@/types/jobTracker";

interface InferredPair {
  contact1: Contact;
  contact2: Contact;
  reasons: { type: "company" | "job"; label: string }[];
}

interface InferredNetworkProps {
  contacts: Contact[];
  jobs: Job[];
  jobContacts: JobContact[];
  contactConnections: ContactConnection[];
  onAddConnection: (contactId1: string, contactId2: string, type?: string) => void;
}

export default function InferredNetwork({
  contacts,
  jobs,
  jobContacts,
  contactConnections,
  onAddConnection,
}: InferredNetworkProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);

  const pairKey = (a: string, b: string) => [a, b].sort().join("::");

  const existingConnections = useMemo(() => {
    const set = new Set<string>();
    contactConnections.forEach((c) => set.add(pairKey(c.contactId1, c.contactId2)));
    return set;
  }, [contactConnections]);

  const inferred = useMemo<InferredPair[]>(() => {
    const pairMap = new Map<string, InferredPair>();

    // Same company
    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const a = contacts[i];
        const b = contacts[j];
        if (companiesMatch(a.company, b.company)) {
          const key = pairKey(a.id, b.id);
          if (!existingConnections.has(key)) {
            if (!pairMap.has(key)) {
              pairMap.set(key, { contact1: a, contact2: b, reasons: [] });
            }
            pairMap.get(key)!.reasons.push({ type: "company", label: a.company });
          }
        }
      }
    }

    // Shared job link
    const jobToContacts = new Map<string, string[]>();
    jobContacts.forEach((jc) => {
      if (!jobToContacts.has(jc.jobId)) jobToContacts.set(jc.jobId, []);
      jobToContacts.get(jc.jobId)!.push(jc.contactId);
    });

    jobToContacts.forEach((contactIds, jobId) => {
      if (contactIds.length < 2) return;
      const job = jobs.find((j) => j.id === jobId);
      const label = job ? `${job.title} at ${job.company}` : "Shared Job";
      for (let i = 0; i < contactIds.length; i++) {
        for (let j = i + 1; j < contactIds.length; j++) {
          const key = pairKey(contactIds[i], contactIds[j]);
          if (existingConnections.has(key)) continue;
          if (!pairMap.has(key)) {
            const c1 = contacts.find((c) => c.id === contactIds[i]);
            const c2 = contacts.find((c) => c.id === contactIds[j]);
            if (!c1 || !c2) continue;
            pairMap.set(key, { contact1: c1, contact2: c2, reasons: [] });
          }
          const existing = pairMap.get(key)!;
          if (!existing.reasons.some((r) => r.type === "job" && r.label === label)) {
            existing.reasons.push({ type: "job", label });
          }
        }
      }
    });

    return Array.from(pairMap.values());
  }, [contacts, jobs, jobContacts, existingConnections]);

  const visible = inferred.filter((p) => !dismissed.has(pairKey(p.contact1.id, p.contact2.id)));

  if (inferred.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card">
      <button
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Inferred Network</span>
          <Badge variant="secondary" className="text-xs">
            {visible.length}
          </Badge>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">All suggestions dismissed or connected.</p>
          ) : (
            <div className="space-y-2">
              {visible.map((pair) => {
                const key = pairKey(pair.contact1.id, pair.contact2.id);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm text-foreground truncate">{pair.contact1.name}</span>
                        <span className="text-muted-foreground text-xs">↔</span>
                        <span className="font-medium text-sm text-foreground truncate">{pair.contact2.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {pair.reasons.map((r, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs gap-1"
                          >
                            {r.type === "company" ? (
                              <Building2 className="h-3 w-3" />
                            ) : (
                              <Briefcase className="h-3 w-3" />
                            )}
                            {r.type === "company" ? "Same Company" : r.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs gap-1"
                        onClick={() => onAddConnection(pair.contact1.id, pair.contact2.id, "inferred")}
                      >
                        <Link2 className="h-3 w-3" />
                        Connect
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setDismissed((prev) => new Set(prev).add(key))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

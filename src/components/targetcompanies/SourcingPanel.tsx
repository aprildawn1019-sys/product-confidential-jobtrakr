import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Linkedin, UserPlus, Globe, Search, Copy, Check, Mail, ExternalLink, Sparkles, Users, Target,
} from "lucide-react";
import { toast } from "sonner";
import CompanyAvatar from "@/components/CompanyAvatar";
import { getOutreachTemplates } from "@/lib/outreachTemplates";
import { findSecondDegreeMatches, buildLinkedInSearchUrl, COVERAGE_LABELS, type CoverageInfo } from "./coverageUtils";
import type { Contact, NetworkRole, TargetCompany } from "@/types/jobTracker";

interface SourcingPanelProps {
  company: TargetCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  coverage: CoverageInfo | null;
  onAddContact: (prefill: { company: string; networkRole: NetworkRole }) => void;
  onOpenContact?: (contactId: string) => void;
}

const ROLE_LABEL: Record<string, string> = {
  booster: "🚀 Booster",
  connector: "🌉 Connector",
  recruiter_internal: "👀 Recruiter",
};

function ContactRow({
  contact,
  templateRole,
  targetCompany,
  onOpen,
}: {
  contact: Contact;
  templateRole: NetworkRole;
  targetCompany: string;
  onOpen?: (id: string) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const templates = useMemo(
    () => getOutreachTemplates(templateRole, {
      contactName: contact.name,
      contactFirstName: contact.name.split(" ")[0],
      targetCompany,
    }),
    [templateRole, contact.name, targetCompany],
  );

  const copy = async (id: string, body: string) => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedId(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="rounded-md border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpen?.(contact.id)}
              className="font-medium text-sm hover:underline truncate text-left"
            >
              {contact.name}
            </button>
            {contact.relationshipWarmth && <WarmthBadge warmth={contact.relationshipWarmth} />}
          </div>
          {contact.role && <p className="text-xs text-muted-foreground truncate">{contact.role}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {contact.linkedin && (
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Linkedin className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          {contact.email && (
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={`mailto:${contact.email}`} aria-label="Email">
                <Mail className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {templates.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {templates.map(t => (
            <div key={t.id} className="rounded border border-dashed bg-muted/30 p-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{t.label}</span>
                <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs" onClick={() => copy(`${contact.id}-${t.id}`, t.body)}>
                  {copiedId === `${contact.id}-${t.id}` ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                </Button>
              </div>
              <p className="text-xs whitespace-pre-line text-foreground/90 line-clamp-3">{t.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SourcingPanel({
  company, open, onOpenChange, contacts, coverage, onAddContact, onOpenContact,
}: SourcingPanelProps) {
  if (!company || !coverage) return null;

  const secondDegree = findSecondDegreeMatches(company, contacts);
  const conf = COVERAGE_LABELS[coverage.state];

  const handleAdd = (role: NetworkRole) => {
    onAddContact({ company: company.name, networkRole: role });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <CompanyAvatar company={company.name} size="md" />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base truncate">Find a Booster at {company.name}</SheetTitle>
              <SheetDescription className="text-xs flex items-center gap-1.5 mt-1">
                <span aria-hidden>{conf.emoji}</span> {conf.label}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Section A — Inside path */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold">Inside path</h3>
              </div>

              {coverage.boosters.length === 0 && coverage.connectors.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  No Boosters or Connectors yet for this company. Use the sourcing actions below to find one.
                </div>
              ) : (
                <div className="space-y-3">
                  {coverage.boosters.map(c => (
                    <ContactRow key={c.id} contact={c} templateRole="booster" targetCompany={company.name} onOpen={onOpenContact} />
                  ))}
                  {coverage.boosters.length === 0 && coverage.connectors.map(c => (
                    <ContactRow key={c.id} contact={c} templateRole="connector" targetCompany={company.name} onOpen={onOpenContact} />
                  ))}
                </div>
              )}
            </section>

            {/* Section B — Recruiter contacts */}
            {coverage.recruiters.length > 0 && (
              <>
                <Separator />
                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-600" />
                    <h3 className="text-sm font-semibold">Recruiter contacts</h3>
                  </div>
                  <div className="space-y-3">
                    {coverage.recruiters.map(c => (
                      <ContactRow key={c.id} contact={c} templateRole="recruiter_internal" targetCompany={company.name} onOpen={onOpenContact} />
                    ))}
                  </div>
                </section>
              </>
            )}

            <Separator />

            {/* Section C — Sourcing actions */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Sourcing actions</h3>
              </div>

              <div className="grid gap-2">
                <Button variant="outline" className="justify-start gap-2 h-auto py-2.5" asChild>
                  <a href={buildLinkedInSearchUrl(company.name)} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                    <span className="flex-1 text-left">
                      <span className="block text-sm font-medium">Search LinkedIn for "{company.name}"</span>
                      <span className="block text-[11px] text-muted-foreground">Opens people search in a new tab</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </Button>

                <Button variant="outline" className="justify-start gap-2 h-auto py-2.5" onClick={() => handleAdd("booster")}>
                  <UserPlus className="h-4 w-4 text-emerald-600" />
                  <span className="flex-1 text-left">
                    <span className="block text-sm font-medium">Add a Booster at {company.name}</span>
                    <span className="block text-[11px] text-muted-foreground">Pre-fills company + role</span>
                  </span>
                </Button>

                {company.careersUrl && (
                  <Button variant="outline" className="justify-start gap-2 h-auto py-2.5" asChild>
                    <a href={company.careersUrl} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4" />
                      <span className="flex-1 text-left">
                        <span className="block text-sm font-medium">Visit careers page</span>
                        <span className="block text-[11px] text-muted-foreground truncate">{company.careersUrl}</span>
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  </Button>
                )}
              </div>
            </section>

            {/* 2nd-degree mentions */}
            <Separator />
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold">Who you may already know</h3>
                {secondDegree.length > 0 && <Badge variant="secondary" className="text-[10px]">{secondDegree.length}</Badge>}
              </div>
              {secondDegree.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No contacts mention "{company.name}" in their notes. As you log conversations, hidden connectors will surface here.
                </p>
              ) : (
                <div className="space-y-2">
                  {secondDegree.map(c => (
                    <button
                      key={c.id}
                      onClick={() => onOpenContact?.(c.id)}
                      className="w-full text-left rounded-md border bg-card p-2.5 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {c.role}{c.role && c.company ? " · " : ""}{c.company}
                          </p>
                        </div>
                        {c.networkRole && (
                          <span className="text-[10px] text-muted-foreground shrink-0">{ROLE_LABEL[c.networkRole] || c.networkRole}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Section D — Coverage history */}
            <Separator />
            <section className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coverage history</h3>
              {coverage.firstContact ? (
                <p className="text-xs text-muted-foreground">
                  First contact added{" "}
                  <span className="text-foreground font-medium">
                    {new Date(coverage.firstContact.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>{" "}
                  · {coverage.allAtCompany.length} contact{coverage.allAtCompany.length === 1 ? "" : "s"} total
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No contacts yet at {company.name}.</p>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

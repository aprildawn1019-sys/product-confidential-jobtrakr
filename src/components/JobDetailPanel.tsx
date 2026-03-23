import { useState } from "react";
import { ExternalLink, MapPin, Calendar, Clock, User, Mail, Phone, Linkedin, Users, Link2, Unlink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import type { Job, Contact } from "@/types/jobTracker";

interface JobDetailPanelProps {
  job: Job;
  linkedContacts: Contact[];
  networkMatches: Contact[];
  allContacts: Contact[];
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
  onLinkContact: (jobId: string, contactId: string) => void;
  onUnlinkContact: (jobId: string, contactId: string) => void;
}

export default function JobDetailPanel({
  job, linkedContacts, networkMatches, allContacts, onUpdateJob, onLinkContact, onUnlinkContact,
}: JobDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [poster, setPoster] = useState({
    posterName: job.posterName || "",
    posterEmail: job.posterEmail || "",
    posterPhone: job.posterPhone || "",
    posterRole: job.posterRole || "",
  });

  const handleSavePoster = () => {
    onUpdateJob(job.id, poster);
    setEditing(false);
  };

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Contacts not already linked and not in network matches
  const linkedIds = new Set(linkedContacts.map(c => c.id));
  const matchIds = new Set(networkMatches.map(c => c.id));
  const availableToLink = allContacts.filter(c => !linkedIds.has(c.id) && !matchIds.has(c.id));

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border mt-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Location</span>
          <p className="font-medium">{job.location || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Applied</span>
          <p className="font-medium">{formatDate(job.appliedDate)}</p>
        </div>
        <div>
          <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Stage Updated</span>
          <p className="font-medium">{formatDate(job.statusUpdatedAt)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Type / Salary</span>
          <p className="font-medium capitalize">{job.type}{job.salary ? ` · ${job.salary}` : ""}</p>
        </div>
      </div>

      {job.url && (
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <ExternalLink className="h-3.5 w-3.5" />View Job Posting
        </a>
      )}

      {/* Poster / Recruiter Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Recruiter / Hiring Manager</h4>
          <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
        </div>
        {editing ? (
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Name" value={poster.posterName} onChange={e => setPoster(p => ({ ...p, posterName: e.target.value }))} className="h-8 text-sm" />
            <Input placeholder="Role" value={poster.posterRole} onChange={e => setPoster(p => ({ ...p, posterRole: e.target.value }))} className="h-8 text-sm" />
            <Input placeholder="Email" value={poster.posterEmail} onChange={e => setPoster(p => ({ ...p, posterEmail: e.target.value }))} className="h-8 text-sm" />
            <Input placeholder="Phone" value={poster.posterPhone} onChange={e => setPoster(p => ({ ...p, posterPhone: e.target.value }))} className="h-8 text-sm" />
            <Button size="sm" onClick={handleSavePoster} className="col-span-2">Save</Button>
          </div>
        ) : (
          <div className="text-sm">
            {job.posterName ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{job.posterName}</span>
                {job.posterRole && <span className="text-muted-foreground">{job.posterRole}</span>}
                {job.posterEmail && (
                  <a href={`mailto:${job.posterEmail}`} className="flex items-center gap-1 text-primary hover:underline">
                    <Mail className="h-3 w-3" />{job.posterEmail}
                  </a>
                )}
                {job.posterPhone && (
                  <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{job.posterPhone}</span>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground italic">No recruiter info added yet</p>
            )}
          </div>
        )}
      </div>

      {/* Network Connections */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Network Connections</h4>

        {/* Linked contacts */}
        {linkedContacts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Linked Contacts</p>
            {linkedContacts.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {c.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">· {c.role} at {c.company}</span>
                  {c.linkedin && (
                    <a href={`https://${c.linkedin}`} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-3 w-3 text-muted-foreground hover:text-primary" />
                    </a>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUnlinkContact(job.id, c.id)}>
                  <Unlink className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Auto-matched by company */}
        {networkMatches.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Contacts at {job.company}</p>
            {networkMatches.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                    {c.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">· {c.role}</span>
                  <Badge variant="secondary" className="text-xs">Same Org</Badge>
                </div>
                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => onLinkContact(job.id, c.id)}>
                  <Link2 className="h-3 w-3 mr-1" />Link
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Manual link */}
        {availableToLink.length > 0 && (
          <Select onValueChange={v => onLinkContact(job.id, v)}>
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue placeholder="Link a contact..." />
            </SelectTrigger>
            <SelectContent>
              {availableToLink.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {linkedContacts.length === 0 && networkMatches.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No network connections found for this position</p>
        )}
      </div>
    </div>
  );
}

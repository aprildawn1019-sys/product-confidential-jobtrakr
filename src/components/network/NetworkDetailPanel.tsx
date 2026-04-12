import { X, ExternalLink, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NETWORK_ROLES, RELATIONSHIP_LABELS } from "@/types/jobTracker";
import WarmthBadge from "@/components/WarmthBadge";
import type { Contact, Job, TargetCompany, ContactActivity, ContactConnection, RecommendationRequest } from "@/types/jobTracker";
import { format } from "date-fns";

interface NetworkDetailPanelProps {
  type: "contact" | "company" | "job";
  data: any;
  contacts: Contact[];
  jobs: Job[];
  targetCompanies: TargetCompany[];
  activities: ContactActivity[];
  connections: (ContactConnection & { contact?: Contact })[];
  recommendations: RecommendationRequest[];
  linkedJobs: Job[];
  linkedContacts: Contact[];
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export default function NetworkDetailPanel({
  type, data, contacts, jobs, activities, connections, recommendations, linkedJobs, linkedContacts, onClose, onNavigate,
}: NetworkDetailPanelProps) {
  if (!data) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-80 border-l border-border bg-card z-20 overflow-y-auto shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-display font-semibold text-sm truncate">{data.label || data.name || data.title}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4 text-sm">
        {type === "contact" && (
          <>
            <div className="space-y-1">
              <p className="text-muted-foreground">{data.role} at {data.company}</p>
              {data.warmth && <WarmthBadge warmth={data.warmth} />}
              {data.networkRole && (
                <Badge variant="outline" className="text-[10px]">
                  {NETWORK_ROLES.find(r => r.value === data.networkRole)?.emoji}{" "}
                  {NETWORK_ROLES.find(r => r.value === data.networkRole)?.label}
                </Badge>
              )}
              {data.lastContactedAt && (
                <p className="text-xs text-muted-foreground">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Last contact: {format(new Date(data.lastContactedAt), "MMM d, yyyy")}
                </p>
              )}
            </div>

            {recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-xs mb-1">Referrals</h4>
                {recommendations.map(r => (
                  <div key={r.id} className="flex items-center gap-1 text-xs">
                    <Badge variant={r.status === "received" ? "success" : r.status === "pending" ? "warning" : "secondary"} className="text-[10px]">
                      {r.status}
                    </Badge>
                    <span className="text-muted-foreground">requested {format(new Date(r.requestedAt), "MMM d")}</span>
                  </div>
                ))}
              </div>
            )}

            {connections.length > 0 && (
              <div>
                <h4 className="font-medium text-xs mb-1">Connections ({connections.length})</h4>
                {connections.slice(0, 5).map(c => (
                  <div key={c.id} className="text-xs text-muted-foreground flex gap-1 items-center">
                    <span className="font-medium text-foreground">{c.contact?.name}</span>
                    {c.relationshipLabel && (
                      <span className="text-[10px]">({RELATIONSHIP_LABELS.find(l => l.value === c.relationshipLabel)?.label})</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {linkedJobs.length > 0 && (
              <div>
                <h4 className="font-medium text-xs mb-1">Linked Jobs</h4>
                {linkedJobs.map(j => (
                  <div key={j.id} className="text-xs text-muted-foreground">
                    {j.title} — {j.company}
                  </div>
                ))}
              </div>
            )}

            {activities.length > 0 && (
              <div>
                <h4 className="font-medium text-xs mb-1">Recent Activity</h4>
                {activities.slice(0, 5).map(a => (
                  <div key={a.id} className="flex gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>{a.activityType} — {a.activityDate}</span>
                  </div>
                ))}
              </div>
            )}

            <Button size="sm" variant="outline" className="w-full text-xs gap-1" onClick={() => onNavigate(`/contacts?highlight=${data.id}`)}>
              <ExternalLink className="h-3 w-3" /> View Full Profile
            </Button>
          </>
        )}

        {type === "company" && (
          <>
            <div className="space-y-1">
              {data.isTarget && (
                <Badge variant="warning" className="text-[10px]">★ {data.priority} target</Badge>
              )}
              <p className="text-xs text-muted-foreground">{linkedContacts.length} contacts · {linkedJobs.length} jobs</p>
            </div>

            {linkedContacts.length > 0 && (
              <div>
                <h4 className="font-medium text-xs mb-1">People</h4>
                {linkedContacts.map(c => (
                  <div key={c.id} className="text-xs text-muted-foreground">
                    {c.name} — {c.role}
                  </div>
                ))}
              </div>
            )}

            {linkedJobs.length > 0 && (
              <div>
                <h4 className="font-medium text-xs mb-1">Open Roles</h4>
                {linkedJobs.map(j => (
                  <div key={j.id} className="text-xs text-muted-foreground">
                    {j.title} ({j.status})
                  </div>
                ))}
              </div>
            )}

            {data.targetId && (
              <Button size="sm" variant="outline" className="w-full text-xs gap-1" onClick={() => onNavigate("/target-companies")}>
                <ExternalLink className="h-3 w-3" /> View Target Company
              </Button>
            )}
          </>
        )}

        {type === "job" && (
          <>
            <div className="space-y-1">
              <p className="text-muted-foreground">{data.company}</p>
              <Badge variant={data.status === "offer" ? "success" : data.status === "rejected" ? "destructive" : "info"} className="text-[10px]">
                {data.status}
              </Badge>
              {data.fitScore && <p className="text-xs">Fit: {data.fitScore}/5</p>}
              {data.appliedDate && <p className="text-xs text-muted-foreground">Applied: {data.appliedDate}</p>}
            </div>

            {linkedContacts.length > 0 && (
              <div>
                <h4 className="font-medium text-xs mb-1">Connected Contacts</h4>
                {linkedContacts.map(c => (
                  <div key={c.id} className="text-xs text-muted-foreground">
                    {c.name} — {c.role}
                  </div>
                ))}
              </div>
            )}

            <Button size="sm" variant="outline" className="w-full text-xs gap-1" onClick={() => onNavigate(`/jobs/${data.id}`)}>
              <ExternalLink className="h-3 w-3" /> View Job CRM
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

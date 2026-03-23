import { useState } from "react";
import { MapPin, ExternalLink, Trash2, LayoutList, Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import AddJobDialog from "@/components/AddJobDialog";
import JobKanban from "@/components/JobKanban";
import type { Job, JobStatus } from "@/types/jobTracker";

interface JobsProps {
  jobs: Job[];
  onAdd: (job: Omit<Job, "id" | "createdAt">) => void;
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onDelete: (id: string) => void;
}

export default function Jobs({ jobs, onAdd, onUpdateStatus, onDelete }: JobsProps) {
  const [view, setView] = useState<"list" | "kanban">("list");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Job Postings</h1>
          <p className="mt-1 text-muted-foreground">{jobs.length} positions tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setView("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setView("kanban")}
            >
              <Kanban className="h-4 w-4" />
            </Button>
          </div>
          <AddJobDialog onAdd={onAdd} />
        </div>
      </div>

      {view === "kanban" ? (
        <JobKanban jobs={jobs} onUpdateStatus={onUpdateStatus} onDelete={onDelete} />
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-display font-semibold text-lg">{job.title}</h3>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="text-muted-foreground mt-1">{job.company}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                    <span className="capitalize">{job.type}</span>
                    {job.salary && <span>{job.salary}</span>}
                    {job.appliedDate && <span>Applied {job.appliedDate}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={job.status} onValueChange={v => onUpdateStatus(job.id, v as JobStatus)}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["saved", "applied", "screening", "interviewing", "offer", "rejected", "withdrawn"] as const).map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {job.url && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={job.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => onDelete(job.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

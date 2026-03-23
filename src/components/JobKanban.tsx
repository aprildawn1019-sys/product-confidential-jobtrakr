import { MapPin, ExternalLink, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import type { Job, JobStatus } from "@/types/jobTracker";

const columns: { status: JobStatus; label: string }[] = [
  { status: "saved", label: "Saved" },
  { status: "applied", label: "Applied" },
  { status: "screening", label: "Screening" },
  { status: "interviewing", label: "Interviewing" },
  { status: "offer", label: "Offer" },
  { status: "rejected", label: "Rejected" },
  { status: "withdrawn", label: "Withdrawn" },
];

interface JobKanbanProps {
  jobs: Job[];
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onDelete: (id: string) => void;
}

export default function JobKanban({ jobs, onUpdateStatus, onDelete }: JobKanbanProps) {
  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData("text/plain", jobId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: JobStatus) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData("text/plain");
    if (jobId) {
      onUpdateStatus(jobId, status);
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
      {columns.map(col => {
        const colJobs = jobs.filter(j => j.status === col.status);
        return (
          <div
            key={col.status}
            className="flex-shrink-0 w-64 flex flex-col rounded-xl border border-border bg-muted/30"
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, col.status)}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <StatusBadge status={col.status} />
                <span className="text-xs text-muted-foreground font-medium">{colJobs.length}</span>
              </div>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {colJobs.map(job => (
                <div
                  key={job.id}
                  draggable
                  onDragStart={e => handleDragStart(e, job.id)}
                  className="rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start gap-1.5">
                    <GripVertical className="h-3.5 w-3.5 mt-0.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{job.title}</h4>
                      <p className="text-xs text-muted-foreground truncate">{job.company}</p>
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{job.location}</span>
                      </div>
                      {job.salary && (
                        <p className="text-xs text-muted-foreground mt-1">{job.salary}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {job.url && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                        <a href={job.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(job.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {colJobs.length === 0 && (
                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

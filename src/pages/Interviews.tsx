import { useState } from "react";
import { format, parseISO, isToday, isTomorrow, isThisWeek, isPast, isFuture } from "date-fns";
import { Calendar as CalendarIcon, Clock, Plus, Trash2, CheckCircle2, XCircle, Filter, Briefcase, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Job, Interview } from "@/types/jobTracker";

interface InterviewsPageProps {
  jobs: Job[];
  interviews: Interview[];
  onAdd: (interview: Omit<Interview, "id">) => void;
  onUpdate: (id: string, updates: Partial<Interview>) => void;
  onDelete: (id: string) => void;
}

const typeColors: Record<string, string> = {
  phone: "bg-blue-500/10 text-blue-700 border-blue-200",
  technical: "bg-purple-500/10 text-purple-700 border-purple-200",
  behavioral: "bg-amber-500/10 text-amber-700 border-amber-200",
  onsite: "bg-green-500/10 text-green-700 border-green-200",
  final: "bg-red-500/10 text-red-700 border-red-200",
};

export default function InterviewsPage({ jobs, interviews, onAdd, onUpdate, onDelete }: InterviewsPageProps) {
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newInterview, setNewInterview] = useState({
    jobId: "", type: "phone" as Interview["type"], date: "", time: "", notes: "",
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const filtered = interviews.filter(i => {
    if (filter === "upcoming") return i.status === "scheduled";
    if (filter === "completed") return i.status === "completed";
    if (filter === "cancelled") return i.status === "cancelled";
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.status === "scheduled" && b.status !== "scheduled") return -1;
    if (b.status === "scheduled" && a.status !== "scheduled") return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const handleAdd = () => {
    if (!newInterview.jobId || !newInterview.date) return;
    onAdd({ ...newInterview, status: "scheduled" });
    setNewInterview({ jobId: "", type: "phone", date: "", time: "", notes: "" });
    setSelectedDate(undefined);
    setDialogOpen(false);
  };

  const getDateLabel = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return "Today";
      if (isTomorrow(d)) return "Tomorrow";
      return format(d, "EEE, MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const interviewDates = new Set(interviews.filter(i => i.status === "scheduled").map(i => {
    try { return format(parseISO(i.date), "yyyy-MM-dd"); } catch { return ""; }
  }));

  const upcomingCount = interviews.filter(i => i.status === "scheduled").length;
  const completedCount = interviews.filter(i => i.status === "completed").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Interviews</h1>
          <p className="mt-1 text-muted-foreground">
            {upcomingCount} upcoming · {completedCount} completed
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Schedule Interview</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Interview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Job</Label>
                <Select value={newInterview.jobId} onValueChange={v => setNewInterview(f => ({ ...f, jobId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a job..." /></SelectTrigger>
                  <SelectContent>
                    {jobs.filter(j => !["rejected", "withdrawn"].includes(j.status)).map(j => (
                      <SelectItem key={j.id} value={j.id}>{j.title} — {j.company}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newInterview.type} onValueChange={v => setNewInterview(f => ({ ...f, type: v as Interview["type"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone Screen</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="final">Final Round</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={newInterview.time}
                    onChange={e => setNewInterview(f => ({ ...f, time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={d => {
                        setSelectedDate(d);
                        if (d) setNewInterview(f => ({ ...f, date: format(d, "yyyy-MM-dd") }));
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newInterview.notes}
                  onChange={e => setNewInterview(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Interviewer name, prep notes, etc."
                  rows={3}
                />
              </div>
              <Button onClick={handleAdd} disabled={!newInterview.jobId || !newInterview.date} className="w-full">
                Schedule Interview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter & Calendar Overview */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            {(["all", "upcoming", "completed", "cancelled"] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>

          {/* Interview List */}
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalendarIcon className="h-10 w-10 mb-3" />
              <p className="text-lg font-medium">No interviews {filter !== "all" ? filter : "yet"}</p>
              <p className="text-sm">Schedule your first interview to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map(interview => {
                const job = jobs.find(j => j.id === interview.jobId);
                const isUpcoming = interview.status === "scheduled";
                return (
                  <div
                    key={interview.id}
                    className={cn(
                      "rounded-xl border bg-card p-4 transition-all",
                      isUpcoming ? "border-border" : "border-border/50 opacity-75"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs capitalize", typeColors[interview.type])}>
                            {interview.type}
                          </Badge>
                          <Badge variant={interview.status === "scheduled" ? "default" : interview.status === "completed" ? "secondary" : "destructive"} className="text-xs capitalize">
                            {interview.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-sm">{job?.title || "Unknown Job"}</span>
                          <span className="text-sm text-muted-foreground">at {job?.company || "Unknown"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {getDateLabel(interview.date)}
                          </span>
                          {interview.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {interview.time}
                            </span>
                          )}
                        </div>
                        {interview.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{interview.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {isUpcoming && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Add to Google Calendar"
                              onClick={() => {
                                const startDate = interview.date.replace(/-/g, "");
                                const startTime = interview.time ? interview.time.replace(":", "") + "00" : "090000";
                                const endH = interview.time ? String(parseInt(interview.time.split(":")[0]) + 1).padStart(2, "0") : "10";
                                const endTime = endH + (interview.time ? interview.time.split(":")[1] : "00") + "00";
                                const title = encodeURIComponent(`${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} Interview — ${job?.title || "Job"} at ${job?.company || "Company"}`);
                                const details = encodeURIComponent(interview.notes || "");
                                const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}T${startTime}/${startDate}T${endTime}&details=${details}`;
                                window.open(url, "_blank");
                              }}
                            >
                              <CalendarIcon className="h-4 w-4 text-primary" />
                            </Button>
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Mark completed"
                              onClick={() => onUpdate(interview.id, { status: "completed" })}
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Cancel"
                              onClick={() => onUpdate(interview.id, { status: "cancelled" })}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Delete"
                          onClick={() => onDelete(interview.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Calendar sidebar */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-display font-semibold text-sm mb-3">Interview Calendar</h3>
          <Calendar
            mode="single"
            className={cn("p-0 pointer-events-auto")}
            modifiers={{
              interview: (date) => interviewDates.has(format(date, "yyyy-MM-dd")),
            }}
            modifiersClassNames={{
              interview: "bg-primary/20 text-primary font-bold rounded-full",
            }}
          />
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-3 w-3 rounded-full bg-primary/20" />
            Scheduled interview
          </div>
        </div>
      </div>
    </div>
  );
}

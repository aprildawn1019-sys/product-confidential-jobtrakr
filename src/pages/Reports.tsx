import { Download, FileSpreadsheet, Briefcase, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { downloadJobsCsv } from "@/lib/jobsCsvExport";
import { downloadContactsCsv } from "@/lib/contactsCsvExport";
import { downloadInterviewsCsv } from "@/lib/interviewsCsvExport";
import { useJobTrackerStore } from "@/stores/jobTrackerStore";
import { companiesMatch } from "@/stores/jobTrackerStore";
import type { Job } from "@/types/jobTracker";
import { useMemo } from "react";

interface ExportSection {
  id: string;
  title: string;
  description: string;
  icon: typeof Briefcase;
  count: number;
  countLabel: string;
  onExport: () => void;
}

export default function Reports() {
  const store = useJobTrackerStore();
  const { toast } = useToast();

  const getTargetForJob = useMemo(() => {
    const priorityOrder: Record<string, number> = { dream: 0, strong: 1, interested: 2 };
    return (job: Job) => {
      const matches = store.targetCompanies.filter(tc => companiesMatch(tc.name, job.company));
      if (matches.length === 0) return undefined;
      return matches.sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99))[0];
    };
  }, [store.targetCompanies]);

  const sections: ExportSection[] = [
    {
      id: "jobs",
      title: "Job Pipeline",
      description: "All tracked jobs with status, priority, applied date, linked contacts, interview history, and activity counts.",
      icon: Briefcase,
      count: store.jobs.length,
      countLabel: "jobs",
      onExport: () => {
        if (store.jobs.length === 0) {
          toast({ title: "Nothing to export", description: "You haven't added any jobs yet." });
          return;
        }
        const count = downloadJobsCsv({
          jobs: store.jobs,
          interviews: store.interviews,
          getContactsForJob: store.getContactsForJob,
          getJobActivitiesForJob: store.getJobActivitiesForJob,
          getTargetForJob,
        });
        toast({ title: "Export ready", description: `${count} job${count === 1 ? "" : "s"} exported to CSV.` });
      },
    },
    {
      id: "contacts",
      title: "Connections",
      description: "All contacts with company, role, warmth, follow-up date, campaigns, linked jobs, activity history, and recommendation requests.",
      icon: Users,
      count: store.contacts.length,
      countLabel: "contacts",
      onExport: () => {
        if (store.contacts.length === 0) {
          toast({ title: "Nothing to export", description: "You haven't added any contacts yet." });
          return;
        }
        const count = downloadContactsCsv({
          contacts: store.contacts,
          campaigns: store.campaigns,
          jobs: store.jobs,
          getConnectionsForContact: store.getConnectionsForContact,
          getActivitiesForContact: store.getActivitiesForContact,
          getCampaignsForContact: store.getCampaignsForContact,
          getJobsForContact: store.getJobsForContact,
          getRecommendationRequestsForContact: store.getRecommendationRequestsForContact,
        });
        toast({ title: "Export ready", description: `${count} contact${count === 1 ? "" : "s"} exported to CSV.` });
      },
    },
    {
      id: "interviews",
      title: "Interviews",
      description: "All scheduled and completed interviews with date, type, status, the related job, and linked contacts.",
      icon: CalendarDays,
      count: store.interviews.length,
      countLabel: "interviews",
      onExport: () => {
        if (store.interviews.length === 0) {
          toast({ title: "Nothing to export", description: "You haven't scheduled any interviews yet." });
          return;
        }
        const count = downloadInterviewsCsv({
          interviews: store.interviews,
          jobs: store.jobs,
          getContactsForJob: store.getContactsForJob,
        });
        toast({ title: "Export ready", description: `${count} interview${count === 1 ? "" : "s"} exported to CSV.` });
      },
    },
  ];

  const exportAll = () => {
    let total = 0;
    sections.forEach(s => {
      if (s.count > 0) {
        s.onExport();
        total += s.count;
      }
    });
    if (total === 0) {
      toast({ title: "Nothing to export", description: "Add some data first, then come back." });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Settings</p>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2 mt-1">
            <FileSpreadsheet className="h-7 w-7 text-primary" />
            Data &amp; Export
          </h1>
          <p className="mt-1 text-muted-foreground">
            Download full backups of your job search. For exporting a filtered view of jobs, contacts, or interviews,
            use the <span className="font-medium text-foreground">Export CSV</span> button on each list page.
          </p>
        </div>
        <Button onClick={exportAll} className="gap-2">
          <Download className="h-4 w-4" />
          Export everything
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(section => {
          const Icon = section.icon;
          const empty = section.count === 0;
          return (
            <div
              key={section.id}
              className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">{section.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {section.count} {section.countLabel}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex-1 mb-4">{section.description}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={section.onExport}
                disabled={empty}
                className="w-full gap-1.5"
              >
                <Download className="h-4 w-4" />
                {empty ? "No data yet" : "Download CSV"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">About these exports</p>
        <p>
          CSVs are encoded UTF-8 with a BOM so Excel renders accents and emoji correctly. Multi-value columns (e.g.
          linked contacts, campaigns) use <code className="text-xs">|</code> as a separator inside a single cell.
        </p>
      </div>
    </div>
  );
}

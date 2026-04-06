import { useMemo } from "react";
import { Sparkles, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import CompanyAvatar from "@/components/CompanyAvatar";
import TargetCompanyBadge from "@/components/TargetCompanyBadge";
import { companiesMatch } from "@/stores/jobTrackerStore";
import type { Job, TargetCompany, Contact } from "@/types/jobTracker";

interface RecommendationsProps {
  jobs: Job[];
  contacts: Contact[];
  targetCompanies: TargetCompany[];
  onAddJob: (job: Omit<Job, "id" | "createdAt">) => void;
}

interface ScoredJob {
  job: Job;
  score: number;
  reasons: string[];
  target?: TargetCompany;
}

export default function Recommendations({ jobs, contacts, targetCompanies, onAddJob }: RecommendationsProps) {
  const recommendations = useMemo(() => {
    const scored: ScoredJob[] = jobs
      .filter(j => !["rejected", "withdrawn", "closed"].includes(j.status))
      .map(job => {
        let score = 50;
        const reasons: string[] = [];

        // Target company boost (+20)
        const target = targetCompanies.find(tc => tc.status !== "archived" && companiesMatch(tc.name, job.company));
        if (target) {
          const boost = target.priority === "dream" ? 20 : target.priority === "strong" ? 15 : 10;
          score += boost;
          reasons.push(`${target.priority === "dream" ? "🌟 Dream" : target.priority === "strong" ? "💪 Strong" : "👀 Interested"} target company`);
        }

        // Fit score boost
        if (job.fitScore) {
          score += job.fitScore * 4;
          if (job.fitScore >= 4) reasons.push("High fit score");
        }

        // Urgency boost
        if (job.urgency === "high") { score += 10; reasons.push("High urgency posting"); }
        else if (job.urgency === "medium") { score += 5; }

        // Active status boost
        if (["applied", "screening", "interviewing"].includes(job.status)) {
          score += 8;
          reasons.push("Active in pipeline");
        }
        if (job.status === "offer") { score += 15; reasons.push("Has offer"); }

        // Has contacts at company
        const companyContacts = contacts.filter(c => companiesMatch(c.company, job.company));
        if (companyContacts.length > 0) {
          score += 5 * Math.min(companyContacts.length, 3);
          reasons.push(`${companyContacts.length} contact${companyContacts.length > 1 ? "s" : ""} at company`);
        }

        // Remote preference
        if (job.type === "remote") { score += 3; }

        // Has description (more info = better)
        if (job.description) { score += 2; }

        // Cap at 99
        score = Math.min(score, 99);

        if (reasons.length === 0) reasons.push("Matches your tracked criteria");

        return { job, score, reasons, target };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    return scored;
  }, [jobs, contacts, targetCompanies]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 70) return "bg-blue-100 text-blue-800 border-blue-300";
    if (score >= 55) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-accent" />
          <h1 className="font-display text-3xl font-bold tracking-tight">Recommended Jobs</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Jobs ranked by target company match, fit score, urgency, and network connections.
        </p>
      </div>

      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No recommendations yet</h3>
            <p className="text-sm text-muted-foreground">Add jobs to your tracker and target companies to get personalized recommendations.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recommendations.map(({ job, score, reasons, target }) => (
            <div key={job.id} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3 flex-1 min-w-0">
                  <CompanyAvatar company={job.company} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-semibold text-lg">{job.title}</h3>
                      <Badge variant="outline" className={`text-xs ${getScoreColor(score)}`}>{score}% match</Badge>
                      <TargetCompanyBadge target={target} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                      <span>{job.company}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location || "Not specified"}</span>
                      <span>·</span>
                      <span className="capitalize">{job.type}</span>
                    </div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {reasons.map(reason => (
                        <Badge key={reason} variant="secondary" className="text-[11px]">{reason}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {job.url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={job.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />View
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

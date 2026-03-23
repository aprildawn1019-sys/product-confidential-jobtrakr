import { Sparkles, ExternalLink, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const RECOMMENDED_JOBS = [
  { id: "r1", title: "Senior React Engineer", company: "Shopify", location: "Remote", match: 95, tags: ["React", "TypeScript", "GraphQL"], reason: "Matches your frontend expertise and remote preference" },
  { id: "r2", title: "Staff Frontend Developer", company: "Atlassian", location: "San Francisco, CA", match: 88, tags: ["React", "Performance", "Design Systems"], reason: "Strong match for your design system experience" },
  { id: "r3", title: "Full Stack Engineer", company: "Supabase", location: "Remote", match: 85, tags: ["TypeScript", "PostgreSQL", "React"], reason: "Aligns with your full-stack skills" },
  { id: "r4", title: "Frontend Architect", company: "Airbnb", location: "San Francisco, CA", match: 82, tags: ["Architecture", "React", "Testing"], reason: "Senior-level role matching your experience" },
  { id: "r5", title: "Product Engineer", company: "Cal.com", location: "Remote", match: 79, tags: ["Next.js", "TypeScript", "Open Source"], reason: "Open-source focused, remote-first" },
];

export default function Recommendations() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-accent" />
          <h1 className="font-display text-3xl font-bold tracking-tight">Recommended Jobs</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Jobs matched to your profile and preferences</p>
      </div>

      <div className="space-y-4">
        {RECOMMENDED_JOBS.map(job => (
          <div key={job.id} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-display font-semibold text-lg">{job.title}</h3>
                  <Badge variant="success">{job.match}% match</Badge>
                </div>
                <p className="text-muted-foreground mt-1">{job.company} · {job.location}</p>
                <p className="text-sm text-muted-foreground mt-2 italic">"{job.reason}"</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {job.tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm"><Bookmark className="h-3.5 w-3.5 mr-1" />Save</Button>
                <Button size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />View</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

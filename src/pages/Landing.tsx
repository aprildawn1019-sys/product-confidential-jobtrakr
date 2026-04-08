import { useNavigate } from "react-router-dom";
import { Briefcase, BarChart3, Users, CalendarCheck, Brain, FileText, ArrowRight, Star, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import dashboardMockup from "@/assets/dashboard-mockup.jpg";

const features = [
  {
    icon: Briefcase,
    title: "Job Tracking",
    description: "List & Kanban views with drag-and-drop. Track status, match scores, and priority across your pipeline.",
  },
  {
    icon: Target,
    title: "Target Companies",
    description: "Build a shortlist of dream employers and track your pipeline per company with priority-based organization.",
  },
  {
    icon: Users,
    title: "Network CRM",
    description: "Manage contacts, track relationship warmth, log activities, and never miss a follow-up.",
  },
  {
    icon: CalendarCheck,
    title: "Interview Scheduling",
    description: "Schedule and manage interviews with calendar views and automated reminders.",
  },
  {
    icon: Brain,
    title: "AI-Powered Search",
    description: "Discover roles matched to your profile with AI-driven job search and recommendations.",
  },
  {
    icon: Sparkles,
    title: "Cover Letters",
    description: "Generate tailored cover letters instantly from your profile and any job description using AI.",
  },
  {
    icon: BarChart3,
    title: "Skills Insights",
    description: "Analyze trending skills across your tracked jobs to guide your professional development.",
  },
  {
    icon: FileText,
    title: "Job CRM",
    description: "Dedicated per-job pages with activity timelines, contact linking, and conversation tracking.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Briefcase className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">JobTrackr</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="sm:size-default" onClick={() => navigate("/auth?mode=login")}>
            Sign In
          </Button>
          <Button size="sm" className="sm:size-default" onClick={() => navigate("/auth?mode=signup")}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 sm:px-6 pt-10 sm:pt-16 pb-14 sm:pb-20 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent mb-4 sm:mb-6">
            <Star className="h-3 w-3 fill-accent text-accent" />
            Your job search command center
          </div>
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
            Track every opportunity.
            <br />
            <span className="text-primary">Land your next role.</span>
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            JobTrackr brings your entire job search into one place — applications, contacts, interviews, and insights — so you can focus on what matters.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 sm:mt-8">
            <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-6" onClick={() => navigate("/auth?mode=signup")}>
              Start Tracking <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-6" onClick={() => navigate("/auth?mode=login")}>
              Sign In
            </Button>
          </div>
        </div>

        {/* Hero Mockup */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none rounded-b-2xl" />
          <div className="rounded-2xl border border-border shadow-2xl overflow-hidden bg-card">
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-muted/50 border-b border-border">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-warning/60" />
              <div className="h-3 w-3 rounded-full bg-success/60" />
              <span className="ml-3 text-xs text-muted-foreground font-medium">JobTrackr — Dashboard</span>
            </div>
            <img
              src={dashboardMockup}
              alt="JobTrackr Dashboard showing job tracking pipeline, priority widgets, and company avatars"
              className="w-full"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-6 py-14 sm:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Everything you need to manage your job search
            </h2>
            <p className="mt-3 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              From first application to final offer, JobTrackr keeps you organized and in control.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-5 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-14 sm:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Ready to take control of your job search?
          </h2>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg">
            Join JobTrackr and never lose track of an opportunity again.
          </p>
          <Button size="lg" className="mt-6 sm:mt-8 w-full sm:w-auto gap-2 text-base px-8" onClick={() => navigate("/auth?mode=signup")}>
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-6 sm:py-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span>JobTrackr</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/aprildawn1019-sys/product-confidential-jobtrakr" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
            <span>Built with <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Lovable</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
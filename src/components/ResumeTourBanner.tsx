import { useEffect, useState } from "react";
import { PlayCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearTourProgress,
  getTourProgress,
  type TourProgress,
} from "@/components/OnboardingTour";

interface ResumeTourBannerProps {
  /** True while the tour is actively running — banner stays hidden in that case. */
  tourRunning: boolean;
}

/**
 * Small floating banner that surfaces when the user paused the onboarding
 * tour mid-flow. Lets them pick up where they left off from any page.
 */
export default function ResumeTourBanner({ tourRunning }: ResumeTourBannerProps) {
  const [progress, setProgress] = useState<TourProgress | null>(() => getTourProgress());

  useEffect(() => {
    const sync = () => setProgress(getTourProgress());
    window.addEventListener("jobtrakr:tour-progress-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("jobtrakr:tour-progress-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Re-read once the tour stops running, in case it just paused.
  useEffect(() => {
    if (!tourRunning) setProgress(getTourProgress());
  }, [tourRunning]);

  if (tourRunning || !progress) return null;

  const handleResume = () => {
    window.dispatchEvent(new Event("jobtrakr:start-tour"));
  };

  const handleDismiss = () => {
    clearTourProgress();
    setProgress(null);
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-2xl border border-accent/30 bg-card/95 p-3 pl-4 pr-2 shadow-lg backdrop-blur-sm animate-fade-in sm:bottom-6 sm:right-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground">
        <PlayCircle className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">Resume the tour</div>
        <div className="text-xs text-muted-foreground">
          Paused at step {progress.step} of {progress.total}
        </div>
      </div>
      <Button
        size="sm"
        onClick={handleResume}
        className="ml-2 bg-accent text-accent-foreground hover:bg-accent/90"
      >
        Resume
      </Button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss resume tour banner"
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

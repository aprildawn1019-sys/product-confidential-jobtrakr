import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step, EVENTS, ACTIONS } from "react-joyride";
import { useNavigate, useLocation } from "react-router-dom";

const STORAGE_KEY = "jobtrakr.onboardingTour.completed.v1";

export function hasCompletedTour() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markTourCompleted() {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // ignore
  }
}

export function resetTour() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

interface OnboardingTourProps {
  run: boolean;
  onFinish: () => void;
}

/**
 * Non-linear onboarding tour highlighting the three primary entry points
 * into the Jobtrakr workflow:
 *   1. AI Job Search   2. Network / Contacts   3. Target Companies
 *
 * The tour navigates between routes between steps so users see each page
 * in context, then returns them to the dashboard.
 */
export default function OnboardingTour({ run, onFinish }: OnboardingTourProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);

  // Reset to first step whenever the tour is (re)started.
  useEffect(() => {
    if (run) setStepIndex(0);
  }, [run]);

  const steps: (Step & { route?: string })[] = [
    {
      target: "body",
      placement: "center",
      title: "Welcome to Jobtrakr 👋",
      content:
        "Your job search isn't linear — and neither is Jobtrakr. There are three natural starting points. Let's walk through each so you can pick the one that fits how you're approaching your search today.",
      disableBeacon: true,
      route: "/getting-started",
    },
    {
      target: '[data-tour="entry-job-search"]',
      title: "Entry 1 — Search for jobs",
      content:
        "Start here if you already know the kind of role you want. AI Job Search, Job Boards, and Bulk Import all feed directly into your tracker.",
      placement: "bottom",
      disableBeacon: true,
      route: "/getting-started",
    },
    {
      target: '[data-tour="page-job-search"]',
      title: "AI Job Search in action",
      content:
        "Tune your profile and Jobtrakr surfaces matching roles. Add the ones you like to your pipeline with one click.",
      placement: "bottom",
      disableBeacon: true,
      route: "/job-search",
    },
    {
      target: '[data-tour="entry-network"]',
      title: "Entry 2 — Network first",
      content:
        "Prefer relationship-driven searches? Add contacts, log conversations, and let opportunities surface from your network.",
      placement: "bottom",
      disableBeacon: true,
      route: "/getting-started",
    },
    {
      target: '[data-tour="page-network"]',
      title: "Your Network Map",
      content:
        "Visualize how your contacts cluster around companies and jobs. Spot warm intros and find gaps to bridge.",
      placement: "bottom",
      disableBeacon: true,
      route: "/network-map",
    },
    {
      target: '[data-tour="entry-target-companies"]',
      title: "Entry 3 — Start with target companies",
      content:
        "Have a dream-employer shortlist? Add them here, set priorities, then discover roles and contacts within each company.",
      placement: "bottom",
      disableBeacon: true,
      route: "/getting-started",
    },
    {
      target: '[data-tour="page-target-companies"]',
      title: "Target Companies",
      content:
        "Track your pipeline per company. Every job you save and every contact you add gets linked back here automatically.",
      placement: "bottom",
      disableBeacon: true,
      route: "/target-companies",
    },
    {
      target: "body",
      placement: "center",
      title: "It all converges 🎯",
      content:
        "Whichever entry point you choose, jobs land in your Pipeline, contacts in your Network, and interviews on your Schedule. Pick a starting point and dive in!",
      disableBeacon: true,
      route: "/getting-started",
    },
  ];

  // Navigate to the route a step expects before showing it.
  useEffect(() => {
    if (!run) return;
    const step = steps[stepIndex];
    if (step?.route && step.route !== location.pathname) {
      navigate(step.route);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, stepIndex]);

  const finishTour = () => {
    markTourCompleted();
    setStepIndex(0);
    onFinish();
  };

  const handleCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data;

    // Joyride fires FINISHED/SKIPPED on terminal status — close the modal.
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      finishTour();
      return;
    }

    // User clicked Close (X) at any point.
    if (action === ACTIONS.CLOSE) {
      finishTour();
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      // Last step + Next click → finish.
      if (action === ACTIONS.NEXT && index === steps.length - 1) {
        finishTour();
        return;
      }
      const next = action === ACTIONS.PREV ? index - 1 : index + 1;
      setStepIndex(Math.max(0, Math.min(next, steps.length - 1)));
    }

    // If the target isn't in the DOM yet (route still mounting), don't skip —
    // poll until it appears, then let Joyride re-render the same step.
    if (type === EVENTS.TARGET_NOT_FOUND) {
      const step = steps[index];
      const selector = typeof step?.target === "string" ? step.target : null;
      if (!selector || selector === "body") return;
      let attempts = 0;
      const poll = window.setInterval(() => {
        attempts += 1;
        if (document.querySelector(selector) || attempts > 20) {
          window.clearInterval(poll);
          // Force Joyride to re-evaluate by nudging stepIndex.
          setStepIndex((i) => i);
        }
      }, 150);
    }
  };

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      stepIndex={stepIndex}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      callback={handleCallback}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip tour",
      }}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          backgroundColor: "hsl(var(--popover))",
          textColor: "hsl(var(--popover-foreground))",
          arrowColor: "hsl(var(--popover))",
          overlayColor: "hsl(var(--background) / 0.7)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          fontSize: 14,
        },
        tooltipTitle: {
          fontSize: 16,
          fontWeight: 600,
        },
        buttonNext: {
          borderRadius: 8,
          padding: "8px 14px",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
      }}
    />
  );
}

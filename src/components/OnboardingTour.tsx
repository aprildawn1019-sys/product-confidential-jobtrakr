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
        "Quick intro before we dive in: your job search isn't linear, so Jobtrakr gives you four ways to start. We'll point them out — pick whichever matches how you're working today.",
      disableBeacon: true,
      route: "/getting-started",
    },
    {
      target: '[data-tour="entry-profile"]',
      title: "Start with your profile",
      content:
        "Add your target roles, skills, locations, and comp expectations. Your profile powers job matching, recommendations, and AI-generated cover letters across Jobtrakr.",
      placement: "bottom",
      disableBeacon: true,
      route: "/getting-started",
    },
    {
      target: '[data-tour="entry-job-search"]',
      title: "Know the role you want?",
      content:
        "Start here if you already know the kind of role you want. AI Job Search, Job Boards, and Bulk Import all feed directly into your tracker.",
      placement: "bottom",
      disableBeacon: true,
      route: "/getting-started",
    },
    {
      target: '[data-tour="entry-network"]',
      title: "Have a strong network?",
      content:
        "Prefer relationship-driven searches? Add contacts, log conversations, and let opportunities surface from your network.",
      placement: "bottom",
      disableBeacon: true,
      route: "/getting-started",
    },
    {
      target: '[data-tour="entry-target-companies"]',
      title: "Land your dream company",
      content:
        "Have a dream-employer shortlist? Add them here, set priorities, then discover roles and contacts within each company.",
      placement: "bottom",
      disableBeacon: true,
      route: "/getting-started",
    },
    {
      target: "body",
      placement: "center",
      title: "Everything flows into one pipeline 🎯",
      content:
        "No matter where you start, the data lands in the same place: roles become Jobs in your Pipeline, people become Contacts in your Network, employers roll up under Target Companies, and scheduled conversations appear on your Schedule. One unified view of your search — pick a starting point and go.",
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

  // Hold Joyride in a paused state until the expected route is mounted AND
  // the target selector exists. This avoids the "Target not mounted" race
  // where Joyride evaluates a selector before the new route renders.
  const currentStep = steps[stepIndex];
  const expectedRoute = currentStep?.route;
  const onExpectedRoute = !expectedRoute || expectedRoute === location.pathname;
  const targetSelector =
    typeof currentStep?.target === "string" ? currentStep.target : null;
  const [targetReady, setTargetReady] = useState(false);

  useEffect(() => {
    if (!run) {
      setTargetReady(false);
      return;
    }
    setTargetReady(false);
    if (!onExpectedRoute) return;
    if (!targetSelector || targetSelector === "body") {
      setTargetReady(true);
      return;
    }
    let attempts = 0;
    const poll = window.setInterval(() => {
      attempts += 1;
      if (document.querySelector(targetSelector)) {
        window.clearInterval(poll);
        setTargetReady(true);
      } else if (attempts > 40) {
        window.clearInterval(poll);
      }
    }, 100);
    return () => window.clearInterval(poll);
  }, [run, stepIndex, onExpectedRoute, targetSelector]);

  const finishTour = () => {
    markTourCompleted();
    setStepIndex(0);
    onFinish();
  };

  const handleCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      finishTour();
      return;
    }

    if (action === ACTIONS.CLOSE) {
      finishTour();
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT && index === steps.length - 1) {
        finishTour();
        return;
      }
      const next = action === ACTIONS.PREV ? index - 1 : index + 1;
      setStepIndex(Math.max(0, Math.min(next, steps.length - 1)));
    }
  };

  if (!run) return null;

  return (
    <Joyride
      key={`${stepIndex}-${targetReady ? "ready" : "wait"}`}
      steps={steps}
      stepIndex={stepIndex}
      run={run && targetReady}
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

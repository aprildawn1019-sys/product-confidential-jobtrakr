
## Add a Profile step to the onboarding tour

### Recommendation

**Where to put it:** Insert as **Step 2**, immediately after the "Welcome to Jobtrakr 👋" intro and before the three entry-path steps.

**Why this position:**
- Profile info (target roles, skills, location, comp) powers every downstream feature — AI Job Search match scoring, Recommendations, Skill Gap analysis, and Cover Letter generation.
- Front-loading it frames profile completion as the foundation, not an afterthought.
- The existing Getting Started page already shows a `ProfileCompletenessBanner` when the profile is incomplete, so the tour reinforces a UI element the user is already seeing.
- It keeps the tour on `/getting-started` (no route change), consistent with the recently consolidated 5-step flow.

**Recommended title:** **"Start with your profile"**

Alternatives, in case you prefer a different tone:
- "Tell us what you're looking for" (conversational, matches existing tour voice)
- "Set your search foundation" (purposeful, ties to downstream features)
- "Your profile powers everything" (benefit-led)

**Recommended body copy:**
> "Add your target roles, skills, locations, and comp expectations. Your profile powers job matching, recommendations, and AI-generated cover letters across Jobtrakr."

### Anchor target

Two viable anchors on `/getting-started`:
1. **`ProfileCompletenessBanner`** — only renders when profile is incomplete, so it's not a reliable anchor for returning users who replay the tour.
2. **A dedicated "Complete your profile" quick-launcher card** in the Quick launchers grid — always present, always visible.

I'll add `data-tour="profile-setup"` to the profile-related quick launcher card (or the completeness banner, falling back to the launcher when the banner is hidden). If neither exists reliably, I'll add a small always-visible "Profile" anchor near the hero CTA.

### Changes

1. **`src/pages/GettingStarted.tsx`**
   - Add `data-tour="profile-setup"` to the profile-related card (Quick launcher for Profile Editor, or the completeness banner — whichever is always rendered).

2. **`src/components/OnboardingTour.tsx`**
   - Insert a new step at index 1:
     ```ts
     {
       target: '[data-tour="profile-setup"]',
       title: "Start with your profile",
       content: "Add your target roles, skills, locations, and comp expectations. Your profile powers job matching, recommendations, and AI-generated cover letters across Jobtrakr.",
       placement: "bottom",
       disableBeacon: true,
       route: "/getting-started",
     }
     ```
   - Final 6-step sequence:
     1. Welcome to Jobtrakr 👋
     2. **Start with your profile** ← new
     3. Know the role you want?
     4. Have a strong network?
     5. Land your dream company
     6. It all converges 🎯

### Open question

Before I implement, confirm the title — "Start with your profile" is my pick, but I listed three alternatives above if you'd like a different tone.

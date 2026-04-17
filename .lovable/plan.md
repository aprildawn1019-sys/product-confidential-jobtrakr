
## Goal
Generate a **standalone HTML prototype** of the Interactive Workflow Map so the user can review the interaction design before we commit to building it into the React app. Pause the in-app implementation plan until the prototype is approved.

## Deliverable
A single self-contained file: `/mnt/documents/workflow_map_prototype.html`
- Inline CSS + vanilla JS (no build step, opens directly in a browser)
- Uses the Jobtrakr navy + amber palette from `mem://style/visual-theme` so it previews the real look
- Lucide icons via CDN for visual parity with the app

## Prototype contents

**1. Profile-completeness banner (top)**
- Toggle control to simulate 0/5, 2/5, 4/5, 5/5 profile states — reviewer can see all banner variants
- Warning style when <3, info style when 3-4, hidden when 5/5

**2. Four entry cards (2x2 on mid widths, 4-up on wide)**
- 01 Beginner Bob (Compass, neutral accent) → highlights "Profile"
- 02 Searcher Sam (Search, info) → highlights "Add to Tracker"
- 03 Networker Nora (Users, success) → highlights "Job CRM"
- 04 Targeter Tara (Star, warning) → highlights "Apply"
- Hovering a card dims the other paths on the map below and draws a glowing trail to its first funnel node

**3. Interactive SVG workflow map**
- Entry row: Profile Setup · Job Search · Contacts · Target Companies
- Funnel: Add to Tracker → Job CRM → Apply → Interview → Offer
- Side node: Rejected (with dashed loop-back arrow to entry row)
- Dashed cross-links: Network Map → Target Companies; Target Companies → Job Search; Job CRM → Contacts
- Every node is a `<button>` with hover scale, focus ring, and click-to-alert (simulating navigation: shows a toast "→ would navigate to /job-search")
- Active-node simulation: a dropdown lets reviewer pick "current page" so they see the active ring behavior

**4. Mobile preview toggle**
- Button to switch to a 375px frame so reviewer can validate the stacked layout without resizing the browser

**5. Controls bar (top-right)**
- Theme toggle (light/dark) to confirm both work
- Profile-state selector (empty / 2 of 5 / 4 of 5 / complete)
- Active-page selector (none / job-search / contacts / targets / jobs)

## QA
After generating, convert the HTML to a screenshot (headless chromium or similar) and inspect for layout issues before handing it over. Deliver as a `<lov-artifact>` so the user can open it in a new tab and click around.

## Status of the build plan
The approved Interactive Workflow Map build plan (with Beginner Bob + profile completeness) stays parked. After the user reviews the prototype and gives feedback, we'll fold any changes into the plan and then implement.

## Out of scope
- Wiring real routes (prototype uses toast alerts)
- Pulling live profile data (simulated via the state selector)
- Building any React component this turn

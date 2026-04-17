
## Goal
Create a Mermaid workflow diagram that visualizes the non-linear Jobtrakr user workflow with three entry points (Job Search, Network First, Target Companies First), showing how each path flows through the app's features and converges on application/interview/offer outcomes.

## Approach
A single `.mmd` flowchart artifact written to `/mnt/documents/`, rendered via the Mermaid artifact tag so the user can review it in-app. Theme-neutral colors (no custom classDefs that break in dark mode) — rely on subgraph grouping for visual structure.

## Diagram structure

Three labeled entry points at the top, each feeding into the central pipeline:

```text
[Entry: Job Search]   [Entry: Network First]   [Entry: Target Companies]
        |                       |                         |
   AI Job Search /         Add Contacts /            Add Target Co. /
   Job Boards /            Log Activity /            Set Priority /
   Bulk Import             Network Map               Find Jobs at Co.
        |                       |                         |
        +-----------+-----------+-------------------------+
                    v
            [ Add Job to Tracker ]
                    v
        [ Job CRM: link contacts, score, prioritize ]
                    v
   +----------------+----------------+
   |                |                |
   v                v                v
[Generate     [Schedule         [Skills Insights
 Cover         Interview]        / Profile tune]
 Letter]            |                |
   |                v                |
   +------> [ Application Pipeline ] <+
                    |
        Saved → Applied → Screening → Interviewing
                    |
            +-------+-------+
            v               v
         [Offer]        [Rejected / Withdrawn]
                            |
                    (loop back to entry points)
```

Cross-links to show non-linearity:
- Network Map → suggests new Target Companies
- Target Companies → triggers AI Job Search filtered by company
- Job CRM → prompts adding/finding new contacts (back to Network entry)
- Rejected → loops back to any entry point

## Files
- `/mnt/documents/jobtrakr_workflow.mmd` (new)

## Out of scope
- Implementing the diagram as an interactive React component
- Adding it to the app UI (this is a review artifact only)

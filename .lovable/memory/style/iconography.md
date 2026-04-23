---
name: Iconography rules
description: Sparkles icon is reserved exclusively for AI features. Per-item content uses domain icons.
type: design
---

# Iconography rules

## Sparkles icon — AI-only

The `Sparkles` lucide icon is reserved **exclusively** for surfaces that introduce or label an AI-powered feature.

**Allowed uses:**
- Section headers that label an AI-generated block (e.g. "Plan for next week" header on the AI-generated weekly plan).
- "Suggest with AI" / "Generate with AI" buttons.
- AI-feature badges and AI-source chips.

**Disallowed uses:**
- Per-item content icons inside an AI-generated list. Each item must carry a **domain-appropriate** icon based on the action's category (e.g. `Lightbulb` for strategy, `MessageCircle` for outreach, `ClipboardList` for applications, `Target` for preparation, `Compass` for follow-up). Even if the parent section is AI-generated, individual items represent real-world tasks, not AI itself.
- Card-level titles where a more specific icon exists, or where no icon is needed at all.
- Decorative use in non-AI surfaces (dashboards, empty states, marketing copy without an AI tie-in).

**Why:** Overusing Sparkles dilutes its meaning. When users see the icon, it should always tell them "this is AI" — never "this is special" or "this is generic strategy."

## Per-category icon registry (Weekly Plan, AI suggestions, etc.)

| Category    | Icon            |
|-------------|-----------------|
| outreach    | MessageCircle   |
| applications| ClipboardList   |
| follow-up   | Compass         |
| preparation | Target          |
| strategy    | Lightbulb       |

Fallback when category is unknown: `Lightbulb` (never `Sparkles`).

---
name: networking-pipeline
description: Networking Pipeline surface and outreaches entity — JTBD-driven referral tracker
type: feature
---

Networking Pipeline at `/networking` (sidebar: PIPELINE group, first item).

**JTBD:** One outcome (inside referral), three entry triggers — open jobs (Job 1), target companies (Job 2), warm contacts (Job 3).

**Entity:** `outreaches` table — links contact (required) + target_company (required) + job (optional). Stages: identified → contacted → in_conversation → referral_asked → referral_made → closed (won|lost). Store auto-stamps `referral_asked_at`, `referral_made_at`, `closed_at` on stage transitions.

**Page zones:**
1. Hot openings — active jobs with referral-path status
2. Target companies — relationship status (works without jobs)
3. Outreach in flight — Kanban over active stages

**Stage tone (pillStyles):** referral_made = amber-strong, referral_asked = amber-soft, contacted/in_conversation = navy-muted, identified/closed = slate. Keeps "Referral" stages visually dominant.

**Files:** `src/types/outreach.ts`, `src/pages/NetworkingPipeline.tsx`, `src/components/networking/OutreachDialog.tsx`. Store: `addOutreach`/`updateOutreach`/`deleteOutreach` + `getOutreachesFor{Contact,Job,TargetCompany}`.

Sidebar group rename: "Sources" → "Pipeline".

# Memory: index.md
Updated: now

# Project Memory

## Core
- **Visual spec is binding:** read `src/assets/dashboard-mockup.jpg` + `src/assets/spec-*-v2.jpg` BEFORE redesigning any surface. Do not re-derive the look.
- Linear/Notion-inspired aesthetic, navy & amber theme. No pill-within-pill status indicators.
- Page headers: big title + one-line subtitle, **no buttons in the header**. Push actions into their panel.
- Page titles are single nouns: `Jobs`, `Contacts`, `Interviews`, `Command Center`. Not `Job Pipeline`, `Connections`, `Schedule`.
- Brand wordmark is `Koudou` (Japanese for "taking a path"), amber rounded square mark in the sidebar header. Renamed from `Jobtrakr` / `JobTrackr` — internal `jobtrakr.*` localStorage keys and `jobtrakr:*` event names are intentionally kept to preserve user state across the rename.
- Sidebar IA: TODAY / PIPELINE / LIBRARY / INSIGHTS. `/` Command Center, `/insights` analytics (renamed from `/dashboard`, redirects). Settings tabbed at `/settings/{profile|data-export}`.
- Supabase Auth (registrations disabled by default). Gemini AI for edge functions.
- Terminology: Priority (Low/Medium/High, NEVER critical), Match Score (manual 1-5 stars).
- CONSTRAINT: Never use AI for match scoring. The user explicitly declined this.
- No third-party scraping services. Use Edge Function + Gemini for scraping.
- Exclude gated job boards from auto-searches; use manual check workflow.
- Branding: 'Koudou' by Product Confidential. PolyForm Noncommercial 1.0.0.

## Memories
- [Visual Theme v2 (BINDING)](mem://style/visual-theme-v2) — Calm Operations spec; lists every spec asset and the rules they encode
- [Command Center & Dashboard](mem://features/dashboard-analytics) — Layout rules anchored to dashboard-mockup.jpg
- [Sidebar IA & Surfaces](mem://features/sidebar-ia) — TODAY/PIPELINE/LIBRARY/INSIGHTS, /insights rename, Resumes versioning, Settings tabbed hub
- [Visual Theme (legacy)](mem://style/visual-theme) — Earlier Linear/Notion notes; superseded by visual-theme-v2
- [Infrastructure](mem://tech/infrastructure) — Self-hosted, fictional records in docs/images/hero.png
- [AI Job Search](mem://features/ai-job-search) — Hybrid search, 50 results limit, staged progress UI
- [Job Scraper](mem://features/job-scraper) — Gemini AI Edge Function for URL scraping, no third-party APIs
- [Pipeline Management](mem://features/pipeline-management) — Priority/Match Score terminology, DB mapping layer
- [Networking Intelligence](mem://features/networking-intelligence) — Network Map (xyflow/react), company clustering, taxonomy
- [Auth & Security](mem://auth/security) — Supabase OAuth fallback, RLS policies, disabled registrations
- [Cover Letter Generator](mem://features/cover-letter-generator) — Tiptap editor, HTML/plain text conversion; reads primary resume_versions row first
- [Resume Parsing](mem://features/resume-parsing) — PDF/DOCX/text parsing to Search Profile
- [Data Modeling](mem://tech/data-modeling) — Composite unique constraints for multi-tenant isolation
- [Job Board Management](mem://features/job-board-management) — Gated access scanner, manual check workflow
- [Contact CRM](mem://features/contact-crm) — Relationship warmth, taxonomy, excludes higher ed contacts
- [Bulk Import](mem://features/intelligent-bulk-import) — SheetJS + Gemini header mapping
- [AI PM Feed](mem://features/ai-pm-feed) — Firecrawl fetching, rate-limited 3/hr per user, UI panel
- [Skills Intelligence](mem://features/skills-intelligence) — Demand-tier pills, formatSkillLabel utility
- [Scheduling & Reminders](mem://features/scheduling-and-reminders) — Dynamic Google Calendar URL templates
- [Application CRM](mem://features/job-application-crm) — Salesforce-inspired Opportunity timeline view
- [Target Organizations](mem://features/target-organizations) — Org-first pipeline, fuzzy name matching
- [Target Company Sourcing](mem://features/target-company-sourcing) — Coverage taxonomy + SourcingPanel for finding Boosters/Connectors
- [Open Source Support](mem://tech/open-source-support) — Licensing and changelog management
- [Recommendations Engine](mem://features/recommendations-engine) — Weighted scoring, auto-scroll deep links
- [Branding](mem://project/branding) — Jobtrakr metadata and identity
- [Match Scoring Preference](mem://constraints/match-scoring-preference) — Strict rule against AI-automated scoring

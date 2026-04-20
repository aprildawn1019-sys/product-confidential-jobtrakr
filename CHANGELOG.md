# Changelog

All notable changes to JobTrackr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- **Network Map** — interactive force-directed graph (xyflow/react) of contacts, companies, and jobs with clustering, search, filters, and PNG export
- **Contacts spreadsheet view** — sortable spreadsheet alongside grid / compact / detailed views
- **Per-list CSV export** — Jobs, Contacts, and Interviews now expose an "Export CSV" action that respects the current filters and sort
- **Settings → Data & Export** — bulk CSV backups consolidated under Settings
- **AI PM Feed** — automated discovery of AI Product Management roles, rate-limited to 3/hr per user
- Refreshed marketing screenshots in `docs/images/` (Command Center, Jobs, Connections, Network Map, Skills Insights)
- **Renamed** primary surfaces: `/` is now **Command Center** (prioritized next steps + widgets); `/dashboard` is now **Dashboard** (search-funnel analytics: response rate by lane, time to first interview, weekly velocity)

### Changed
- Renamed terminology: "Urgency" → **Priority** (Low / Medium / High); "Fit score" → **Match score** (manual 1–5 stars, never AI-assigned)
- Branding updated to **Jobtrakr** by Product Confidential
- Unified Interviews and contact follow-ups into a single **Schedule** page

### Removed
- Standalone **Reports** page and sidebar entry (replaced by in-context export menus + Settings → Data & Export)

### Security
- `user_id` is now `NOT NULL` on every per-user table to prevent orphan rows

---

## [1.0.0] — 2026-04-08

### Added

- **Dashboard** — at-a-glance stats, pipeline funnel, follow-up reminders, high-urgency and top-fit widgets
- **Job Tracking** — list and Kanban views with drag-and-drop, fit score stars, urgency levels, and bulk CSV/Excel import
- **Job CRM** — per-job Salesforce-style page with unified activity timeline and conversation logs
- **Cover Letters** — AI-generated cover letters tailored to job descriptions and user profile, with full history management
- **Contact Management** — relationship warmth tracking, follow-up scheduling, activity logging, campaign management, LinkedIn import, and bulk import
- **Interviews** — scheduling, calendar view, and combined timeline with contact follow-ups
- **Job Search** — AI-powered search with profile-based matching, job board management, and dismiss/refine flow
- **Profile Editor** — searchable profile with resume parsing for auto-populating fields
- **Skills Insights** — skills frequency analysis, demand-level indicators (high/moderate/low), snapshot history, LinkedIn headline builder, and resume keywords with market overlap
- **Target Companies** — shortlist with priority levels, pipeline status, auto-computed stats, and dashboard integration
- **Authentication** — email-based auth with verification, optional Google OAuth, row-level security
- **Self-hosting** — full documentation, `.env.example`, shared AI config supporting any OpenAI-compatible provider
- **License** — PolyForm Noncommercial 1.0.0 with commercial license option

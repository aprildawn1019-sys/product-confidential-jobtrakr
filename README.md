# JobTrackr

A comprehensive job search management application built with React, TypeScript, and Supabase. Track job postings, manage your application pipeline, nurture professional contacts, and stay on top of interviews — all in one place.

[![PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)

## Features

### 📊 Dashboard
- At-a-glance stats: total jobs, active applications, upcoming interviews
- Company avatars with deterministic color coding
- High urgency jobs and top-rated fits widgets with interactive star ratings and tooltips
- Follow-up reminders with overdue tracking
- Application pipeline with rounded, overlapping status segments — click any segment to filter Jobs by that status

### 💼 Job Tracking
- **List & Kanban views** — drag-and-drop jobs between status columns
- Consistent card layout with tooltips on all action buttons (fit score, company link, details)
- Statuses: Saved → Applied → Screening → Interviewing → Offer / Rejected / Withdrawn / Closed
- Inline editing of status, fit score (1–5 stars), and urgency level
- Job detail panel with description, recruiter info, and linked contacts
- Bulk import jobs via CSV/Excel upload

### 📋 Job CRM
- Dedicated per-job CRM page (`/jobs/:id`) inspired by Salesforce Opportunity views
- Unified activity timeline merging status changes, interviews, and networking events
- Activity types: Cold Outreach, Introduction, Referral Request, Informational Chat, Follow Up, and more
- Conversation logs and next-step tracking per contact

### ✉️ Cover Letters
- AI-generated cover letters tailored to each job description and your search profile
- Pick from tracked jobs or enter details manually
- Auto-extract job descriptions from URLs
- Full history page to view, search, copy, and manage all generated letters

### 👥 Contact Management
- Full CRM for professional relationships
- Relationship warmth tracking (Cold → Warm → Hot → Champion)
- Follow-up date scheduling with overdue alerts
- Activity logging and conversation notes
- Many-to-many outreach campaign management
- Contact-to-contact connections and org-level networking
- Recommendation request tracking
- LinkedIn profile import with AI-powered field extraction
- Bulk contact import via CSV/Excel

### 📅 Interviews
- Schedule and manage interviews (Phone, Technical, Behavioral, Onsite, Final)
- Calendar view with highlighted interview and follow-up dates
- Combined timeline of interviews and contact follow-ups

### 🔍 Job Search
- AI-powered job search with profile-based matching
- Job board management and tracking
- Dismiss irrelevant results to refine future searches

### 📝 Profile Editor
- Searchable job profile with target roles, skills, and preferences
- Resume parsing for auto-populating profile fields
- Used by AI search to match relevant opportunities

### 📈 Skills Insights
- Skills frequency analysis across tracked job postings
- Snapshot history for trending skill demand over time

### 🎯 Target Companies
- Build a shortlist of dream employers with priority levels (Dream, Strong, Interested)
- Track pipeline status per company (Researching, Applied, Connected, Archived)
- Auto-computed stats: jobs tracked, contacts, and active applications per company
- Dashboard integration with target company stat card
- Quick access to company websites and careers pages


## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript 5, Vite 5 |
| **Styling** | Tailwind CSS 3, shadcn/ui, Radix UI |
| **State** | React hooks, TanStack React Query |
| **Routing** | React Router v6 |
| **Backend** | Supabase — Auth, Database, Edge Functions |
| **AI** | Any OpenAI-compatible provider (OpenAI, Google AI Studio, Together, Groq, etc.) |
| **Charts** | Recharts |

---

## Quick Start (Lovable Cloud)

If you're running on [Lovable](https://lovable.dev), everything is pre-configured. Just click **Publish** and you're done — no environment setup needed.

---

## Self-Hosting Guide

### Prerequisites

- **Node.js 18+** and npm (or Bun)
- **Supabase CLI** — [Install guide](https://supabase.com/docs/guides/cli/getting-started)
- An **AI API key** from any OpenAI-compatible provider

### 1. Clone & install

```bash
git clone <your-repo-url>
cd jobtrackr
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Copy the **Project URL** and **anon (public) key** from Settings → API.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 4. Apply database migrations

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates all tables, RLS policies, and functions.

### 5. Set edge function secrets

Edge functions need an AI provider key. Set it (and optionally override the base URL and model):

```bash
# Required — pick any OpenAI-compatible provider
supabase secrets set OPENAI_API_KEY=sk-...

# Optional — defaults to OpenAI's API and gpt-4o-mini
supabase secrets set AI_BASE_URL=https://api.openai.com
supabase secrets set AI_MODEL=gpt-4o-mini
```

### 6. Deploy edge functions

```bash
supabase functions deploy
```

### 7. (Optional) Configure Google OAuth

To enable "Sign in with Google":

1. In the Supabase dashboard, go to **Authentication → Providers → Google**.
2. Enable it and add your Google OAuth client ID and secret.
3. Add `http://localhost:5173` (and your production URL) to the redirect URLs.

The app automatically falls back to native Supabase OAuth when self-hosted.

### 8. (Optional) Enable job board scraping

For real-time job board scraping via [Firecrawl](https://firecrawl.dev):

```bash
supabase secrets set FIRECRAWL_API_KEY=fc-...
```

Without this, the AI job search will still work but will generate suggestions only (no live scraping).

### 9. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## AI Provider Options

All 8 edge functions use a shared config helper (`supabase/functions/_shared/ai-config.ts`). It checks `OPENAI_API_KEY` first; if unset, falls back to `LOVABLE_API_KEY` (auto-configured on Lovable Cloud).

| Provider | `AI_BASE_URL` | Example `AI_MODEL` |
|----------|--------------|-------------------|
| **OpenAI** (default) | `https://api.openai.com` | `gpt-4o-mini`, `gpt-4o` |
| **Google AI Studio** | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` |
| **Together AI** | `https://api.together.xyz/v1` | `meta-llama/Llama-3-70b-chat-hf` |
| **Groq** | `https://api.groq.com/openai/v1` | `llama-3.1-70b-versatile` |
| **Ollama** (local) | `http://localhost:11434/v1` | `llama3.1` |

> **Note:** The provider must support the OpenAI chat completions API format, including tool/function calling.

---

## Edge Function Secrets Reference

| Secret | Required | Description |
|--------|----------|-------------|
| `OPENAI_API_KEY` | **Yes** (self-hosted) | API key for your AI provider |
| `AI_BASE_URL` | No | Override AI endpoint (default: `https://api.openai.com`) |
| `AI_MODEL` | No | Override model name (default: `gpt-4o-mini`) |
| `FIRECRAWL_API_KEY` | No | Enables live job board scraping |
| `LOVABLE_API_KEY` | Auto | Set automatically on Lovable Cloud |

---

## Deployment

JobTrackr is a static SPA — deploy the `dist/` folder to any static host:

```bash
npm run build
```

### Vercel

```bash
npx vercel --prod
```

### Netlify

1. Connect your repo in the Netlify dashboard.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).

### Any static host

Upload the contents of `dist/` to your host. Add a catch-all redirect rule to serve `index.html` for all routes (SPA routing).

---

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui primitives
│   ├── jobboards/       # Job board components
│   └── jobsearch/       # Job search components
├── hooks/               # Custom React hooks
├── integrations/        # Supabase client & types
├── pages/               # Route-level page components
├── stores/              # State management (jobTrackerStore)
├── types/               # TypeScript type definitions
└── lib/                 # Utility functions

supabase/
├── functions/           # Edge functions (AI search, scraping, etc.)
│   └── _shared/         # Shared helpers (ai-config.ts)
├── migrations/          # Database migrations
└── config.toml          # Backend configuration
```

## Authentication

JobTrackr uses email-based authentication with email verification, plus optional Google OAuth. All data is scoped per user via Row-Level Security policies.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding conventions, and how to submit a pull request.

## License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). You are free to use, modify, and distribute it for **non-commercial purposes** only. For commercial use, see [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md).

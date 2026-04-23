# Contributing to Koudou

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Development Setup

### Prerequisites

- **Node.js 18+** and npm (or Bun)
- **Supabase CLI** — [Install guide](https://supabase.com/docs/guides/cli/getting-started)
- An **AI API key** from any OpenAI-compatible provider (see [README — AI Provider Options](README.md#ai-provider-options))

### Local Environment

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/koudou.git
cd koudou

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase URL + anon key

# 4. Apply database migrations
supabase link --project-ref <your-project-ref>
supabase db push

# 5. Set edge function secrets
supabase secrets set OPENAI_API_KEY=sk-...

# 6. Deploy edge functions locally
supabase functions serve

# 7. Start the dev server (in a separate terminal)
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173).

### Running Tests

```bash
npm run test        # Unit tests (Vitest)
npx playwright test # E2E tests
```

---

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui primitives (do not edit directly)
│   ├── jobboards/       # Job board feature components
│   └── jobsearch/       # Job search feature components
├── hooks/               # Custom React hooks
├── integrations/        # Supabase client & auto-generated types
├── pages/               # Route-level page components
├── stores/              # State management
├── types/               # TypeScript type definitions
└── lib/                 # Utility functions

supabase/
├── functions/           # Supabase Edge Functions (Deno)
│   └── _shared/         # Shared helpers (ai-config.ts)
├── migrations/          # Database migrations (do not edit manually)
└── config.toml          # Supabase project config
```

---

## Coding Conventions

### TypeScript

- **Strict mode** — no `any` unless absolutely necessary; prefer explicit types.
- Use **interfaces** for object shapes and **type aliases** for unions/intersections.
- Prefer **named exports** over default exports (pages are the exception).

### React

- **Functional components only** — no class components.
- Use **hooks** for state and side effects.
- Keep components small and focused — extract logic into custom hooks.
- Colocate component-specific types in the same file.

### Styling

- Use **Tailwind CSS** utility classes exclusively — no custom CSS files per component.
- Use **semantic design tokens** (`bg-primary`, `text-muted-foreground`, etc.) — never hardcode colors.
- All color values must be **HSL** and defined in `src/index.css`.
- Use **shadcn/ui** components as the base; extend with variants when needed.

### Edge Functions (Deno)

- All AI calls go through `supabase/functions/_shared/ai-config.ts` — never hardcode API keys or URLs.
- Always handle **429** (rate limit) and **402** (credits exhausted) responses from the AI gateway.
- Include CORS headers in **every** response, including errors.
- Validate all request body inputs.

### Naming

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `JobDetailPanel.tsx` |
| Hooks | camelCase with `use` prefix | `use-mobile.tsx` |
| Pages | PascalCase | `Dashboard.tsx` |
| Edge functions | kebab-case directories | `scrape-job/index.ts` |
| CSS variables | kebab-case with `--` prefix | `--primary-foreground` |

### Imports

- Use the `@/` path alias for all project imports.
- Group imports: React → external libs → internal components → types.

---

## Auto-Generated Files — Do Not Edit

These files are managed automatically and **must not be modified by hand**:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`
- `supabase/migrations/*`
- `bun.lock` / `bun.lockb` / `package-lock.json`

---

## Making Changes

### Branch Naming

```
feat/short-description    # New features
fix/short-description     # Bug fixes
docs/short-description    # Documentation only
refactor/short-description # Code restructuring
```

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add bulk job export to CSV
fix: correct fit score rounding on command center
docs: update self-hosting instructions
refactor: extract AI config into shared helper
```

### Pull Request Checklist

Before opening a PR, make sure:

- [ ] `npm run build` succeeds with no errors
- [ ] TypeScript compiles cleanly (`npx tsc --noEmit`)
- [ ] All existing tests pass (`npm run test`)
- [ ] New features include appropriate types
- [ ] Edge function changes handle 429/402 AI errors
- [ ] No hardcoded colors — uses design tokens
- [ ] No secrets or API keys in code (use environment variables)
- [ ] PR description explains **what** changed and **why**

---

## Adding a New Edge Function

1. Create `supabase/functions/<function-name>/index.ts`.
2. Import the shared AI config:
   ```typescript
   import { getAIConfig } from "../_shared/ai-config.ts";
   ```
3. Use `getAIConfig("default-model-name")` to get AI credentials.
4. Include CORS headers and handle OPTIONS preflight.
5. Handle 429 and 402 AI responses explicitly.
6. Deploy with `supabase functions deploy <function-name>`.

---

## Adding a New Page

1. Create `src/pages/YourPage.tsx` with a default export.
2. Add the route in `src/App.tsx` (or `src/pages/Index.tsx` if it's an authenticated route).
3. Add navigation in `src/components/AppSidebar.tsx` if it should appear in the sidebar.

---

## Reporting Issues

When filing an issue, please include:

- Steps to reproduce
- Expected vs actual behavior
- Browser and OS
- Console errors (if any)

---

## Code of Conduct

Be kind, be constructive, be inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

---

## License

By contributing, you agree that your contributions will be licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).

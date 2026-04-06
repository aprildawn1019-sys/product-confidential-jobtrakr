

## Plan: Self-Hosting Support

### Summary
Create a shared AI config helper for edge functions, add Auth.tsx fallback for native Supabase OAuth, create `.env.example`, and rewrite README with self-hosting guide.

### 1. Create `supabase/functions/_shared/ai-config.ts`

Shared helper all 8 edge functions import. Checks `OPENAI_API_KEY` first (self-hosted), falls back to `LOVABLE_API_KEY` (Lovable-hosted). When `OPENAI_API_KEY` is set, uses `AI_BASE_URL` and `AI_MODEL` env vars to let users pick any OpenAI-compatible provider.

```typescript
export function getAIConfig(defaultModel: string) {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    return {
      apiKey: openaiKey,
      baseUrl: Deno.env.get("AI_BASE_URL") || "https://api.openai.com",
      model: Deno.env.get("AI_MODEL") || "gpt-4o-mini",
    };
  }
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      apiKey: lovableKey,
      baseUrl: "https://ai.gateway.lovable.dev",
      model: defaultModel,
    };
  }
  return null;
}
```

Each function passes its current model name as `defaultModel`. The helper returns the correct key, URL, and model for the environment.

### 2. Update 8 edge functions

**Files:** `ai-job-search`, `ai-pm-role-feed`, `extract-job-skills`, `generate-cover-letter`, `map-bulk-columns`, `parse-resume`, `scrape-job`, `scrape-linkedin`

In each file:
- Add `import { getAIConfig } from "../_shared/ai-config.ts";`
- Replace the `LOVABLE_API_KEY` lookup + hardcoded gateway URL with:
  ```typescript
  const ai = getAIConfig("google/gemini-3-flash-preview"); // each fn uses its own default
  if (!ai) throw new Error("No AI provider configured");
  ```
- Use `ai.baseUrl`, `ai.apiKey`, `ai.model` in the fetch call

This is a mechanical find-and-replace in each function. No logic changes.

### 3. Update `src/pages/Auth.tsx` — native OAuth fallback

Replace the Google sign-in handler to try the Lovable auth first, and if it fails (e.g. module not available in self-hosted), fall back to native Supabase OAuth:

```typescript
const handleGoogleSignIn = async () => {
  setGoogleLoading(true);
  try {
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch {
      // Fallback for self-hosted: use native Supabase OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    }
  } catch (e: any) {
    toast({ title: "Google sign-in failed", description: e.message, variant: "destructive" });
  } finally {
    setGoogleLoading(false);
  }
};
```

### 4. Create `.env.example`

```env
# Required — Supabase project credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# AI Provider (choose one)
# Option A: OpenAI
OPENAI_API_KEY=sk-...
# AI_BASE_URL=https://api.openai.com     # default
# AI_MODEL=gpt-4o-mini                    # default

# Option B: Google AI Studio
# OPENAI_API_KEY=your-google-ai-key
# AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
# AI_MODEL=gemini-2.0-flash

# Option C: Other OpenAI-compatible (Together, Groq, etc.)
# OPENAI_API_KEY=your-key
# AI_BASE_URL=https://api.together.xyz/v1
# AI_MODEL=meta-llama/Llama-3-70b-chat-hf

# Optional — enables job board scraping
# FIRECRAWL_API_KEY=fc-...
```

### 5. Rewrite `README.md`

Keep existing feature list and tech stack. Add these new sections:

- **Quick Start (Lovable)** — existing one-liner
- **Self-Hosting Guide** with steps:
  1. Clone and install
  2. Create Supabase project, get URL + anon key
  3. Copy `.env.example` to `.env.local`
  4. Run migrations: `supabase link --project-ref <ref>` then `supabase db push`
  5. Set edge function secrets: `supabase secrets set OPENAI_API_KEY=... AI_MODEL=...`
  6. Deploy functions: `supabase functions deploy`
  7. (Optional) Configure Google OAuth in Supabase Auth settings
  8. (Optional) Set `FIRECRAWL_API_KEY` for scraping
  9. `npm run dev`
- **AI Provider Options** — table of providers with base URLs and model names
- **Edge Function Secrets Reference** — table of all secrets (required vs optional)
- **Deployment** — Vercel/Netlify/any static host instructions

### Impact on current deployment

Zero. The AI config helper checks `OPENAI_API_KEY` first — since it's not set in the current environment, it falls back to `LOVABLE_API_KEY` which is already configured. The Auth.tsx change wraps existing code in a try/catch — current behavior is preserved. `.env.example` and README are documentation only.


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Common login/gate indicators in page content
const GATE_INDICATORS = [
  'sign in', 'sign up', 'log in', 'login', 'create account',
  'forgot your password', 'forgot password', 'enter your email',
  'don\'t have an account', 'register now', 'join now',
  'subscribe to access', 'premium access', 'membership required',
];

// Known public URL alternatives for gated boards
const PUBLIC_ALTERNATIVES: Record<string, string> = {
  'app.welcometothejungle.com': 'https://www.welcometothejungle.com/en/jobs',
  'linkedin.com/jobs': 'https://www.linkedin.com/jobs/search',
  'app.theladders.com': 'https://www.theladders.com/jobs/search',
  'app.hired.com': 'https://hired.com/job-seekers',
};

function detectGate(markdown: string): { isGated: boolean; confidence: number; indicators: string[] } {
  const lower = markdown.toLowerCase();
  const foundIndicators: string[] = [];

  for (const indicator of GATE_INDICATORS) {
    if (lower.includes(indicator)) {
      foundIndicators.push(indicator);
    }
  }

  // Check content length — very short pages often indicate a gate/redirect
  const isVeryShort = markdown.length < 500;

  // High confidence if multiple indicators + short page
  const score = foundIndicators.length + (isVeryShort ? 2 : 0);
  const isGated = score >= 3;

  return { isGated, confidence: Math.min(score / 5, 1), indicators: foundIndicators };
}

function suggestPublicUrl(url: string): string | null {
  for (const [domain, publicUrl] of Object.entries(PUBLIC_ALTERNATIVES)) {
    if (url.includes(domain)) {
      return publicUrl;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { boards } = await req.json();

    if (!boards || !Array.isArray(boards)) {
      return new Response(
        JSON.stringify({ success: false, error: 'boards array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const board of boards) {
      if (!board.url) {
        results.push({
          id: board.id,
          name: board.name,
          is_gated: false,
          public_url: null,
          skipped: true,
          reason: 'No URL configured',
        });
        continue;
      }

      try {
        console.log(`Testing access: ${board.name} (${board.url})`);

        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: board.url,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          results.push({
            id: board.id,
            name: board.name,
            is_gated: true,
            public_url: suggestPublicUrl(board.url),
            reason: `Could not access (HTTP ${response.status})`,
          });
          continue;
        }

        const markdown = data?.data?.markdown || data?.markdown || '';
        const detection = detectGate(markdown);

        results.push({
          id: board.id,
          name: board.name,
          is_gated: detection.isGated,
          confidence: detection.confidence,
          indicators: detection.indicators,
          public_url: detection.isGated ? suggestPublicUrl(board.url) : null,
          content_length: markdown.length,
        });

        // Small delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`Error testing ${board.name}:`, err);
        results.push({
          id: board.id,
          name: board.name,
          is_gated: true,
          public_url: suggestPublicUrl(board.url),
          reason: 'Failed to test access',
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error testing boards:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

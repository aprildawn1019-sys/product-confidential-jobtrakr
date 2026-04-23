import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, ExternalLink, ShieldCheck, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reliable in-app preview for the OG/social-share image.
 *
 * Two roles:
 *   1. Render `/og-image.png` through a real React surface so embedded preview
 *      panes (which sometimes refuse to display raw PNGs) always show it.
 *   2. Provide a one-click "Verify headers" check that mirrors the dev-time
 *      `scripts/verify-og-headers.mjs` contract — same four assertions, same
 *      pass/fail wording — so designers can self-serve before shipping.
 */

type CheckStatus = "pending" | "pass" | "fail";
interface CheckRow {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isCacheDisabled(cacheControl: string | null): boolean {
  if (!cacheControl) return false;
  const cc = cacheControl.toLowerCase();
  if (cc.includes("no-store")) return true;
  if (cc.includes("no-cache")) return true;
  if (cc.includes("must-revalidate")) return true;
  if (/(?:^|[,\s])max-age\s*=\s*0(?:[,\s]|$)/.test(cc)) return true;
  return false;
}

export default function OgPreview() {
  const [bust, setBust] = useState(() => Date.now());
  const [meta, setMeta] = useState<{ size?: number; type?: string; status?: number } | null>(null);
  const [checks, setChecks] = useState<CheckRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const src = `/og-image.png?v=${bust}`;

  useEffect(() => {
    let cancelled = false;
    fetch(src, { method: "GET", cache: "no-store" })
      .then(async (r) => {
        if (cancelled) return;
        const blob = await r.blob();
        setMeta({ size: blob.size, type: blob.type, status: r.status });
      })
      .catch(() => {
        if (!cancelled) setMeta({ status: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const runChecks = useCallback(async () => {
    setRunning(true);
    setChecks(null);
    try {
      const res = await fetch(`/og-image.png?check=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });
      const contentType = res.headers.get("content-type");
      const cacheControl = res.headers.get("cache-control");
      const buf = new Uint8Array(await res.arrayBuffer());
      const magicOk = buf.length >= 8 && PNG_MAGIC.every((b, i) => buf[i] === b);

      const rows: CheckRow[] = [
        {
          id: "status",
          label: "HTTP 200 OK",
          status: res.status === 200 ? "pass" : "fail",
          detail: `status ${res.status}`,
        },
        {
          id: "ctype",
          label: "Content-Type is image/png",
          status: contentType && /^image\/png\b/i.test(contentType) ? "pass" : "fail",
          detail: contentType ? contentType : "(missing)",
        },
        {
          id: "cache",
          label: "Cache disabled",
          status: isCacheDisabled(cacheControl) ? "pass" : "fail",
          detail: cacheControl ? cacheControl : "(missing)",
        },
        {
          id: "magic",
          label: "Valid PNG body",
          status: magicOk ? "pass" : "fail",
          detail: `${buf.length} bytes${magicOk ? ", PNG magic ok" : ", magic bytes mismatch"}`,
        },
      ];
      setChecks(rows);
    } catch (err) {
      setChecks([
        {
          id: "fetch",
          label: "Fetch /og-image.png",
          status: "fail",
          detail: err instanceof Error ? err.message : String(err),
        },
      ]);
    } finally {
      setRunning(false);
    }
  }, []);

  const allPass = checks?.every((c) => c.status === "pass") ?? false;
  const anyFail = checks?.some((c) => c.status === "fail") ?? false;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <Badge variant="outline" className="text-xs">Brand asset</Badge>
        <h1 className="font-display text-3xl font-semibold tracking-tight">OG image preview</h1>
        <p className="text-sm text-muted-foreground">
          Renders <code className="rounded bg-muted px-1.5 py-0.5 text-xs">public/og-image.png</code> through a React surface
          with an explicit <code className="rounded bg-muted px-1.5 py-0.5 text-xs">image/png</code> response header.
          Dimensions: 1200×630 (Open Graph / Twitter summary_large_image).
        </p>
      </header>

      <Card className="overflow-hidden border-border bg-card">
        <div className="bg-[hsl(222_47%_11%)] p-6">
          <img
            src={src}
            alt="Koudou Open Graph card — From first lead to signed offer."
            width={1200}
            height={630}
            className="mx-auto h-auto w-full max-w-[1100px] rounded-md shadow-2xl"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span>HTTP {meta?.status ?? "…"}</span>
            <span>·</span>
            <span>Type: {meta?.type || "—"}</span>
            <span>·</span>
            <span>Size: {meta?.size ? `${(meta.size / 1024).toFixed(1)} KB` : "—"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="default" onClick={runChecks} disabled={running}>
              {running ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              )}
              Verify headers
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setBust(Date.now())}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reload
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href="/og-image.png" target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open raw
              </a>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href="/og-image.png" download="koudou-og-image.png">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download
              </a>
            </Button>
          </div>
        </div>
      </Card>

      {checks && (
        <Card
          className={cn(
            "border-border bg-card p-5",
            allPass && "border-l-4 border-l-emerald-500",
            anyFail && "border-l-4 border-l-destructive",
          )}
          role="status"
          aria-live="polite"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">
              {allPass ? "All header checks passed" : "Header check failed"}
            </h2>
            <Badge variant={allPass ? "secondary" : "destructive"} className="text-xs">
              {checks.filter((c) => c.status === "pass").length}/{checks.length} pass
            </Badge>
          </div>
          <ul className="space-y-2 text-sm">
            {checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                {c.status === "pass" ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0">
                  <div className={cn("font-medium", c.status === "fail" && "text-destructive")}>
                    {c.label}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{c.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="border-border bg-card p-5 text-sm">
        <h2 className="mb-2 font-display text-base font-semibold">Why this route exists</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Vite middleware sets <code className="rounded bg-muted px-1 py-0.5 text-xs">Content-Type: image/png</code> + <code className="rounded bg-muted px-1 py-0.5 text-xs">Cache-Control: no-cache</code> for <code>/og-image.png</code>.</li>
          <li><strong>Verify headers</strong> mirrors the CI script <code>scripts/verify-og-headers.mjs</code> — same four assertions, runnable in the browser.</li>
          <li>Use <em>Reload</em> after regenerating the image — it appends a cache-busting query param.</li>
        </ul>
      </Card>
    </div>
  );
}

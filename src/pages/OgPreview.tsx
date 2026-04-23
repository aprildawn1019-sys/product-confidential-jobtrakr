import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, ExternalLink } from "lucide-react";

/**
 * Reliable in-app preview for the OG/social-share image.
 *
 * The dev preview pane sometimes refuses to render static PNGs directly when
 * the response lacks an explicit `Content-Type` header. This route renders the
 * same `/og-image.png` asset inside a real React surface so we get a guaranteed
 * preview, plus a cache-busting query param + reload control to verify the
 * latest regeneration without a hard browser refresh.
 */
export default function OgPreview() {
  const [bust, setBust] = useState(() => Date.now());
  const [meta, setMeta] = useState<{ size?: number; type?: string; status?: number } | null>(null);
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
          <div className="flex gap-2">
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

      <Card className="border-border bg-card p-5 text-sm">
        <h2 className="mb-2 font-display text-base font-semibold">Why this route exists</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Vite middleware now sets <code className="rounded bg-muted px-1 py-0.5 text-xs">Content-Type: image/png</code> + <code className="rounded bg-muted px-1 py-0.5 text-xs">Cache-Control: no-cache</code> for <code>/og-image.png</code>.</li>
          <li>This page renders the asset via React so embedded preview panes that struggle with binary file previews can still display it.</li>
          <li>Use <em>Reload</em> after regenerating the image — it appends a cache-busting query param.</li>
        </ul>
      </Card>
    </div>
  );
}

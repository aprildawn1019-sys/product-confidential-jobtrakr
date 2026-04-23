#!/usr/bin/env node
/**
 * verify-og-headers.mjs
 *
 * Dev-time guard: boots the Vite dev server, fetches `/og-image.png`, and
 * fails (exit 1) unless the response satisfies our brand-asset contract:
 *
 *   - HTTP 200
 *   - `Content-Type: image/png` (the explicit middleware in vite.config.ts)
 *   - Cache is disabled (`no-cache`, `no-store`, `must-revalidate`, or
 *     `max-age=0`) so regenerated images appear immediately in preview panes
 *
 * Why this exists: the preview pane silently misrenders the OG card when
 * either header drifts. We want CI/local builds to scream early instead.
 *
 * Usage:
 *   node scripts/verify-og-headers.mjs
 *   PORT=8080 node scripts/verify-og-headers.mjs   # override port
 *   ASSET_URL=http://host/og-image.png node scripts/verify-og-headers.mjs
 *     ^ skip server boot and check an already-running URL
 */

import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const PORT = Number(process.env.PORT ?? 8080);
const PATH_TO_CHECK = "/og-image.png";
const TARGET_URL = process.env.ASSET_URL ?? `http://127.0.0.1:${PORT}${PATH_TO_CHECK}`;
const SKIP_BOOT = Boolean(process.env.ASSET_URL);
const BOOT_TIMEOUT_MS = 30_000;
const READY_POLL_MS = 400;

/** Pretty logger so the failure is unmistakable in CI output. */
const log = {
  info: (m) => console.log(`\x1b[36m[og-headers]\x1b[0m ${m}`),
  ok: (m) => console.log(`\x1b[32m[og-headers] ✓\x1b[0m ${m}`),
  fail: (m) => console.error(`\x1b[31m[og-headers] ✗\x1b[0m ${m}`),
};

/** Boot `vite` in the background and resolve once the port answers. */
async function bootDevServer() {
  log.info(`booting vite on :${PORT}…`);
  const proc = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "development" },
  });

  // Surface vite's own errors but don't spam normal output.
  proc.stderr.on("data", (chunk) => {
    const s = chunk.toString();
    if (/error/i.test(s)) process.stderr.write(`\x1b[2m${s}\x1b[0m`);
  });

  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/`, { method: "HEAD" });
      if (r.status < 500) return proc;
    } catch {
      /* not ready yet */
    }
    await wait(READY_POLL_MS);
  }
  proc.kill("SIGTERM");
  throw new Error(`vite did not become ready on :${PORT} within ${BOOT_TIMEOUT_MS}ms`);
}

/** Returns true when the directive set means "do not cache". */
function isCacheDisabled(cacheControl) {
  if (!cacheControl) return false;
  const cc = cacheControl.toLowerCase();
  if (cc.includes("no-store")) return true;
  if (cc.includes("no-cache")) return true;
  if (cc.includes("must-revalidate")) return true;
  // `max-age=0` is also acceptable as "disabled".
  if (/(?:^|[,\s])max-age\s*=\s*0(?:[,\s]|$)/.test(cc)) return true;
  return false;
}

async function check() {
  log.info(`GET ${TARGET_URL}`);
  const res = await fetch(TARGET_URL, { method: "GET", redirect: "manual" });
  const contentType = res.headers.get("content-type") ?? "";
  const cacheControl = res.headers.get("cache-control") ?? "";
  const failures = [];

  if (res.status !== 200) failures.push(`expected HTTP 200, got ${res.status}`);
  if (!/^image\/png\b/i.test(contentType))
    failures.push(`expected Content-Type "image/png", got "${contentType || "(missing)"}"`);
  if (!isCacheDisabled(cacheControl))
    failures.push(
      `expected Cache-Control to disable caching (no-store/no-cache/must-revalidate/max-age=0), got "${cacheControl || "(missing)"}"`,
    );

  // Body sanity: a PNG starts with the 8-byte magic 89 50 4E 47 0D 0A 1A 0A.
  const buf = new Uint8Array(await res.arrayBuffer());
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const magicOk = buf.length >= 8 && magic.every((b, i) => buf[i] === b);
  if (!magicOk) failures.push(`response body is not a valid PNG (got ${buf.length} bytes)`);

  if (failures.length) {
    log.fail("brand asset contract violated:");
    for (const f of failures) console.error(`         · ${f}`);
    console.error(
      `         Headers seen:\n           content-type: ${contentType}\n           cache-control: ${cacheControl}`,
    );
    return false;
  }

  log.ok(`Content-Type: ${contentType}`);
  log.ok(`Cache-Control: ${cacheControl}`);
  log.ok(`PNG body: ${buf.length} bytes`);
  return true;
}

let serverProc;
try {
  if (!SKIP_BOOT) serverProc = await bootDevServer();
  const ok = await check();
  if (!ok) process.exitCode = 1;
} catch (err) {
  log.fail(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
} finally {
  if (serverProc) {
    serverProc.kill("SIGTERM");
    // Give vite a beat to exit cleanly before the process tears down.
    await wait(150);
  }
}

#!/usr/bin/env node
/**
 * Run `src/lib/localDate.test.ts` once per representative timezone.
 *
 * Node's V8 reads `process.env.TZ` only at startup, so we cannot flip the
 * timezone inside a single test process. Instead we spawn vitest three
 * times — UTC-8, UTC+0, UTC+5 — and fail the run if any iteration fails.
 *
 * Invoked by `npm run test:localdate-tz`.
 */
import { spawnSync } from "node:child_process";

const ZONES = [
  { tz: "America/Los_Angeles", label: "UTC-8 (Los Angeles)" },
  { tz: "UTC", label: "UTC+0" },
  { tz: "Asia/Karachi", label: "UTC+5 (Karachi)" },
];

let failures = 0;

for (const { tz, label } of ZONES) {
  console.log(`\n▶︎ Running localDate tests under ${label}  (TZ=${tz})`);
  const result = spawnSync(
    "npx",
    ["vitest", "run", "src/lib/localDate.test.ts", "--reporter=default"],
    {
      stdio: "inherit",
      env: { ...process.env, TZ: tz },
    },
  );
  if (result.status !== 0) {
    failures += 1;
    console.error(`✖ Failed under ${label}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} timezone run(s) failed.`);
  process.exit(1);
}
console.log("\n✓ localDate behaves correctly in all tested timezones.");

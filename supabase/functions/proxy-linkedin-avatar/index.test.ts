// Tests for the proxy-linkedin-avatar edge function.
//
// We test the request handler in isolation by injecting fake dependencies
// (auth, storage admin, fetch, rate limiter) into `createHandler`. This
// avoids any real network calls, DB queries, or Supabase client setup, so
// the suite runs offline and deterministically.
//
// Run with:
//   deno test --allow-env --allow-read supabase/functions/proxy-linkedin-avatar/index.test.ts

// Prevent the module-level `Deno.serve` from binding a port when we import
// the handler factory below. Must be set BEFORE the import is evaluated.
Deno.env.set("PROXY_LINKEDIN_AVATAR_SKIP_SERVE", "1");

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  createHandler,
  hashUrl,
  pickExtension,
  type HandlerDeps,
} from "./index.ts";

// ── Fake builders ──────────────────────────────────────────────────────
//
// Each test composes its own deps from these small helpers so the test
// body reads like a behavior spec instead of mock-setup boilerplate.

interface StorageState {
  /** Object names currently "in" the bucket. */
  existing: string[];
  /** Objects uploaded during the test, for assertion. */
  uploaded: Array<{ name: string; bytes: Uint8Array; contentType: string }>;
  /** Objects removed during the test. */
  removed: string[];
}

function makeStorageAdmin(state: StorageState): HandlerDeps["admin"] {
  return {
    storage: {
      from: (_bucket: string) => ({
        list: (_prefix: string, opts: { search?: string }) => {
          const search = opts.search ?? "";
          const data = state.existing
            .filter((n) => n.includes(search))
            .map((name) => ({ name }));
          return Promise.resolve({ data, error: null });
        },
        getPublicUrl: (name: string) => ({
          data: { publicUrl: `https://fake.storage/linkedin-avatars/${name}` },
        }),
        upload: (
          name: string,
          bytes: Uint8Array,
          opts: { contentType: string },
        ) => {
          state.uploaded.push({ name, bytes, contentType: opts.contentType });
          state.existing.push(name);
          return Promise.resolve({ error: null });
        },
        remove: (names: string[]) => {
          state.removed.push(...names);
          state.existing = state.existing.filter((n) => !names.includes(n));
          return Promise.resolve({ error: null });
        },
      }),
    },
    // deno-lint-ignore no-explicit-any
  } as any;
}

const okAuth: HandlerDeps["requireUser"] = () =>
  Promise.resolve({
    user: { id: "user-123", email: "u@example.com" },
    errorResponse: null,
  });

const noopRateLimit: HandlerDeps["checkRateLimit"] = () =>
  Promise.resolve({ errorResponse: null });

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/proxy-linkedin-avatar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    },
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────

Deno.test("hashUrl is deterministic and 64-char hex", async () => {
  const a = await hashUrl("https://media.licdn.com/photo.jpg");
  const b = await hashUrl("https://media.licdn.com/photo.jpg");
  const c = await hashUrl("https://media.licdn.com/other.jpg");
  assertEquals(a, b);
  assertEquals(a.length, 64);
  assertEquals(/^[0-9a-f]+$/.test(a), true);
  assertEquals(a === c, false);
});

Deno.test("pickExtension prefers content-type over URL", () => {
  assertEquals(pickExtension("https://x/y.jpg", "image/png"), "png");
  assertEquals(pickExtension("https://x/y", "image/webp"), "webp");
  assertEquals(pickExtension("https://x/y.gif", "application/octet-stream"), "gif");
  assertEquals(pickExtension("https://x/y", "application/octet-stream"), "jpg");
});

Deno.test("cache HIT: returns the cached public URL without calling fetch", async () => {
  const url = "https://media.licdn.com/dms/image/cached.jpg";
  const hash = await hashUrl(url);
  const state: StorageState = {
    existing: [`${hash}.jpg`],
    uploaded: [],
    removed: [],
  };

  let fetchCalls = 0;
  const handler = createHandler({
    requireUser: okAuth,
    admin: makeStorageAdmin(state),
    fetchFn: () => {
      fetchCalls++;
      return Promise.resolve(new Response("should not run", { status: 500 }));
    },
    checkRateLimit: noopRateLimit,
  });

  const res = await handler(makeRequest({ url }));
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.cached, true);
  assertEquals(
    body.url,
    `https://fake.storage/linkedin-avatars/${hash}.jpg`,
  );
  assertEquals(fetchCalls, 0, "cache hits must not hit upstream");
  assertEquals(state.uploaded.length, 0);
});

Deno.test("cache MISS: fetches upstream, uploads, and returns the new URL", async () => {
  const url = "https://media.licdn.com/dms/image/fresh.jpg";
  const state: StorageState = { existing: [], uploaded: [], removed: [] };

  const imageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]); // tiny "jpeg-ish"
  let fetchCalls = 0;
  const handler = createHandler({
    requireUser: okAuth,
    admin: makeStorageAdmin(state),
    fetchFn: () => {
      fetchCalls++;
      return Promise.resolve(
        new Response(imageBytes, {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        }),
      );
    },
    checkRateLimit: noopRateLimit,
  });

  const res = await handler(makeRequest({ url }));
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.cached, false);
  assertEquals(fetchCalls, 1);
  assertEquals(state.uploaded.length, 1);
  // Object name is `${hash}.jpg` and that's what we hand back.
  const uploaded = state.uploaded[0];
  assertEquals(uploaded.contentType, "image/jpeg");
  assertEquals(uploaded.bytes.byteLength, imageBytes.byteLength);
  assertExists(body.url);
  assertEquals(body.url.endsWith(`${uploaded.name}`), true);
});

Deno.test("non-LinkedIn URL is rejected with 400 before any storage / fetch work", async () => {
  const state: StorageState = { existing: [], uploaded: [], removed: [] };

  let fetchCalls = 0;
  let storageCalls = 0;
  const admin = makeStorageAdmin(state);
  // Wrap to count any storage access — for a rejected URL there should
  // be zero. We re-export `from` to spy on it.
  const wrappedAdmin: HandlerDeps["admin"] = {
    storage: {
      // deno-lint-ignore no-explicit-any
      from: (b: string): any => {
        storageCalls++;
        return admin.storage.from(b);
      },
      // deno-lint-ignore no-explicit-any
    } as any,
  };

  const handler = createHandler({
    requireUser: okAuth,
    admin: wrappedAdmin,
    fetchFn: () => {
      fetchCalls++;
      return Promise.resolve(new Response("nope", { status: 200 }));
    },
    checkRateLimit: noopRateLimit,
  });

  const res = await handler(
    makeRequest({ url: "https://evil.example.com/avatar.jpg" }),
  );
  const body = await res.json();

  assertEquals(res.status, 400);
  assertEquals(body.success, false);
  assertEquals(body.error, "Only LinkedIn media URLs are proxied");
  assertEquals(fetchCalls, 0, "rejected URLs must not trigger upstream fetch");
  assertEquals(storageCalls, 0, "rejected URLs must not touch storage");
});

Deno.test("upstream non-image response yields 502 and skips upload", async () => {
  const url = "https://media.licdn.com/dms/image/login-wall.html";
  const state: StorageState = { existing: [], uploaded: [], removed: [] };

  const handler = createHandler({
    requireUser: okAuth,
    admin: makeStorageAdmin(state),
    fetchFn: () =>
      Promise.resolve(
        new Response("<html>login</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    checkRateLimit: noopRateLimit,
  });

  const res = await handler(makeRequest({ url }));
  const body = await res.json();

  assertEquals(res.status, 502);
  assertEquals(body.success, false);
  assertEquals(body.error, "Upstream did not return an image");
  assertEquals(state.uploaded.length, 0, "non-image must not be uploaded");
});

Deno.test("missing url in request body is rejected with 400", async () => {
  const handler = createHandler({
    requireUser: okAuth,
    admin: makeStorageAdmin({ existing: [], uploaded: [], removed: [] }),
    fetchFn: () => Promise.resolve(new Response("", { status: 200 })),
    checkRateLimit: noopRateLimit,
  });

  const res = await handler(makeRequest({}));
  const body = await res.json();

  assertEquals(res.status, 400);
  assertEquals(body.success, false);
  assertEquals(body.error, "Missing or invalid 'url'");
});

Deno.test("rate limit exceeded short-circuits before fetch", async () => {
  const url = "https://media.licdn.com/dms/image/fresh.jpg";
  const state: StorageState = { existing: [], uploaded: [], removed: [] };

  let fetchCalls = 0;
  const handler = createHandler({
    requireUser: okAuth,
    admin: makeStorageAdmin(state),
    fetchFn: () => {
      fetchCalls++;
      return Promise.resolve(new Response("should not run", { status: 200 }));
    },
    checkRateLimit: () =>
      Promise.resolve({
        errorResponse: new Response(
          JSON.stringify({ error: "Rate limit exceeded." }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        ),
      }),
  });

  const res = await handler(makeRequest({ url }));
  const body = await res.json();

  assertEquals(res.status, 429);
  assertEquals(body.error, "Rate limit exceeded.");
  assertEquals(fetchCalls, 0, "rate-limited requests must not hit upstream");
  assertEquals(state.uploaded.length, 0);
});

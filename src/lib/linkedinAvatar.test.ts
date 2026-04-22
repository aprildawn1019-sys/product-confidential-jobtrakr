/**
 * Tests for the pure HTML → avatar-URL extraction logic. Each test
 * simulates what the edge function would receive in a specific real-world
 * scenario:
 *
 *   - "public" responses: a LinkedIn profile page (or Googlebot-cached
 *     copy) that exposes og:image / twitter:image / JSON-LD.
 *   - "blocked" responses: LinkedIn's auth/login wall, which strips out
 *     the profile photo metadata. We must return "" in that case so the
 *     caller falls back to initials cleanly.
 */
import { describe, it, expect } from "vitest";
import { extractAvatarFromHtml, isLinkedInMediaUrl } from "./linkedinAvatar";

describe("extractAvatarFromHtml — public responses", () => {
  it("extracts og:image when present (most common LinkedIn case)", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="https://media.licdn.com/dms/image/profile-photo.jpg" />
        <meta property="og:title" content="Jane Doe | LinkedIn" />
      </head></html>
    `;
    expect(extractAvatarFromHtml(html)).toBe(
      "https://media.licdn.com/dms/image/profile-photo.jpg",
    );
  });

  it("supports single-quoted attribute values", () => {
    const html = `<meta property='og:image' content='https://media.licdn.com/x.jpg' />`;
    expect(extractAvatarFromHtml(html)).toBe("https://media.licdn.com/x.jpg");
  });

  it("falls back to twitter:image when og:image is missing", () => {
    const html = `
      <html><head>
        <meta name="twitter:image" content="https://media.licdn.com/twitter-card.jpg" />
      </head></html>
    `;
    expect(extractAvatarFromHtml(html)).toBe(
      "https://media.licdn.com/twitter-card.jpg",
    );
  });

  it("extracts a string `image` field from JSON-LD as last resort", () => {
    const html = `
      <script type="application/ld+json">
        { "@type": "Person", "name": "Jane Doe", "image": "https://media.licdn.com/jsonld.jpg" }
      </script>
    `;
    expect(extractAvatarFromHtml(html)).toBe(
      "https://media.licdn.com/jsonld.jpg",
    );
  });

  it("extracts an `image.url` object from JSON-LD", () => {
    const html = `
      <script type="application/ld+json">
        { "@type": "Person", "image": { "url": "https://media.licdn.com/obj.jpg" } }
      </script>
    `;
    expect(extractAvatarFromHtml(html)).toBe("https://media.licdn.com/obj.jpg");
  });

  it("extracts an `image.contentUrl` object from JSON-LD", () => {
    const html = `
      <script type="application/ld+json">
        { "@type": "Person", "image": { "contentUrl": "https://media.licdn.com/cu.jpg" } }
      </script>
    `;
    expect(extractAvatarFromHtml(html)).toBe("https://media.licdn.com/cu.jpg");
  });

  it("handles a JSON-LD array (multiple @graph entries)", () => {
    const html = `
      <script type="application/ld+json">
        [
          { "@type": "WebPage" },
          { "@type": "Person", "image": "https://media.licdn.com/array.jpg" }
        ]
      </script>
    `;
    expect(extractAvatarFromHtml(html)).toBe(
      "https://media.licdn.com/array.jpg",
    );
  });

  it("prefers og:image over twitter:image and JSON-LD when all are present", () => {
    const html = `
      <meta property="og:image" content="https://media.licdn.com/og.jpg" />
      <meta name="twitter:image" content="https://media.licdn.com/tw.jpg" />
      <script type="application/ld+json">
        { "image": "https://media.licdn.com/json.jpg" }
      </script>
    `;
    expect(extractAvatarFromHtml(html)).toBe("https://media.licdn.com/og.jpg");
  });
});

describe("extractAvatarFromHtml — blocked / empty responses", () => {
  it("returns empty string for an authwall page (no profile metadata)", () => {
    // This is what LinkedIn returns when bot-detection kicks in — a
    // generic login wall with no person-specific og:image.
    const authwall = `
      <html><head>
        <title>Sign in | LinkedIn</title>
        <meta property="og:title" content="LinkedIn Login, Sign in | LinkedIn" />
        <meta property="og:description" content="Login to LinkedIn to keep in touch..." />
      </head><body>...</body></html>
    `;
    expect(extractAvatarFromHtml(authwall)).toBe("");
  });

  it("returns empty string for a completely empty document", () => {
    expect(extractAvatarFromHtml("")).toBe("");
  });

  it("returns empty string when JSON-LD is malformed (does not throw)", () => {
    const html = `
      <script type="application/ld+json">
        { not valid json at all
      </script>
    `;
    expect(() => extractAvatarFromHtml(html)).not.toThrow();
    expect(extractAvatarFromHtml(html)).toBe("");
  });

  it("ignores JSON-LD where image field is missing or wrong shape", () => {
    const html = `
      <script type="application/ld+json">
        { "@type": "Person", "name": "Jane", "image": 42 }
      </script>
    `;
    expect(extractAvatarFromHtml(html)).toBe("");
  });

  it("does not match an unrelated meta tag that happens to contain 'image'", () => {
    const html = `<meta name="description" content="og:image stuff" />`;
    expect(extractAvatarFromHtml(html)).toBe("");
  });
});

describe("isLinkedInMediaUrl", () => {
  it("recognizes media.licdn.com URLs", () => {
    expect(isLinkedInMediaUrl("https://media.licdn.com/dms/x.jpg")).toBe(true);
  });

  it("recognizes other licdn.com subdomains", () => {
    expect(isLinkedInMediaUrl("https://static.licdn.com/y.jpg")).toBe(true);
  });

  it("rejects non-LinkedIn URLs", () => {
    expect(isLinkedInMediaUrl("https://example.com/avatar.jpg")).toBe(false);
    expect(isLinkedInMediaUrl("https://gravatar.com/avatar/abc")).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(isLinkedInMediaUrl("")).toBe(false);
  });
});

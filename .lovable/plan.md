

## Plan: Finalize JobTrackr Branding

The app code already uses "JobTrackr" consistently across the sidebar, landing page, auth page, and mobile header. However, `index.html` still has placeholder "Lovable App" text in the title and meta tags. This plan fixes that.

### Changes

**`index.html`** — Update all placeholder text:
- `<title>` → "JobTrackr — Your Job Search Command Center"
- `og:title` and `twitter:title` → "JobTrackr — Your Job Search Command Center"
- `meta description`, `og:description`, `twitter:description` → "Track every opportunity. Manage applications, contacts, interviews, and insights in one place."
- `meta author` → "JobTrackr"
- Remove the TODO comments

That's it — one file, ~8 line changes. Everything else (sidebar, landing page, auth page, mobile header, footer) already says "JobTrackr".




# Always Open Dashboard on Login

## Problem
After login, the user stays on whatever URL path they were at (e.g., `/auth`). Since Index.tsx doesn't have a route for `/auth`, the user may see a blank page or the wrong content.

## Solution
Add a `Navigate` redirect in `App.tsx` so that when a session exists and the user is on `/auth`, they are automatically redirected to `/` (the Dashboard).

## Changes

**`src/App.tsx`** — Import `Navigate` from react-router-dom. Inside the `session` branch, add a route for `/auth` that redirects to `/`:

```tsx
{session ? (
  <>
    <Route path="/auth" element={<Navigate to="/" replace />} />
    <Route path="/*" element={<Index />} />
  </>
) : (
  ...
)}
```

This ensures that after authentication completes, the user always lands on the Dashboard regardless of which URL they came from.


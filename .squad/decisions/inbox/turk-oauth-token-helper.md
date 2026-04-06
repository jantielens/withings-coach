# Decision: OAuth Token Helper Uses Local Callback Server

**From:** Turk (Backend Dev)
**Date:** 2025-07-17
**Status:** Implemented

## What

The `scripts/get-token.ts` helper uses a local HTTP server on port 3000 at `/api/auth/callback` to catch the OAuth redirect — the same path the Next.js app would use in production. This means the redirect URI registered in the Withings developer portal (`http://localhost:3000/api/auth/callback`) works for both the helper script and future OAuth integration.

## Why

- No copy-pasting authorization codes manually
- The callback path matches the app's eventual auth route, so one redirect URI registration covers both
- State parameter validation prevents CSRF in the redirect flow

## Trade-off

Port 3000 conflicts with `next dev`. The script is meant to be run standalone before starting the app, not alongside it. If this becomes an issue, we can make the port configurable.

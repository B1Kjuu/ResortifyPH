# Playwright E2E Sanity Environment

For deterministic UI during E2E, set:

NEXT_PUBLIC_E2E=true

This disables Supabase auth gating on the homepage and navbar so tests can rely on visible hero content and navigation links without waiting for auth.

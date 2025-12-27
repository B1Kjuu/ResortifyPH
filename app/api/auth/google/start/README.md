# Google OAuth Start (Disabled)

This API route is intentionally left unused. OAuth flows are initiated client-side via Supabase (`supabase.auth.signInWithOAuth`).

If you later need a server-initiated flow, add a `route.ts` that redirects to the provider start URL and handles CSRF/state.

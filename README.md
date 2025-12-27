# ResortifyPH — Next.js + Supabase MVP

This repository is the active ResortifyPH app built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Supabase (Auth, Database, Storage, Realtime). It includes chat integrity and audit logging, per-user and per-message soft-deletes, Favorites, Reviews, and stable e2e coverage.

Quick start

1. Copy `.env.example` to `.env.local` and fill your Supabase project URL and anon key.

```powershell
copy .env.example .env.local
# then edit .env.local to add your keys
code .env.local
```

2. Install dependencies and run dev server

```powershell
npm install
npm run dev
```

3. Run the SQL in `supabase_schema.sql` from the Supabase SQL editor to create required tables.

## Current Features

- Public: Landing, Resorts catalog, Resort detail with availability calendar, map/location filters, and URL-synced filters
- Auth: Email/password with roles (guest/owner/admin); role switching and admin moderation tightening on admin pages
- Owner: Create/edit resorts, image uploads to Storage, booking management
- Guest: Adventure Hub, Trips (Upcoming excludes rejected; History shows past/rejected)
- Chat: Unique chatrooms per booking and pre-booking by resort; immutable `chat_message_audit` table and triggers; per-user chat soft-delete; per-message soft-delete with audit; restore-on-open client behavior
- Favorites: Persisted favorites; dedicated page; wired via Adventure Hub “Manage” link; no Navbar entry
- Reviews: Guests can review post-stay; eligibility computed and banner prompt on resort pages; management page with “Ready to Review” list
- Components: `Navbar`, `Footer`, `ResortCard`, `ImageUploader`, `DashboardSidebar`, `DateRangePicker`, `ChatWindow`, `MessageList`, `ChatList`
- E2E: Playwright tests for home, navigation, help center, resorts, favorites; Firefox/Chromium/WebKit stability fixes

## Notes & next steps

- Payments: Deferred for now; coordinate payment in-chat. A system guidance message is sent automatically on booking creation.
- Profiles: In production, prefer server-side insertion via functions or Supabase Auth hooks.
- Admin: Approval flows exist; moderation UI tightened (read-only bookings; restricted entry points on admin pages).
- Presence/typing: Future enhancement for chat; marketing emails later.

## End-to-End Tests

Playwright now powers smoke coverage for the public experience.

1. Install browsers (once per machine):
   ```bash
   npx playwright install
   ```
2. Run the suite (automatically boots `npm run dev` on port 3000):
   ```bash
   npm run test:e2e
   ```
3. Debug interactively:
   ```bash
   npm run test:e2e:headed
   ```
4. Inspect the latest HTML report:
   ```bash
   npm run test:e2e:report
   ```

Set `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_HOST`, or `PLAYWRIGHT_PORT` to point at another environment, and `PLAYWRIGHT_SKIP_WEB_SERVER=1` if you already have `npm run dev` running locally.

## Database highlights

- `chat_message_audit` with triggers on `chat_messages` (insert/update/delete) for immutable logs
- Soft-deletes: `deleted_at` on `chat_participants` and `chat_messages`; RLS and queries honor soft-deleted records appropriately
- Uniqueness: Unique chats for `booking_id` and `(resort_id, creator_id)`; dedup migrations reassign messages/participants before indexing
- Reviews: `reviews` table with RLS; `create_review_safe` RPC enforces eligibility and prevents duplicates
- Notifications: `notify_chat_message` trigger publishes events for realtime

See `supabase/migrations/*` for SQL.

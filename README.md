# ResortifyPH — Next.js + Supabase MVP

This repository is a minimal MVP for ResortifyPH built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Supabase (Auth, Database, Storage).

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

Features implemented

- Landing page, resorts list, resort detail
- Auth (email/password) with role selection (guest/owner)
- Owner dashboard to create resorts and upload images to Supabase Storage
- Bookings page (guest bookings view)
- Components: `Navbar`, `Footer`, `ResortCard`, `ImageUploader`, `DashboardSidebar`

Notes & next steps

- In production, create a server-side function or Supabase Auth hook to create `profiles` rows when users sign up instead of client-side upsert.
- Add admin UI to approve resorts.
- Add payment integrations and calendar availability checks.

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

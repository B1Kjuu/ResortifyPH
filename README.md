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

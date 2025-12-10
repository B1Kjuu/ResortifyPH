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

## 📚 Documentation

### Feature Enhancement Guides
- **[RECOMMENDATIONS.md](./RECOMMENDATIONS.md)** - Comprehensive feature specifications for 20+ Airbnb-inspired features with database schemas and implementation details
- **[FEATURE_COMPARISON.md](./FEATURE_COMPARISON.md)** - Strategic roadmap, ROI analysis, and feature parity comparison with Airbnb (currently 43%)
- **[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)** - Practical implementation guide with code templates and step-by-step instructions

### Recent Updates
- **[IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md)** - Summary of recent feature additions
- **[DESIGN_SYSTEM_GUIDE.md](./DESIGN_SYSTEM_GUIDE.md)** - Design system documentation

## 🚀 Next Steps

### Quick Wins (1-2 weeks)
Start with high-impact, low-effort features:
1. Wishlist/Favorites system (2 days)
2. Social proof badges (3 days)
3. Email notifications (1 week)
4. Recently viewed properties (2 days)
5. Verified user badges (3 days)

See [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) for implementation details.

### Foundation Features (3 months)
Build platform trust and enable transactions:
1. Reviews & Ratings system
2. Messaging between guests and hosts
3. Payment integration (Stripe, GCash, PayMaya)
4. Calendar & availability management
5. Trust & safety features

See [RECOMMENDATIONS.md](./RECOMMENDATIONS.md) for complete specifications.

## Notes

- In production, create a server-side function or Supabase Auth hook to create `profiles` rows when users sign up instead of client-side upsert.
- See [FEATURE_COMPARISON.md](./FEATURE_COMPARISON.md) for 12-month roadmap and ROI projections.

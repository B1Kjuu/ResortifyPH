# ResortifyPH — Next.js + Supabase MVP

This repository is a minimal MVP for ResortifyPH built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Supabase (Auth, Database, Storage).

## Prerequisites

Before you begin, ensure you have:
- Node.js 18.17 or later installed
- A Supabase account and project (sign up at https://supabase.com)
- Git installed on your machine

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/B1Kjuu/ResortifyPH.git
cd ResortifyPH
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
# On Unix/Mac/Linux:
cp .env.example .env.local

# On Windows (PowerShell):
copy .env.example .env.local
```

Then edit `.env.local` with your Supabase project credentials:
- Get your Supabase URL and keys from: https://app.supabase.com/project/_/settings/api

```bash
# Edit the file with your preferred editor
code .env.local  # VS Code
# or
nano .env.local  # Terminal editor
```

### 3. Set up the database

Run the SQL in `supabase_schema.sql` from the Supabase SQL editor:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the entire content of `supabase_schema.sql`
4. Paste and execute it

This will create:
- `profiles` table (user profiles with roles)
- `resorts` table (resort listings)
- `bookings` table (booking records)
- Necessary indexes for performance

### 4. Set up storage bucket

Create a storage bucket for resort images:
1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `resort-images`
3. Set it to public (or configure appropriate policies)

### 5. Install dependencies and run

```bash
npm install
npm run dev
```

The application will be available at http://localhost:3000

## Features Implemented

- **Landing page** with hero section and feature highlights
- **Resort browsing** with list and detail views
- **Authentication** (email/password) with role selection (guest/owner/admin)
- **Owner dashboard** to create resorts and upload images to Supabase Storage
- **Guest bookings** view to manage trips
- **Admin panel** for resort approvals and booking management
- **Responsive design** with Tailwind CSS
- **Key components**: `Navbar`, `Footer`, `ResortCard`, `ImageUploader`, `DashboardSidebar`

## Project Structure

```
ResortifyPH/
├── app/                    # Next.js 14 App Router pages
│   ├── admin/             # Admin dashboard pages
│   ├── auth/              # Authentication pages (login, register)
│   ├── guest/             # Guest-specific pages
│   ├── owner/             # Owner-specific pages
│   ├── resorts/           # Resort listing and detail pages
│   └── profile/           # User profile page
├── components/            # Reusable React components
├── lib/                   # Utility functions and configurations
│   └── supabaseClient.ts # Supabase client initialization
├── public/               # Static assets
└── supabase_schema.sql   # Database schema
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Troubleshooting

### Build errors with missing environment variables

If you get errors about missing Supabase URL or keys during build:
1. Ensure `.env.local` exists and contains valid credentials
2. For production builds, set environment variables in your hosting platform

### Authentication not working

1. Verify Supabase credentials are correct in `.env.local`
2. Check that the `profiles` table exists in your database
3. Ensure email confirmation is disabled in Supabase Auth settings (for development)

### Images not uploading

1. Verify the `resort-images` bucket exists in Supabase Storage
2. Check that the bucket has public access or appropriate RLS policies
3. Confirm `NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET` matches your bucket name

## Security Considerations

- Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY`
- Configure Row Level Security (RLS) policies in Supabase for production
- Enable email confirmation for production environments
- Consider rate limiting for API endpoints

## Notes & Next Steps

- **Security**: Implement server-side profile creation using Supabase Auth hooks instead of client-side upserts
- **Features**: Add payment integrations (e.g., PayMongo, PayPal)
- **Features**: Add calendar availability checks and booking conflicts prevention
- **Performance**: Implement image optimization and lazy loading
- **Testing**: Add unit and integration tests
- **Monitoring**: Add error tracking (e.g., Sentry)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is for educational and portfolio purposes.

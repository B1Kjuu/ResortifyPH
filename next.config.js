/** @type {import('next').NextConfig} */
// Next.js 14 enables the App Router (`app/`) by default. Remove deprecated experimental flags.
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xbyxreqfoiwvpfrkopur.supabase.co',
        pathname: '/storage/v1/object/public/**'
      }
    ]
  }
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
// Next.js 14 enables the App Router (`app/`) by default. Remove deprecated experimental flags.
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  analyzerMode: 'static',
  openAnalyzer: false,
  analyzeServer: false,
  analyzeBrowser: true,
  generateStatsFile: true,
  statsFilename: 'bundle-stats.json'
})

// Resolve Supabase hostname from env so Next/Image accepts actual project host
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseHostname = null
try {
  if (supabaseUrl) supabaseHostname = new URL(supabaseUrl).hostname
} catch {}

const nextConfig = {
  images: {
    remotePatterns: [
      // Fallback to the previously used host (kept for safety)
      {
        protocol: 'https',
        hostname: 'xbyxreqfoiwvpfrkopur.supabase.co',
        pathname: '/storage/v1/object/public/**'
      },
      // Allow images from the current Supabase project host (from env)
      ...(supabaseHostname ? [{
        protocol: 'https',
        hostname: supabaseHostname,
        pathname: '/storage/v1/object/public/**'
      }] : []),
      // Optional: enable common avatar providers if needed later
      // { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' }
    ]
  },
  async rewrites() {
    // Workaround for some proxies/CDNs double-encoding dynamic segment brackets in Next chunk paths
    // Example: "%5BbookingId%5D" becomes "%255BbookingId%255D" causing 404 and MIME errors.
    return [
      // Generic rule: fix any double-encoded brackets under app chunks
      {
        source: '/_next/static/chunks/app/:path*/%255B:segment%255D/:file*',
        destination: '/_next/static/chunks/app/:path*/%5B:segment%5D/:file*'
      },
      // Specific chat booking route
      {
        source: '/_next/static/chunks/app/chat/%255BbookingId%255D/:file*',
        destination: '/_next/static/chunks/app/chat/%5BbookingId%5D/:file*'
      },
      // Specific chat resort route
      {
        source: '/_next/static/chunks/app/chat/resort/%255BresortId%255D/:file*',
        destination: '/_next/static/chunks/app/chat/resort/%5BresortId%5D/:file*'
      }
    ]
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'
    return [
      {
        source: '/(.*)',
        headers: [
            // CSP is set dynamically via middleware with per-request nonce
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=()' }
        ]
      }
    ]
  },
  webpack: (config, { isServer }) => {
    // Ensure webpack runtime uses globalThis instead of new Function('return this')
    config.output = {
      ...(config.output || {}),
      globalObject: 'globalThis'
    }
    // Exclude libraries that may rely on eval/new Function from client bundles
    if (!isServer) {
      config.resolve = config.resolve || {}
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'source-map-js': false,
        sucrase: false,
      }
    }
    return config
  }
}

module.exports = withBundleAnalyzer(nextConfig)

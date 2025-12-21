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

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xbyxreqfoiwvpfrkopur.supabase.co',
        pathname: '/storage/v1/object/public/**'
      }
    ]
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'
    const csp = isDev
      ? "default-src 'self'; img-src 'self' data: https://xbyxreqfoiwvpfrkopur.supabase.co; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://xbyxreqfoiwvpfrkopur.supabase.co ws:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
      : "default-src 'self'; img-src 'self' data: https://xbyxreqfoiwvpfrkopur.supabase.co; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://xbyxreqfoiwvpfrkopur.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=()' }
        ]
      }
    ]
  }
  ,webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve || {}
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        // Exclude libraries that may rely on eval/new Function from client bundles
        'source-map-js': false,
        sucrase: false,
      }
    }
    return config
  }
}

module.exports = withBundleAnalyzer(nextConfig)

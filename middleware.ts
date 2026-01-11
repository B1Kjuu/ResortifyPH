import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from './lib/edgeRateLimit'

// Cookie flag set during recovery flow to force user into reset-password until completion
const PASSWORD_RESET_COOKIE = 'resortify_password_reset_pending'

// Simple in-memory IP-based rate limiter (best-effort). For production, use Redis (e.g., Upstash).
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10 // per WINDOW_MS
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // Cleanup every 5 minutes

type Entry = { count: number; windowStart: number }
const buckets = new Map<string, Entry>()
let lastCleanup = Date.now()

// Cleanup stale entries to prevent memory leak
function cleanupStaleEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      buckets.delete(key)
    }
  }
  lastCleanup = now
}

function allow(ip: string | undefined): boolean {
  cleanupStaleEntries()
  const key = ip || 'unknown'
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry) {
    buckets.set(key, { count: 1, windowStart: now })
    return true
  }
  if (now - entry.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= MAX_REQUESTS) return false
  entry.count += 1
  return true
}

function getClientIp(req: NextRequest): string {
  const header = req.headers.get('x-forwarded-for')
  const forwarded = header?.split(',')[0]?.trim()
  return req.ip || forwarded || 'unknown'
}

function getApiGroup(pathname: string): string {
  if (pathname.startsWith('/api/notifications')) return 'notifications'
  if (pathname.startsWith('/api/payments')) return 'payments'
  if (pathname.startsWith('/api/resorts')) return 'resorts'
  if (pathname.startsWith('/api/admin')) return 'admin'
  if (pathname.startsWith('/api/email')) return 'email'
  return 'api'
}

async function allowWithSharedLimiter(req: NextRequest, scope: 'api:write' | 'api:read'): Promise<{ ok: boolean; headers?: Headers; status?: number }> {
  const ip = getClientIp(req)
  const group = getApiGroup(req.nextUrl.pathname)
  const key = `${ip}:${group}`

  try {
    const result = await rateLimit({ scope, key })
    if (!result.ok) {
      const headers = new Headers()
      if (result.limit != null) headers.set('X-RateLimit-Limit', String(result.limit))
      if (result.remaining != null) headers.set('X-RateLimit-Remaining', String(result.remaining))
      if (result.reset != null) headers.set('X-RateLimit-Reset', String(result.reset))
      return { ok: false, headers, status: 429 }
    }
    return { ok: true }
  } catch {
    // If Upstash is misconfigured or transiently down, fail open and rely on fallback.
    return { ok: true }
  }
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  // Normalize double-encoded bracket segments everywhere (including /_next/static chunks).
  // Some proxies/CDNs will double-encode dynamic segment brackets in chunk URLs:
  //   %5Bid%5D -> %255Bid%255D
  // IMPORTANT: use rewrite (not redirect). Some browsers will complain about the
  // redirect response MIME type for <script> loads under strict checking.
  if (pathname.includes('%255B') || pathname.includes('%255D')) {
    const fixedPath = pathname
      .replaceAll('%255B', '%5B')
      .replaceAll('%255D', '%5D')
    if (fixedPath !== pathname) {
      const url = req.nextUrl.clone()
      url.pathname = fixedPath
      return NextResponse.rewrite(url)
    }
  }

  // Skip middleware for static assets and Next.js internals to prevent 404s
  if (
    pathname === '/opengraph-image' ||
    pathname === '/twitter-image' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|css|js|json)$/)
  ) {
    // Still apply rate limiting for API routes
    if (pathname.startsWith('/api')) {
      const isWrite = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
      if (isWrite) {
        const shared = await allowWithSharedLimiter(req, 'api:write')
        if (!shared.ok) return new NextResponse('Too Many Requests', { status: 429, headers: shared.headers })

        const ok = allow(getClientIp(req))
        if (!ok) return new NextResponse('Too Many Requests', { status: 429 })
      }

      // Also protect expensive read endpoints (availability/pricing/listings) under load.
      // This is intentionally looser than writes.
      if (method === 'GET' && (pathname.startsWith('/api/resorts') || pathname.startsWith('/api/payments'))) {
        const shared = await allowWithSharedLimiter(req, 'api:read')
        if (!shared.ok) return new NextResponse('Too Many Requests', { status: 429, headers: shared.headers })
      }
    }
    return NextResponse.next()
  }

  // If user is in a password-reset session, force them to the reset page for safety
  // But allow access to signin/signup so they can escape if needed
  const resetPending = req.cookies.get(PASSWORD_RESET_COOKIE)?.value
  const isAuthRoute = pathname.startsWith('/auth/')
  if (resetPending && !isAuthRoute) {
    return NextResponse.redirect(new URL('/auth/reset-password?verified=true', req.url))
  }

  // Scope: protect write endpoints (POST/PUT/PATCH/DELETE) under /api
  const isWrite = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
  const isApi = pathname.startsWith('/api') || pathname.startsWith('/app/api')

  if (isWrite && isApi) {
    const shared = await allowWithSharedLimiter(req, 'api:write')
    if (!shared.ok) return new NextResponse('Too Many Requests', { status: 429, headers: shared.headers })

    const ok = allow(getClientIp(req))
    if (!ok) return new NextResponse('Too Many Requests', { status: 429 })
  }

  // Generate per-request CSP nonce and attach CSP header
  const headers = new Headers(req.headers)
  const isProd = process.env.NODE_ENV === 'production'
  const nonce = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
    ? (globalThis.crypto as any).randomUUID()
    : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  headers.set('x-csp-nonce', nonce)

  const supabaseHost = 'https://xbyxreqfoiwvpfrkopur.supabase.co'
  const supabaseWss = 'wss://xbyxreqfoiwvpfrkopur.supabase.co'
  const imgSources = [
    `'self'`,
    `data:`,
    supabaseHost,
    `https://images.unsplash.com`,
    `https://lh3.googleusercontent.com`,
    `https://*.tile.openstreetmap.org`,
    `https://staticmap.openstreetmap.de`, // OpenStreetMap static map service
    `https://maps.googleapis.com`,
    `https://maps.gstatic.com`,
    `https://*.ggpht.com`,
    `https://maps.geoapify.com`,
  ].join(' ')

  const nominatim = 'https://nominatim.openstreetmap.org'
  const googleMaps = 'https://maps.googleapis.com https://maps.gstatic.com'
  const googleFonts = 'https://fonts.googleapis.com https://fonts.gstatic.com'
  // Frame sources for map embeds
  const frameSources = 'https://www.google.com https://maps.google.com https://www.openstreetmap.org'
  
  // CSP policy - production is stricter, dev allows unsafe-inline for HMR and debugging
  // Google Maps requires 'unsafe-inline' as it dynamically injects inline scripts
  const csp = isProd
    ? `default-src 'self'; img-src ${imgSources}; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com; style-src 'self' 'unsafe-inline' ${googleFonts}; font-src 'self' ${googleFonts} data:; connect-src 'self' ${supabaseHost} ${supabaseWss} ${nominatim} ${googleMaps}; frame-src ${frameSources}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
    : `default-src 'self'; img-src ${imgSources}; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com; style-src 'self' 'unsafe-inline' ${googleFonts}; font-src 'self' ${googleFonts} data:; connect-src 'self' ${supabaseHost} ${supabaseWss} ${nominatim} ${googleMaps} ws:; frame-src ${frameSources}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`

  const res = NextResponse.next({ request: { headers } })
  res.headers.set('Content-Security-Policy', csp)
  
  // Add performance headers for caching static assets
  if (pathname.startsWith('/_next/static/')) {
    res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2)$/)) {
    res.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  }
  
  return res
}

export const config = {
  matcher: ['/(.*)']
}

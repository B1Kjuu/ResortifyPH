import { NextRequest, NextResponse } from 'next/server'

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

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  // Scope: protect write endpoints (POST/PUT/PATCH/DELETE) under /api
  const isWrite = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
  const isApi = pathname.startsWith('/api') || pathname.startsWith('/app/api')

  if (isWrite && isApi) {
    const ok = allow(req.ip)
    if (!ok) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
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
    `https://maps.googleapis.com`,
    `https://maps.gstatic.com`,
    `https://*.ggpht.com`,
  ].join(' ')

  const nominatim = 'https://nominatim.openstreetmap.org'
  const googleMaps = 'https://maps.googleapis.com https://maps.gstatic.com'
  const googleFonts = 'https://fonts.googleapis.com https://fonts.gstatic.com'
  const csp = isProd
    ? `default-src 'self'; img-src ${imgSources}; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' ${googleFonts}; font-src 'self' ${googleFonts} data:; connect-src 'self' ${supabaseHost} ${supabaseWss} ${nominatim} ${googleMaps}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
    : `default-src 'self'; img-src ${imgSources}; script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' ${googleFonts}; font-src 'self' ${googleFonts} data:; connect-src 'self' ${supabaseHost} ${supabaseWss} ${nominatim} ${googleMaps} ws:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`

  // Normalize double-encoded bracket segments in Next static chunk paths
  // e.g. %255BbookingId%255D -> %5BbookingId%5D
  if (pathname.startsWith('/_next/static/chunks/app/')) {
    const fixedPath = pathname
      .replaceAll('%255B', '%5B')
      .replaceAll('%255D', '%5D')
    if (fixedPath !== pathname) {
      const url = req.nextUrl.clone()
      url.pathname = fixedPath
      const rewriteRes = NextResponse.rewrite(url, { request: { headers } })
      rewriteRes.headers.set('Content-Security-Policy', csp)
      return rewriteRes
    }
  }

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

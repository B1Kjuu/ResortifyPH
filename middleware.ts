import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory IP-based rate limiter (best-effort). For production, use Redis (e.g., Upstash).
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10 // per WINDOW_MS

type Entry = { count: number; windowStart: number }
const buckets = new Map<string, Entry>()

function allow(ip: string | undefined): boolean {
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
  ].join(' ')

  const nominatim = 'https://nominatim.openstreetmap.org'
  const csp = isProd
    ? `default-src 'self'; img-src ${imgSources}; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${supabaseHost} ${supabaseWss} ${nominatim}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
    : `default-src 'self'; img-src ${imgSources}; script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${supabaseHost} ${supabaseWss} ${nominatim} ws:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`

  const res = NextResponse.next({ request: { headers } })
  res.headers.set('Content-Security-Policy', csp)
  return res
}

export const config = {
  matcher: ['/(.*)']
}

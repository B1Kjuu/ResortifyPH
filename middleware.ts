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

export function middleware(req: NextRequest) {
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/app/api/:path*']
}

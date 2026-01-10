import { NextRequest, NextResponse } from 'next/server'

function sanitizeNextPath(value: string | null): string {
  if (!value) return '/'
  // Only allow same-origin relative paths to prevent open redirects.
  if (!value.startsWith('/')) return '/'
  // Avoid protocol-relative URLs.
  if (value.startsWith('//')) return '/'
  return value
}

export async function GET(req: NextRequest) {
  const nextPath = sanitizeNextPath(req.nextUrl.searchParams.get('next'))

  const redirectUrl = new URL(nextPath, req.url)
  const res = NextResponse.redirect(redirectUrl, { status: 307 })

  // Best-effort: clears the HTTP cache for this origin in supporting browsers.
  // We intentionally do NOT clear storage/cookies to avoid logging users out.
  res.headers.set('Clear-Site-Data', '"cache"')
  res.headers.set('Cache-Control', 'no-store')

  return res
}

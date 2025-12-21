import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Endpoint removed: always return 404 in all environments.
export async function GET() {
  return new NextResponse(null, { status: 404 })
}

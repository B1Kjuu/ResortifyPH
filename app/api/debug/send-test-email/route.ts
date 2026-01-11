import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, brandEmailTemplate } from 'lib/email'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

/**
 * POST /api/debug/send-test-email
 * Sends a test email to the currently authenticated user's email.
 *
 * Body: { subject?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser()
    if (!authUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subject } = await req.json().catch(() => ({}))
    const finalSubject = typeof subject === 'string' && subject.trim()
      ? subject.trim().slice(0, 120)
      : 'ResortifyPH test email'

    const html = brandEmailTemplate({
      title: finalSubject,
      intro: 'If you received this, Resend is configured correctly.',
      rows: [
        { label: 'To', value: authUser.email },
        { label: 'Environment', value: process.env.NODE_ENV ?? 'unknown' },
      ],
      cta: { label: 'Open ResortifyPH', href: req.nextUrl.origin },
      type: 'notification',
    })

    const res = await sendEmail({
      to: authUser.email,
      subject: finalSubject,
      html,
    })

    return NextResponse.json({ ok: true, id: (res as any)?.data?.id ?? null })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'Send failed' }, { status: 500 })
  }
}

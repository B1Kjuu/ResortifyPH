import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "lib/email";
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getServerSupabaseOrNull } from "lib/supabaseServer";

// Helper to verify the request is from an authenticated admin
async function getAuthenticatedAdmin() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set() {},
          remove() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    // Check if user is admin
    const sb = getServerSupabaseOrNull()
    if (sb) {
      const { data: profile } = await sb
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      if (profile?.is_admin) return user
    }
    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const enabled = process.env.EMAIL_TEST_ENABLED === "true";
    if (!enabled) {
      return NextResponse.json(
        { error: "Email test route disabled" },
        { status: 403 }
      );
    }

    // Security: Only admins can use the test email route
    const adminUser = await getAuthenticatedAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { to, subject, html, text, from } = await req.json();
    const res = await sendEmail({
      to,
      subject: subject ?? "ResortifyPH test",
      html: html ?? "<p>Hello from ResortifyPH</p>",
      text,
      fromOverride: from,
    });

    return NextResponse.json({ id: (res as any)?.data?.id ?? null, ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Send failed" }, { status: 500 });
  }
}
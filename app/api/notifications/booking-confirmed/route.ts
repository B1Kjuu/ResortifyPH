import { NextRequest, NextResponse } from "next/server";
import { sendEmail, brandEmailTemplate } from "lib/email";
import { getServerSupabaseOrNull } from "lib/supabaseServer";
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Helper to verify the request is from an authenticated user
async function getAuthenticatedUser() {
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
    return user
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    // Security: Verify the user is authenticated
    const authUser = await getAuthenticatedUser()
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      to,
      resortName,
      dateFrom,
      dateTo,
      link,
      userId,
      status, // 'pending' | 'approved' | 'rejected'
    } = await req.json();

    // Security: Ensure userId matches authenticated user (prevent spoofing)
    if (userId && userId !== authUser.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 })
    }

    if (!to || !resortName || !dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const subjectMap: Record<string, string> = {
      pending: `Booking Request Submitted – ${resortName}`,
      approved: `Your Booking is Confirmed! – ${resortName}`,
      rejected: `Booking Not Approved – ${resortName}`,
    };

    const introMap: Record<string, string> = {
      pending: '📋 Your booking request has been submitted! The host will review your request shortly.',
      approved: '🎉 Great news! Your booking has been confirmed by the host.',
      rejected: '😔 Unfortunately, your booking request was not approved this time.',
    };

    const emailStatus = status || 'pending'
    const subject = subjectMap[emailStatus] || subjectMap.pending
    const intro = introMap[emailStatus] || introMap.pending

    const html = brandEmailTemplate({
      title: subject,
      intro,
      rows: [
        { label: 'Resort', value: resortName },
        { label: 'Dates', value: `${dateFrom} → ${dateTo}` },
      ],
      cta: link ? { label: 'View Booking', href: link } : undefined,
      type: 'booking',
    });

    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
    let res: any = null;
    if (!dryRun) {
      res = await sendEmail({ to, subject, html });
    }

    // Optional: log notification in Supabase if service role is configured
    try {
      const sb = getServerSupabaseOrNull();
      if (sb) {
        await sb.from("notifications").insert({
          user_id: userId ?? null,
          type: "booking_confirmed_email",
          to_email: Array.isArray(to) ? to.join(",") : to,
          subject,
          status: dryRun ? "dry_run" : "sent",
        });
      }
    } catch (logErr) {
      // non-fatal
    }

    return NextResponse.json({ id: res?.data?.id ?? null, ok: true, dryRun });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Send failed" }, { status: 500 });
  }
}

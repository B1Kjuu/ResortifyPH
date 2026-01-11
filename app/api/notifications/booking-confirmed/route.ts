import { NextRequest, NextResponse } from "next/server";
import { sendEmail, brandEmailTemplate } from "lib/email";
import { getServerSupabaseOrNull } from "lib/supabaseServer";
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Helper to verify the request is from an authenticated user
async function getAuthenticatedUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
    const bearerToken = bearerMatch?.[1]?.trim()
    if (bearerToken) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (url && anonKey) {
        const tokenClient = createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
        const { data: { user } } = await tokenClient.auth.getUser(bearerToken)
        if (user) return user
      }
    }

    const cookieStore = await cookies()
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
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      console.error("❌ [booking-confirmed] Unauthorized - no authenticated user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("✅ [booking-confirmed] Request from user:", authUser.id, authUser.email);

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
    let emailError = null;
    
    if (!dryRun) {
      try {
        res = await sendEmail({ to, subject, html });
        console.log("✅ [booking-confirmed] Email sent:", res?.data?.id);
      } catch (emailErr: any) {
        emailError = emailErr.message || "Email send failed";
        console.error("❌ [booking-confirmed] Email failed:", emailError);
        // Continue to log the attempt even if email fails
      }
    }

    // Optional: log notification in Supabase if service role is configured
    try {
      const sb = getServerSupabaseOrNull();
      if (sb) {
        await sb.from("notifications").insert({
          user_id: userId ?? null,
          type: "booking_confirmed_email",
          actor_id: authUser.id,
          title: subject,
          body: intro,
          link: link ?? null,
          metadata: {
            resortName,
            dateFrom,
            dateTo,
            bookingStatus: emailStatus,
            email: {
              to: Array.isArray(to) ? to.join(',') : to,
              subject,
              status: dryRun ? 'dry_run' : emailError ? 'failed' : 'sent',
              error: emailError,
            },
          },
        });
      }
    } catch (logErr) {
      // non-fatal
    }

    if (emailError && !dryRun) {
      return NextResponse.json({ 
        error: emailError, 
        ok: false 
      }, { status: 500 });
    }

    console.log("✅ [booking-confirmed] Success - notification sent to:", to);
    return NextResponse.json({ id: res?.data?.id ?? null, ok: true, dryRun });
  } catch (error: any) {
    console.error("❌ [booking-confirmed] Unexpected error:", error);
    return NextResponse.json({ error: error?.message ?? "Send failed" }, { status: 500 });
  }
}

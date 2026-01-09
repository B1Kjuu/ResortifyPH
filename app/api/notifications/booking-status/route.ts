import { NextRequest, NextResponse } from "next/server";
import { sendBookingEmail } from "lib/email";
import { getServerSupabaseOrNull } from "lib/supabaseServer";
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Helper to verify the request is from an authenticated user
async function getAuthenticatedUser() {
  try {
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
    const authUser = await getAuthenticatedUser()
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      to,
      status, // "created" | "approved" | "rejected"
      resortName,
      dateFrom,
      dateTo,
      link,
      userId,
    } = await req.json();

    // Security: Ensure userId matches authenticated user (prevent spoofing)
    if (userId && userId !== authUser.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 })
    }

    if (!to || !status || !resortName || !dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["created", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
    let res: any = null;
    if (!dryRun) {
      res = await sendBookingEmail(to, status as any, {
        resortName,
        dateFrom,
        dateTo,
        link,
      });
    }

    // Optional: log notification in Supabase if service role is configured
    try {
      const sb = getServerSupabaseOrNull();
      if (sb) {
        await sb.from("notifications").insert({
          user_id: userId ?? null,
          type: "booking_status",
          to_email: Array.isArray(to) ? to.join(",") : to,
          subject: `Booking ${status}: ${resortName}`,
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
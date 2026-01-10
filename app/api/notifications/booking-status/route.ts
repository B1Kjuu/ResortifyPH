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
      bookingId,
      actorUserId,
      recipientUserId,
    } = await req.json();

    // Security: Ensure actorUserId matches authenticated user (prevent spoofing)
    if (actorUserId && actorUserId !== authUser.id) {
      return NextResponse.json({ error: "Actor mismatch" }, { status: 403 })
    }

    // Security: if emailing someone other than yourself, require bookingId validation
    const toNormalized = Array.isArray(to)
      ? to.map((x: any) => String(x).trim().toLowerCase())
      : [String(to ?? '').trim().toLowerCase()]
    const authEmail = String(authUser.email ?? '').trim().toLowerCase()

    if (toNormalized.some(e => e && e !== authEmail)) {
      if (!bookingId) {
        return NextResponse.json({ error: "bookingId is required when emailing another user" }, { status: 400 })
      }
      const sb = getServerSupabaseOrNull()
      if (!sb) {
        return NextResponse.json({ error: "Server email validation unavailable" }, { status: 500 })
      }

      const { data: booking, error: bookingErr } = await sb
        .from('bookings')
        .select('id, guest_id, resort_id')
        .eq('id', bookingId)
        .maybeSingle()

      if (bookingErr || !booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 })
      }

      const { data: resortRow, error: resortErr } = await sb
        .from('resorts')
        .select('id, owner_id')
        .eq('id', booking.resort_id)
        .maybeSingle()

      if (resortErr || !resortRow?.owner_id) {
        return NextResponse.json({ error: "Resort not found" }, { status: 404 })
      }

      // Caller must be part of this booking (guest or owner)
      const isParticipant = authUser.id === booking.guest_id || authUser.id === resortRow.owner_id
      if (!isParticipant) {
        return NextResponse.json({ error: "Not allowed" }, { status: 403 })
      }

      const ids = [booking.guest_id, resortRow.owner_id].filter(Boolean)
      const { data: profiles, error: profErr } = await sb
        .from('profiles')
        .select('id, email')
        .in('id', ids)

      if (profErr) {
        return NextResponse.json({ error: "Failed to resolve booking participants" }, { status: 500 })
      }

      const allowedEmails = (profiles || [])
        .map((p: any) => String(p.email || '').trim().toLowerCase())
        .filter(Boolean)

      const ok = toNormalized.every(e => !e || allowedEmails.includes(e))
      if (!ok) {
        return NextResponse.json({ error: "Recipient not allowed" }, { status: 403 })
      }
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
          user_id: recipientUserId ?? null,
          type: "booking_status",
          to_email: Array.isArray(to) ? to.join(",") : to,
          subject: `Booking ${status}: ${resortName}`,
          status: dryRun ? "dry_run" : "sent",
          metadata: bookingId ? { bookingId } : null,
        });
      }
    } catch {
      // non-fatal
    }

    return NextResponse.json({ id: res?.data?.id ?? null, ok: true, dryRun });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Send failed" }, { status: 500 });
  }
}
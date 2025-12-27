import { NextRequest, NextResponse } from "next/server";
import { sendBookingEmail } from "lib/email";
import { getServerSupabaseOrNull } from "lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const {
      to,
      status, // "created" | "approved" | "rejected"
      resortName,
      dateFrom,
      dateTo,
      link,
      userId,
    } = await req.json();

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
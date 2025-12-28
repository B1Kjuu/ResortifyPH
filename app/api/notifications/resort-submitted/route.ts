import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "lib/email";
import { getServerSupabaseOrNull } from "lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const {
      resortName,
      ownerName,
      ownerEmail,
      ownerId,
      location,
      price,
    } = await req.json();

    if (!resortName || !ownerEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Determine admin recipients
    const sb = getServerSupabaseOrNull();
    let adminEmails: string[] = [];
    if (sb) {
      try {
        const { data } = await sb
          .from("profiles")
          .select("email")
          .eq("is_admin", true);
        adminEmails = (data || []).map((r: any) => r.email).filter(Boolean);
      } catch {
        // ignore
      }
    }
    if (adminEmails.length === 0) {
      const fallback = process.env.ADMIN_NOTIFY_EMAILS || "";
      adminEmails = fallback
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    if (adminEmails.length === 0) {
      return NextResponse.json(
        { error: "No admin recipients configured" },
        { status: 500 }
      );
    }

    const subject = `New resort submitted: ${resortName}`;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
        <h2>New Resort Submission</h2>
        <p><strong>Resort:</strong> ${resortName}</p>
        ${location ? `<p><strong>Location:</strong> ${location}</p>` : ""}
        ${price ? `<p><strong>Base price:</strong> ₱${Number(price).toLocaleString()}</p>` : ""}
        <p><strong>Owner:</strong> ${ownerName || ownerEmail}</p>
        <p>Open Approvals: /admin/approvals</p>
      </div>
    `;
    const text = `New resort submitted: ${resortName}\nOwner: ${ownerName || ownerEmail}\nApprovals: /admin/approvals`;

    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
    let res: any = null;
    if (!dryRun) {
      res = await sendEmail({ to: adminEmails, subject, html, text });
    }

    try {
      if (sb) {
        await sb.from("notifications").insert({
          user_id: ownerId ?? null,
          type: "resort_submitted",
          to_email: adminEmails.join(","),
          subject,
          status: dryRun ? "dry_run" : "sent",
        });
      }
    } catch {}

    return NextResponse.json({ id: res?.data?.id ?? null, ok: true, dryRun });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Send failed" }, { status: 500 });
  }
}
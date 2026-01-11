import { NextRequest, NextResponse } from "next/server";
import { sendEmail, brandEmailTemplate } from "../../../../lib/email";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/notifications/resort-status
 * Notify resort owner when their resort is approved or rejected
 * 
 * Body: {
 *   resortId: string,
 *   status: "approved" | "rejected",
 *   reason?: string (for rejections)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resortId, status, reason } = body;

    if (!resortId || !status) {
      return NextResponse.json(
        { error: "Missing resortId or status" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Use service role to access owner info
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get resort and owner info
    const { data: resort, error: resortError } = await supabaseAdmin
      .from("resorts")
      .select(`
        id,
        slug,
        name,
        location,
        owner_id,
        owner:profiles!resorts_owner_id_fkey(id, email, full_name)
      `)
      .eq("id", resortId)
      .single();

    if (resortError || !resort) {
      console.error("[resort-status] Resort not found:", resortError);
      return NextResponse.json(
        { error: "Resort not found" },
        { status: 404 }
      );
    }

    const owner = resort.owner as any;
    if (!owner?.email) {
      console.error("[resort-status] Owner email not found for resort:", resortId);
      return NextResponse.json(
        { error: "Owner email not found" },
        { status: 404 }
      );
    }

    const ownerEmail = owner.email;
    const ownerName = owner.full_name || "Resort Owner";
    const resortName = resort.name;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://resortifyph.com";
    const publicResortPath = `/resorts/${(resort as any).slug || resortId}`

    // Create in-app notification for the owner
    const notificationData = {
      user_id: owner.id,
      type: status === "approved" ? "resort_approved" : "resort_rejected",
      title: status === "approved" 
        ? `🎉 Your resort "${resortName}" has been approved!`
        : `❌ Your resort "${resortName}" was not approved`,
      body: status === "approved"
        ? `Congratulations! Your resort is now live and visible to guests. Start receiving bookings today!`
        : `Unfortunately, your resort submission was not approved.${reason ? ` Reason: ${reason}` : ' Please review and resubmit.'}`,
      link: status === "approved" 
        ? publicResortPath
        : `/owner/my-resorts`,
    };

    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert(notificationData);

    if (notifError) {
      console.warn("[resort-status] Failed to create notification:", notifError);
    }

    // Send email notification
    let emailResult = null;

    if (status === "approved") {
      const subject = `🎉 Your resort "${resortName}" has been approved!`;
      const html = brandEmailTemplate({
        title: "Resort Approved!",
        intro: `Great news, ${ownerName}! Your resort "${resortName}" has been reviewed and approved by our team. Your resort is now live and visible to all guests on ResortifyPH!`,
        rows: [
          { label: "Resort", value: resortName },
          { label: "Status", value: "✅ Approved & Live" },
          { label: "Next Steps", value: "Set pricing, add photos, respond to bookings" },
        ],
        cta: { label: "View Your Resort", href: `${siteUrl}${publicResortPath}` },
        footer: "Keep your availability calendar updated to receive more bookings!",
        type: "booking",
      });
      const text = `Great news! Your resort "${resortName}" has been approved and is now live on ResortifyPH. View it at: ${siteUrl}${publicResortPath}`;

      emailResult = await sendEmail({ to: ownerEmail, subject, html, text });
    } else {
      const subject = `Update on your resort "${resortName}" submission`;
      const html = brandEmailTemplate({
        title: "Resort Submission Update",
        intro: `Hi ${ownerName}, we've reviewed your resort "${resortName}" submission. Unfortunately, we were unable to approve your resort at this time.${reason ? ` Reason: ${reason}` : ""} Please update your listing and resubmit.`,
        rows: [
          { label: "Resort", value: resortName },
          { label: "Status", value: "❌ Not Approved" },
          ...(reason ? [{ label: "Reason", value: reason }] : []),
        ],
        cta: { label: "Edit Your Resort", href: `${siteUrl}/owner/my-resorts` },
        footer: "Common issues: incomplete photos, missing contact info, or inaccurate details. Our team is here to help!",
        type: "booking",
      });
      const text = `Your resort "${resortName}" submission was not approved.${reason ? ` Reason: ${reason}` : ""} Please review and resubmit at: ${siteUrl}/owner/my-resorts`;

      emailResult = await sendEmail({ to: ownerEmail, subject, html, text });
    }

    console.log(`[resort-status] Notification sent for resort ${resortId} (${status}) to ${ownerEmail}`);

    return NextResponse.json({
      success: true,
      status,
      notificationCreated: !notifError,
      emailSent: !!emailResult?.data?.id,
    });
  } catch (err: any) {
    console.error("[resort-status] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

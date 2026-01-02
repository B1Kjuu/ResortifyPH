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
      resortName,
      ownerName,
      ownerEmail,
      ownerId,
      location,
      price,
    } = await req.json();

    // Security: Ensure ownerId matches authenticated user (prevent spoofing)
    if (ownerId && ownerId !== authUser.id) {
      return NextResponse.json({ error: "Owner mismatch" }, { status: 403 })
    }

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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || "";
    const approvalsLink = siteUrl ? `${siteUrl}/admin/approvals` : "/admin/approvals";
    const html = brandEmailTemplate({
      title: 'New Resort Submission',
      intro: 'A new resort has been submitted and awaits approval.',
      rows: [
        { label: 'Resort', value: resortName },
        ...(location ? [{ label: 'Location', value: location }] : []),
        ...(price ? [{ label: 'Base price', value: `₱${Number(price).toLocaleString()}` }] : []),
        { label: 'Owner', value: ownerName || ownerEmail },
      ],
      cta: { label: 'Open Approvals', href: approvalsLink },
    });
    const text = `New resort submitted: ${resortName}\nOwner: ${ownerName || ownerEmail}\nApprovals: ${approvalsLink}`;

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
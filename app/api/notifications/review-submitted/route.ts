import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "lib/email";
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
      rating,
      comment,
      link,
      userId,
    } = await req.json();

    // Security: Ensure userId matches authenticated user (prevent spoofing)
    if (userId && userId !== authUser.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 })
    }

    if (!to || !resortName || !rating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const subject = `New review for ${resortName}`;
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.6;">
        <h2>New review received</h2>
        <p><strong>Resort:</strong> ${resortName}</p>
        <p><strong>Rating:</strong> ${rating} / 5</p>
        ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ""}
        ${link ? `<p><a href="${link}">View review</a></p>` : ""}
      </div>
    `;
    const text = `New review for ${resortName}. Rating: ${rating}/5${
      comment ? `\nComment: ${comment}` : ""
    }${link ? `\nView: ${link}` : ""}`;

    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
    let res: any = null;
    if (!dryRun) {
      res = await sendEmail({ to, subject, html, text });
    }

    // Optional: log notification in Supabase if service role is configured
    try {
      const sb = getServerSupabaseOrNull();
      if (sb) {
        await sb.from("notifications").insert({
          user_id: userId ?? null,
          type: "review_submitted",
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
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, brandEmailTemplate } from "@/lib/email";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

/**
 * POST /api/notifications/review-posted
 * Notify resort owner when a guest posts a review
 * 
 * Body: {
 *   reviewId: string,
 *   resortId: string,
 *   rating: number,
 *   title?: string,
 *   content: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Security: Verify the user is authenticated
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json();
    const { reviewId, resortId, rating, title, content } = body;

    if (!reviewId || !resortId || !rating || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use service role to access resort and owner info
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get resort and owner info
    const { data: resort, error: resortError } = await supabaseAdmin
      .from("resorts")
      .select(`
        id,
        slug,
        name,
        owner_id,
        owner:profiles!resorts_owner_id_fkey(id, email, full_name)
      `)
      .eq("id", resortId)
      .single();

    if (resortError || !resort) {
      console.error("[review-posted] Resort not found:", resortError);
      return NextResponse.json(
        { error: "Resort not found" },
        { status: 404 }
      );
    }

    const owner = resort.owner as any;
    if (!owner?.email) {
      console.error("[review-posted] Owner email not found for resort:", resortId);
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
      type: "review_posted",
      title: `New Review: ${rating} ★`,
      body: title
        ? `"${title}" — Check out your new ${rating}-star review!`
        : `A guest left you a ${rating}-star review for ${resortName}!`,
      link: `${publicResortPath}#reviews`,
    };

    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert(notificationData);

    if (notifError) {
      console.warn("[review-posted] Failed to create notification:", notifError);
    }

    // Send email notification
    const stars = "⭐".repeat(rating);
    const subject = `${stars} New ${rating}-star review for "${resortName}"`;
    const html = brandEmailTemplate({
      title: `New ${rating}-Star Review!`,
      intro: `Great news, ${ownerName}! A guest just reviewed "${resortName}".`,
      rows: [
        { label: "Resort", value: resortName },
        { label: "Rating", value: `${stars} (${rating}/5)` },
        ...(title ? [{ label: "Title", value: title }] : []),
        { label: "Review", value: content.substring(0, 200) + (content.length > 200 ? "..." : "") },
      ],
      cta: { label: "View Review", href: `${siteUrl}${publicResortPath}#reviews` },
      footer: "Keep up the great work! Positive reviews help attract more guests.",
      type: "booking",
    });
    const text = `New ${rating}-star review for "${resortName}".\n${title ? `Title: ${title}\n` : ""}Review: ${content}\n\nView: ${siteUrl}${publicResortPath}#reviews`;

    const emailResult = await sendEmail({ to: ownerEmail, subject, html, text });

    console.log(`[review-posted] Notification sent for review ${reviewId} to ${ownerEmail}`);

    return NextResponse.json({
      success: true,
      notificationCreated: !notifError,
      emailSent: !!emailResult?.data?.id,
    });
  } catch (err: any) {
    console.error("[review-posted] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

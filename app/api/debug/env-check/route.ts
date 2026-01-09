import { NextResponse } from "next/server";

/**
 * Debug endpoint to check if environment variables are set
 * REMOVE THIS AFTER DEBUGGING
 */
export async function GET() {
  const envCheck = {
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    NOTIFY_FROM_EMAIL: process.env.NOTIFY_FROM_EMAIL || "NOT SET",
    NOTIFY_REPLY_TO: process.env.NOTIFY_REPLY_TO || "NOT SET",
    ADMIN_NOTIFY_EMAILS: process.env.ADMIN_NOTIFY_EMAILS || "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json(envCheck);
}

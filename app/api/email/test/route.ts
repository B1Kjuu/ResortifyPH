import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "lib/email";

export async function POST(req: NextRequest) {
  try {
    const enabled = process.env.EMAIL_TEST_ENABLED === "true";
    if (!enabled) {
      return NextResponse.json(
        { error: "Email test route disabled" },
        { status: 403 }
      );
    }
    const { to, subject, html, text, from } = await req.json();
    const res = await sendEmail({
      to,
      subject: subject ?? "ResortifyPH test",
      html: html ?? "<p>Hello from ResortifyPH</p>",
      text,
      fromOverride: from,
    });

    return NextResponse.json({ id: (res as any)?.data?.id ?? null, ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Send failed" }, { status: 500 });
  }
}
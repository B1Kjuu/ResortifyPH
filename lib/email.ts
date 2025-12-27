import { Resend } from "resend";

type EmailPayload = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  fromOverride?: string;
};

export async function sendEmail(payload: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL;
  const replyTo = process.env.NOTIFY_REPLY_TO;

  if (!apiKey) throw new Error("RESEND_API_KEY is missing");
  if (!from) throw new Error("NOTIFY_FROM_EMAIL is missing");

  const resend = new Resend(apiKey);

  const { to, subject, html, text, cc, bcc, fromOverride } = payload;

  const response = await resend.emails.send({
    from: fromOverride ?? from,
    to,
    subject,
    html,
    text,
    cc,
    bcc,
    replyTo: replyTo,
  } as any);
  if ((response as any)?.error) {
    const message = (response as any)?.error?.message ?? "Resend send failed";
    throw new Error(message);
  }
  return response;
}

export async function sendBookingEmail(
  to: string | string[],
  kind: "created" | "approved" | "rejected",
  data: { resortName: string; dateFrom: string; dateTo: string; link?: string }
) {
  const subjectMap = {
    created: `New booking request for ${data.resortName}`,
    approved: `Your booking was approved – ${data.resortName}`,
    rejected: `Your booking was rejected – ${data.resortName}`,
  } as const;

  const html = `
    <div style="font-family:system-ui, -apple-system, Segoe UI, Roboto;">
      <h2>${subjectMap[kind]}</h2>
      <p>Dates: ${data.dateFrom} → ${data.dateTo}</p>
      ${data.link ? `<p><a href="${data.link}">View booking</a></p>` : ""}
      <p>Thanks,<br/>ResortifyPH</p>
    </div>
  `;

  return sendEmail({ to, subject: subjectMap[kind], html });
}
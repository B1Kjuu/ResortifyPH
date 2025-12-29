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

  const html = brandEmailTemplate({
    title: subjectMap[kind],
    intro: kind === 'created'
      ? 'A guest requested to book your resort.'
      : kind === 'approved'
      ? 'Great news! Your booking was approved.'
      : 'Sorry, your booking was rejected.',
    rows: [
      { label: 'Resort', value: data.resortName },
      { label: 'Dates', value: `${data.dateFrom} → ${data.dateTo}` },
    ],
    cta: data.link ? { label: kind === 'created' ? 'Open Booking Chat' : 'View Booking', href: data.link } : undefined,
  })

  return sendEmail({ to, subject: subjectMap[kind], html });
}

export function brandEmailTemplate(opts: {
  title: string;
  intro?: string;
  rows?: { label: string; value: string }[];
  cta?: { label: string; href: string };
}) {
  const { title, intro, rows = [], cta } = opts;
  const brandColor = '#0ea5e9'; // resort-500-ish
  const textMuted = '#64748b';
  const border = '#e2e8f0';
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#f8fafc;padding:24px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid ${border};border-radius:12px;overflow:hidden;">
      <tr>
        <td style="background:${brandColor};padding:16px 20px;color:#fff;">
          <h1 style="margin:0;font-size:18px;">ResortifyPH</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 20px 8px 20px;">
          <h2 style="margin:0 0 8px 0;font-size:18px;color:#0f172a;">${title}</h2>
          ${intro ? `<p style="margin:0 0 12px 0;color:${textMuted};font-size:14px;">${intro}</p>` : ''}
          ${rows.length ? `
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;">
              ${rows.map(r => `
                <tr>
                  <td style="padding:8px 0;color:${textMuted};font-size:12px;width:120px;">${r.label}</td>
                  <td style="padding:8px 0;color:#0f172a;font-size:14px;">${r.value}</td>
                </tr>
              `).join('')}
            </table>
          ` : ''}
          ${cta ? `
            <div style="margin-top:16px;">
              <a href="${cta.href}" style="display:inline-block;background:${brandColor};color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;font-size:14px;">${cta.label}</a>
            </div>
          ` : ''}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;color:${textMuted};font-size:12px;border-top:1px solid ${border};">
          <div>Thanks,<br/>ResortifyPH</div>
          <div style="margin-top:6px;">Need help? Reply to this email.</div>
        </td>
      </tr>
    </table>
  </div>`
}
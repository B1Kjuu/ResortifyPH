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

  if (!apiKey) {
    console.error("❌ Email Error: RESEND_API_KEY is missing");
    throw new Error("RESEND_API_KEY is missing");
  }
  if (!from) {
    console.error("❌ Email Error: NOTIFY_FROM_EMAIL is missing");
    throw new Error("NOTIFY_FROM_EMAIL is missing");
  }

  const resend = new Resend(apiKey);

  const { to, subject, html, text, cc, bcc, fromOverride } = payload;

  console.log(`📧 Sending email to: ${Array.isArray(to) ? to.join(', ') : to} | Subject: ${subject}`);

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
    console.error("❌ Email Send Failed:", message, response);
    throw new Error(message);
  }
  
  console.log("✅ Email sent successfully:", (response as any)?.data?.id);
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

  const introMap = {
    created: 'You have a new booking request! A guest wants to stay at your resort.',
    approved: '🎉 Great news! Your booking has been approved by the host.',
    rejected: 'Unfortunately, your booking request was not approved this time.',
  };

  const html = brandEmailTemplate({
    title: subjectMap[kind],
    intro: introMap[kind],
    rows: [
      { label: 'Resort', value: data.resortName },
      { label: 'Dates', value: `${data.dateFrom} → ${data.dateTo}` },
    ],
    cta: data.link ? { label: kind === 'created' ? 'Review Booking' : 'View Details', href: data.link } : undefined,
    type: 'booking',
  })

  return sendEmail({ to, subject: subjectMap[kind], html });
}

export function brandEmailTemplate(opts: {
  title: string;
  intro?: string;
  rows?: { label: string; value: string }[];
  cta?: { label: string; href: string };
  footer?: string;
  type?: 'notification' | 'auth' | 'booking';
}) {
  const { title, intro, rows = [], cta, footer, type = 'notification' } = opts;
  const brandColor = '#10b981'; // resort-500 emerald
  const brandColorDark = '#059669'; // resort-600
  const textDark = '#0f172a';
  const textMuted = '#64748b';
  const textLight = '#94a3b8';
  const border = '#e2e8f0';
  const bgLight = '#f8fafc';
  const bgWhite = '#ffffff';

  // Icon based on type
  const iconMap: Record<string, string> = {
    notification: '🔔',
    auth: '🔐',
    booking: '🏝️',
  };
  const icon = iconMap[type] || '🔔';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;background:${bgLight};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bgLight};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding-bottom:24px;" align="center">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background:linear-gradient(135deg,${brandColor},${brandColorDark});padding:12px 20px;border-radius:12px;">
                    <span style="color:${bgWhite};font-size:20px;font-weight:700;letter-spacing:-0.5px;">🏖️ ResortifyPH</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bgWhite};border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);overflow:hidden;">
                
                <!-- Accent Bar -->
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,${brandColor},${brandColorDark});"></td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:32px 28px;">
                    
                    <!-- Icon & Title -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <span style="font-size:28px;margin-right:8px;">${icon}</span>
                          <span style="font-size:20px;font-weight:700;color:${textDark};vertical-align:middle;">${title}</span>
                        </td>
                      </tr>
                    </table>

                    ${intro ? `
                    <!-- Intro Text -->
                    <p style="margin:16px 0 0 0;font-size:15px;line-height:1.6;color:${textMuted};">${intro}</p>
                    ` : ''}

                    ${rows.length ? `
                    <!-- Details Table -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;background:${bgLight};border-radius:12px;overflow:hidden;">
                      ${rows.map((r, i) => `
                      <tr>
                        <td style="padding:14px 16px;color:${textMuted};font-size:13px;font-weight:500;width:120px;${i > 0 ? `border-top:1px solid ${border};` : ''}">${r.label}</td>
                        <td style="padding:14px 16px;color:${textDark};font-size:14px;font-weight:600;${i > 0 ? `border-top:1px solid ${border};` : ''}">${r.value}</td>
                      </tr>
                      `).join('')}
                    </table>
                    ` : ''}

                    ${cta ? `
                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;">
                      <tr>
                        <td align="center">
                          <a href="${cta.href}" style="display:inline-block;background:linear-gradient(135deg,${brandColor},${brandColorDark});color:${bgWhite};text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 14px 0 rgba(16,185,129,0.35);">${cta.label}</a>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 16px 0 16px;" align="center">
              <p style="margin:0;font-size:13px;color:${textLight};">
                ${footer || 'Need help? Just reply to this email — we\'re here for you!'}
              </p>
              <p style="margin:12px 0 0 0;font-size:12px;color:${textLight};">
                © ${new Date().getFullYear()} ResortifyPH · Your Gateway to Philippine Paradise
              </p>
              <p style="margin:8px 0 0 0;">
                <a href="https://resortifyph.com" style="color:${brandColor};text-decoration:none;font-size:12px;font-weight:500;">resortifyph.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Auth email template for password reset and email verification
 * Configure these in Supabase Dashboard > Authentication > Email Templates
 * Copy the HTML below for each template type
 */
export function getAuthEmailTemplate(type: 'reset_password' | 'confirm_signup' | 'magic_link') {
  const brandColor = '#10b981';
  const brandColorDark = '#059669';
  const textDark = '#0f172a';
  const textMuted = '#64748b';
  const textLight = '#94a3b8';
  const border = '#e2e8f0';
  const bgLight = '#f8fafc';
  const bgWhite = '#ffffff';

  const templates: Record<string, { title: string; icon: string; intro: string; buttonText: string; note: string }> = {
    reset_password: {
      title: 'Reset Your Password',
      icon: '🔐',
      intro: 'We received a request to reset your password. Click the button below to create a new password. If you didn\'t request this, you can safely ignore this email.',
      buttonText: 'Reset Password',
      note: 'This link will expire in 1 hour for security reasons.',
    },
    confirm_signup: {
      title: 'Verify Your Email',
      icon: '✉️',
      intro: 'Welcome to ResortifyPH! Please verify your email address to complete your registration and start exploring amazing resorts across the Philippines.',
      buttonText: 'Verify Email Address',
      note: 'If you didn\'t create an account, you can ignore this email.',
    },
    magic_link: {
      title: 'Sign In to ResortifyPH',
      icon: '✨',
      intro: 'Click the button below to sign in to your ResortifyPH account. This is a secure, one-time link.',
      buttonText: 'Sign In',
      note: 'This link will expire in 10 minutes for security reasons.',
    },
  };

  const t = templates[type];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;background:${bgLight};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bgLight};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding-bottom:24px;" align="center">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background:linear-gradient(135deg,${brandColor},${brandColorDark});padding:12px 20px;border-radius:12px;">
                    <span style="color:${bgWhite};font-size:20px;font-weight:700;letter-spacing:-0.5px;">🏖️ ResortifyPH</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bgWhite};border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);overflow:hidden;">
                
                <!-- Accent Bar -->
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,${brandColor},${brandColorDark});"></td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:36px 32px;text-align:center;">
                    
                    <!-- Icon -->
                    <div style="font-size:48px;margin-bottom:16px;">${t.icon}</div>
                    
                    <!-- Title -->
                    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:${textDark};">${t.title}</h1>
                    
                    <!-- Intro Text -->
                    <p style="margin:0 0 28px 0;font-size:15px;line-height:1.7;color:${textMuted};">${t.intro}</p>

                    <!-- CTA Button -->
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,${brandColor},${brandColorDark});color:${bgWhite};text-decoration:none;padding:16px 36px;border-radius:10px;font-weight:600;font-size:16px;box-shadow:0 4px 14px 0 rgba(16,185,129,0.35);">${t.buttonText}</a>

                    <!-- Note -->
                    <p style="margin:28px 0 0 0;font-size:13px;color:${textLight};">${t.note}</p>

                  </td>
                </tr>

                <!-- Security Notice -->
                <tr>
                  <td style="padding:20px 32px;background:${bgLight};border-top:1px solid ${border};">
                    <p style="margin:0;font-size:12px;color:${textLight};text-align:center;">
                      🔒 This is a secure email from ResortifyPH. Never share this link with anyone.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 16px 0 16px;" align="center">
              <p style="margin:0;font-size:13px;color:${textLight};">
                Need help? Just reply to this email — we're here for you!
              </p>
              <p style="margin:12px 0 0 0;font-size:12px;color:${textLight};">
                © ${new Date().getFullYear()} ResortifyPH · Your Gateway to Philippine Paradise
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
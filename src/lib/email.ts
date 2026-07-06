import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set')
}

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = `CookReels <${process.env.EMAIL_FROM ?? 'noreply@cookreels.com'}>`
const REPORT_ALERT_EMAIL = 'arsh@bldsindia.com'

function buildOtpEmailHtml(firstName: string, otp: string): string {
  const digits = otp.split('').join('&nbsp;&nbsp;')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Verify your CookReels account</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Brand header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:24px;font-weight:800;color:#F5C518;letter-spacing:-0.5px;">CookReels</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#1c1c1e;border-radius:20px;border:1px solid #2d2d30;overflow:hidden;">

              <!-- Yellow accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,transparent,#F5C518 40%,#FF9F1C 60%,transparent);"></td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 36px 28px;">

                    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Verify Your Email</h1>
                    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
                      Hi ${firstName},<br/>
                      Welcome to CookReels! Enter the code below to verify your email address and activate your account.
                    </p>

                    <!-- OTP display box -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background:#27272a;border-radius:14px;border:1px solid #3f3f46;padding:24px 16px;">
                          <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#F5C518;font-family:'Courier New',Courier,monospace;line-height:1;">
                            ${digits}
                          </div>
                          <div style="margin-top:12px;font-size:12px;color:#71717a;">
                            This code expires in <strong style="color:#a1a1aa;">10 minutes</strong>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:24px 0 0;font-size:12px;color:#52525b;line-height:1.6;">
                      If you didn&apos;t create a CookReels account, you can safely ignore this email. No action is required.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2d2d30;">
                <tr>
                  <td style="padding:16px 36px 24px;">
                    <p style="margin:0;font-size:11px;color:#52525b;text-align:center;">
                      &copy; ${new Date().getFullYear()} CookReels &middot; Your culinary journey starts here
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildPasswordResetEmailHtml(firstName: string, otp: string): string {
  const digits = otp.split('').join('&nbsp;&nbsp;')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Reset your CookReels password</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Brand header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:24px;font-weight:800;color:#F5C518;letter-spacing:-0.5px;">CookReels</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#1c1c1e;border-radius:20px;border:1px solid #2d2d30;overflow:hidden;">

              <!-- Yellow accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,transparent,#F5C518 40%,#FF9F1C 60%,transparent);"></td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 36px 28px;">

                    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Reset Your Password</h1>
                    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
                      Hello ${firstName},<br/>
                      We received a request to reset your CookReels password. Enter the code below to continue.
                    </p>

                    <!-- OTP display box -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background:#27272a;border-radius:14px;border:1px solid #3f3f46;padding:24px 16px;">
                          <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#F5C518;font-family:'Courier New',Courier,monospace;line-height:1;">
                            ${digits}
                          </div>
                          <div style="margin-top:12px;font-size:12px;color:#71717a;">
                            This code expires in <strong style="color:#a1a1aa;">10 minutes</strong>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:24px 0 0;font-size:12px;color:#52525b;line-height:1.6;">
                      If you did not request a password reset, you can safely ignore this email. No action is required.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2d2d30;">
                <tr>
                  <td style="padding:16px 36px 24px;">
                    <p style="margin:0;font-size:11px;color:#52525b;text-align:center;">
                      &copy; ${new Date().getFullYear()} CookReels &middot; Your culinary journey starts here
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  otp: string,
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your CookReels account',
    html: buildOtpEmailHtml(firstName, otp),
    text: `Hi ${firstName},\n\nYour CookReels verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create this account, you can safely ignore this email.\n\nThanks,\nCookReels Team`,
  })
  if (error) throw new Error(`Failed to send verification email: ${error.message}`)
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  otp: string,
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset Your CookReels Password',
    html: buildPasswordResetEmailHtml(firstName, otp),
    text: `Hello ${firstName},\n\nWe received a request to reset your CookReels password.\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request a password reset, you can safely ignore this email.\n\nThanks,\nCookReels Team`,
  })
  if (error) throw new Error(`Failed to send password reset email: ${error.message}`)
}

function buildSetPasswordEmailHtml(firstName: string, otp: string): string {
  const digits = otp.split('').join('&nbsp;&nbsp;')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Set your CookReels password</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Brand header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:24px;font-weight:800;color:#F5C518;letter-spacing:-0.5px;">CookReels</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#1c1c1e;border-radius:20px;border:1px solid #2d2d30;overflow:hidden;">

              <!-- Yellow accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,transparent,#F5C518 40%,#FF9F1C 60%,transparent);"></td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 36px 28px;">

                    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Set Your Password</h1>
                    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
                      Hello ${firstName},<br/>
                      You requested to add a password to your CookReels account. Enter the code below to confirm your email and continue.
                    </p>

                    <!-- OTP display box -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background:#27272a;border-radius:14px;border:1px solid #3f3f46;padding:24px 16px;">
                          <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#F5C518;font-family:'Courier New',Courier,monospace;line-height:1;">
                            ${digits}
                          </div>
                          <div style="margin-top:12px;font-size:12px;color:#71717a;">
                            This code expires in <strong style="color:#a1a1aa;">10 minutes</strong>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:24px 0 0;font-size:12px;color:#52525b;line-height:1.6;">
                      If you did not request this, you can safely ignore this email. No action is required.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2d2d30;">
                <tr>
                  <td style="padding:16px 36px 24px;">
                    <p style="margin:0;font-size:11px;color:#52525b;text-align:center;">
                      &copy; ${new Date().getFullYear()} CookReels &middot; Your culinary journey starts here
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendSetPasswordEmail(
  email: string,
  firstName: string,
  otp: string,
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Set Your CookReels Password',
    html: buildSetPasswordEmailHtml(firstName, otp),
    text: `Hello ${firstName},\n\nYou requested to add a password to your CookReels account.\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, you can safely ignore this email.\n\nThanks,\nCookReels Team`,
  })
  if (error) throw new Error(`Failed to send set-password email: ${error.message}`)
}

function buildAdminLoginOtpEmailHtml(name: string, otp: string): string {
  const digits = otp.split('').join('&nbsp;&nbsp;')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>CookReels Admin sign-in code</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Brand header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:24px;font-weight:800;color:#F5C518;letter-spacing:-0.5px;">CookReels Admin</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#1c1c1e;border-radius:20px;border:1px solid #2d2d30;overflow:hidden;">

              <!-- Yellow accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,transparent,#F5C518 40%,#FF9F1C 60%,transparent);"></td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 36px 28px;">

                    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Sign-In Verification</h1>
                    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
                      Hi ${name},<br/>
                      Someone (hopefully you) is signing in to the CookReels Admin Dashboard. Enter the code below to continue.
                    </p>

                    <!-- OTP display box -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background:#27272a;border-radius:14px;border:1px solid #3f3f46;padding:24px 16px;">
                          <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#F5C518;font-family:'Courier New',Courier,monospace;line-height:1;">
                            ${digits}
                          </div>
                          <div style="margin-top:12px;font-size:12px;color:#71717a;">
                            This code expires in <strong style="color:#a1a1aa;">10 minutes</strong>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:24px 0 0;font-size:12px;color:#52525b;line-height:1.6;">
                      If you didn&apos;t attempt to sign in, change your admin password immediately and contact a Super Admin.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2d2d30;">
                <tr>
                  <td style="padding:16px 36px 24px;">
                    <p style="margin:0;font-size:11px;color:#52525b;text-align:center;">
                      &copy; ${new Date().getFullYear()} CookReels &middot; Admin security notice
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendAdminLoginOtpEmail(
  email: string,
  name: string,
  otp: string,
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Your CookReels Admin sign-in code',
    html: buildAdminLoginOtpEmailHtml(name, otp),
    text: `Hi ${name},\n\nYour CookReels Admin sign-in code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't attempt to sign in, change your admin password immediately and contact a Super Admin.\n\nThanks,\nCookReels Team`,
  })
  if (error) throw new Error(`Failed to send admin login OTP email: ${error.message}`)
}

// ─── Report notification ──────────────────────────────────────────────────────

export interface ReportNotificationData {
  reportId:    string
  type:        string
  reason:      string
  description: string | null
  createdAt:   Date
  reporter: {
    id:       string
    name:     string
    username: string
    email:    string
  }
  target: {
    label:          string
    id:             string
    summary:        string
    link?:          string
    ownerName?:     string
    ownerUsername?: string
    ownerEmail?:    string
    parentLabel?:   string
    parentLink?:    string
  }
  totalReportsForTarget: number
  autoBanned:            boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildReportEmailHtml(data: ReportNotificationData): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 12px;font-size:12px;color:#71717a;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;font-size:13px;color:#f5f5f5;">${value}</td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>New report on CookReels</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:24px;font-weight:800;color:#F5C518;letter-spacing:-0.5px;">CookReels</span>
            </td>
          </tr>

          <tr>
            <td style="background-color:#1c1c1e;border-radius:20px;border:1px solid #2d2d30;overflow:hidden;">

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,transparent,#F5C518 40%,#FF9F1C 60%,transparent);"></td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 32px 8px;">
                    <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#ffffff;">New Report Submitted</h1>
                    <p style="margin:0 0 20px;font-size:13px;color:#a1a1aa;">
                      ${escapeHtml(data.target.label)} reported for <strong style="color:#F5C518;">${escapeHtml(data.reason)}</strong>
                      ${data.autoBanned ? '<span style="color:#f87171;font-weight:700;"> — AUTO-BANNED</span>' : ''}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#27272a;border-radius:14px;border:1px solid #3f3f46;">
                      ${row('Report ID', escapeHtml(data.reportId))}
                      ${row('Type', escapeHtml(data.type))}
                      ${row('Reason', escapeHtml(data.reason))}
                      ${row('Submitted', escapeHtml(data.createdAt.toISOString()))}
                      ${data.description ? row('Description', escapeHtml(data.description)) : ''}
                      ${row('Total reports on this target', String(data.totalReportsForTarget))}

                      ${row('Reporter', `${escapeHtml(data.reporter.name)} (@${escapeHtml(data.reporter.username)})<br/><span style="color:#a1a1aa;">${escapeHtml(data.reporter.email)}</span>`)}

                      ${row('Reported item', `${escapeHtml(data.target.label)} &middot; <code style="color:#a1a1aa;">${escapeHtml(data.target.id)}</code>`)}
                      ${row('Content', escapeHtml(data.target.summary))}
                      ${data.target.parentLabel ? row('Belongs to', data.target.parentLink
                          ? `<a href="${data.target.parentLink}" style="color:#F5C518;">${escapeHtml(data.target.parentLabel)}</a>`
                          : escapeHtml(data.target.parentLabel)) : ''}
                      ${data.target.ownerName ? row('Content owner', `${escapeHtml(data.target.ownerName)}${data.target.ownerUsername ? ` (@${escapeHtml(data.target.ownerUsername)})` : ''}${data.target.ownerEmail ? `<br/><span style="color:#a1a1aa;">${escapeHtml(data.target.ownerEmail)}</span>` : ''}`) : ''}
                      ${data.target.link ? row('Link', `<a href="${data.target.link}" style="color:#F5C518;">${escapeHtml(data.target.link)}</a>`) : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2d2d30;">
                <tr>
                  <td style="padding:16px 32px 24px;">
                    <p style="margin:0;font-size:11px;color:#52525b;text-align:center;">
                      &copy; ${new Date().getFullYear()} CookReels &middot; Automated moderation alert
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildReportEmailText(data: ReportNotificationData): string {
  const lines = [
    `New report submitted on CookReels`,
    ``,
    `Report ID: ${data.reportId}`,
    `Type: ${data.type}`,
    `Reason: ${data.reason}`,
    `Submitted: ${data.createdAt.toISOString()}`,
    data.description ? `Description: ${data.description}` : null,
    `Total reports on this target: ${data.totalReportsForTarget}`,
    data.autoBanned ? `AUTO-BANNED: yes` : null,
    ``,
    `Reporter: ${data.reporter.name} (@${data.reporter.username}) <${data.reporter.email}>`,
    ``,
    `Reported item: ${data.target.label} (${data.target.id})`,
    `Content: ${data.target.summary}`,
    data.target.parentLabel ? `Belongs to: ${data.target.parentLabel}${data.target.parentLink ? ` — ${data.target.parentLink}` : ''}` : null,
    data.target.ownerName ? `Content owner: ${data.target.ownerName}${data.target.ownerUsername ? ` (@${data.target.ownerUsername})` : ''}${data.target.ownerEmail ? ` <${data.target.ownerEmail}>` : ''}` : null,
    data.target.link ? `Link: ${data.target.link}` : null,
  ]
  return lines.filter((l): l is string => l !== null).join('\n')
}

export async function sendReportNotificationEmail(data: ReportNotificationData): Promise<void> {
  const { error } = await resend.emails.send({
    from:    FROM,
    to:      REPORT_ALERT_EMAIL,
    subject: `[Report] ${data.target.label} reported for ${data.reason}`,
    html:    buildReportEmailHtml(data),
    text:    buildReportEmailText(data),
  })
  if (error) throw new Error(`Failed to send report notification email: ${error.message}`)
}

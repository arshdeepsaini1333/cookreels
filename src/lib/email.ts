import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

function buildOtpEmailHtml(firstName: string, otp: string): string {
  // Split OTP into individual digits for spaced display
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

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  otp: string,
): Promise<void> {
  const transporter = createTransporter()
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? '"CookReels" <noreply@cookreels.com>',
    to: email,
    subject: 'Reset Your CookReels Password',
    html: buildPasswordResetEmailHtml(firstName, otp),
    text: `Hello ${firstName},\n\nWe received a request to reset your CookReels password.\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request a password reset, you can safely ignore this email.\n\nThanks,\nCookReels Team`,
  })
}

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  otp: string,
): Promise<void> {
  const transporter = createTransporter()
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? '"CookReels" <noreply@cookreels.com>',
    to: email,
    subject: 'Verify your CookReels account',
    html: buildOtpEmailHtml(firstName, otp),
    text: `Hi ${firstName},\n\nYour CookReels verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create this account, you can safely ignore this email.\n\nThanks,\nCookReels Team`,
  })
}

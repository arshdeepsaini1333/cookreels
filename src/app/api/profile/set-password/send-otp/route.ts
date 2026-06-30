import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { generateOTP, getOtpExpiry, OTP_RESEND_COOLDOWN_SECONDS } from '@/lib/otp'
import { sendSetPasswordEmail } from '@/lib/email'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { email } = body as { email?: string }

  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { email: true, password: true, firstName: true, passwordResetOTPCreatedAt: true },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (user.password) {
    return NextResponse.json(
      { error: 'Your account already has a password. Use Change Password instead.' },
      { status: 400 },
    )
  }

  if (email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'Email does not match your Google account email' },
      { status: 400 },
    )
  }

  if (user.passwordResetOTPCreatedAt) {
    const secondsSinceLast = (Date.now() - user.passwordResetOTPCreatedAt.getTime()) / 1000
    if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast)
      return NextResponse.json(
        { error: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new code.` },
        { status: 429 },
      )
    }
  }

  const otp = generateOTP()

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      passwordResetOTP:          otp,
      passwordResetOTPExpiresAt: getOtpExpiry(),
      passwordResetOTPCreatedAt: new Date(),
      passwordResetOTPAttempts:  0,
      passwordResetVerified:     false,
    },
  })

  await sendSetPasswordEmail(user.email, user.firstName, otp)

  return NextResponse.json({ message: 'Verification code sent.' })
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP, getOtpExpiry, OTP_RESEND_COOLDOWN_SECONDS } from '@/lib/otp'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json(
        { message: 'No account exists with this email address.' },
        { status: 404 },
      )
    }

    // Rate limit resend requests
    if (user.passwordResetOTPCreatedAt) {
      const secondsSinceLast = (Date.now() - user.passwordResetOTPCreatedAt.getTime()) / 1000
      if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast)
        return NextResponse.json(
          { message: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new code.` },
          { status: 429 },
        )
      }
    }

    const otp = generateOTP()

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetOTP: otp,
        passwordResetOTPExpiresAt: getOtpExpiry(),
        passwordResetOTPCreatedAt: new Date(),
        passwordResetOTPAttempts: 0,
        passwordResetVerified: false,
      },
    })

    await sendPasswordResetEmail(user.email, user.firstName, otp)

    return NextResponse.json({ message: 'Verification code sent.' }, { status: 200 })
  } catch (error) {
    console.error('[forgot-password]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP, getOtpExpiry, OTP_RESEND_COOLDOWN_SECONDS } from '@/lib/otp'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 })
    }

    if (user.isActive) {
      return NextResponse.json(
        { message: 'This account is already verified' },
        { status: 400 },
      )
    }

    // Rate limit: enforce cooldown between resend requests
    if (user.otpCreatedAt) {
      const secondsSinceLast = (Date.now() - user.otpCreatedAt.getTime()) / 1000
      if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast)
        return NextResponse.json(
          { message: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new code.` },
          { status: 429 },
        )
      }
    }

    const otp = generateOTP()
    const now = new Date()

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationOTP: otp,
        otpExpiresAt: getOtpExpiry(),
        otpCreatedAt: now,
        otpAttempts: 0,
      },
    })

    await sendVerificationEmail(user.email, user.firstName, otp)

    return NextResponse.json({ message: 'A new verification code has been sent.' }, { status: 200 })
  } catch (error) {
    console.error('[resend-otp]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP, getOtpExpiry, OTP_RESEND_COOLDOWN_SECONDS } from '@/lib/otp'
import { sendAdminLoginOtpEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 })
    }

    const admin = await prisma.admin.findUnique({ where: { email } })

    if (!admin) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 })
    }

    if (!admin.isActive) {
      return NextResponse.json(
        { message: 'This admin account has been deactivated.' },
        { status: 403 },
      )
    }

    // Rate limit: enforce cooldown between resend requests
    if (admin.loginOtpCreatedAt) {
      const secondsSinceLast = (Date.now() - admin.loginOtpCreatedAt.getTime()) / 1000
      if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast)
        return NextResponse.json(
          { message: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new code.` },
          { status: 429 },
        )
      }
    }

    const otp = generateOTP()

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        loginOtp: otp,
        loginOtpExpiresAt: getOtpExpiry(),
        loginOtpCreatedAt: new Date(),
        loginOtpAttempts: 0,
      },
    })

    await sendAdminLoginOtpEmail(admin.email, admin.name, otp)

    return NextResponse.json({ message: 'A new verification code has been sent.' }, { status: 200 })
  } catch (error) {
    console.error('[admin resend-otp]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

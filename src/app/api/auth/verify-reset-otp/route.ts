import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OTP_MAX_ATTEMPTS } from '@/lib/otp'

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return NextResponse.json({ message: 'Email and OTP are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 })
    }

    if (user.passwordResetOTPAttempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json(
        { message: 'Too many incorrect attempts. Please request a new code.' },
        { status: 429 },
      )
    }

    if (!user.passwordResetOTP || !user.passwordResetOTPExpiresAt) {
      return NextResponse.json(
        { message: 'No reset code found. Please request a new one.' },
        { status: 400 },
      )
    }

    if (new Date() > user.passwordResetOTPExpiresAt) {
      return NextResponse.json(
        { message: 'Your verification code has expired. Please request a new one.' },
        { status: 400 },
      )
    }

    if (otp.trim() !== user.passwordResetOTP) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetOTPAttempts: { increment: 1 } },
      })

      const remaining = OTP_MAX_ATTEMPTS - (user.passwordResetOTPAttempts + 1)
      return NextResponse.json(
        {
          message:
            remaining > 0
              ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
              : 'Too many incorrect attempts. Please request a new code.',
        },
        { status: 400 },
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetVerified: true,
        passwordResetOTPAttempts: 0,
      },
    })

    return NextResponse.json({ message: 'Code verified.' }, { status: 200 })
  } catch (error) {
    console.error('[verify-reset-otp]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

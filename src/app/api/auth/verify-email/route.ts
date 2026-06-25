import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'
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

    // Already verified — create session and return success
    if (user.isActive) {
      await createSession(user.id, user.username)
      return NextResponse.json({ message: 'Account already verified' }, { status: 200 })
    }

    // Brute-force guard: too many failed attempts
    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json(
        { message: 'Too many incorrect attempts. Please request a new verification code.' },
        { status: 429 },
      )
    }

    if (!user.emailVerificationOTP || !user.otpExpiresAt) {
      return NextResponse.json(
        { message: 'No verification code found. Please request a new one.' },
        { status: 400 },
      )
    }

    // Check expiry first so the error message is accurate
    if (new Date() > user.otpExpiresAt) {
      return NextResponse.json(
        { message: 'This code has expired. Please request a new one.' },
        { status: 400 },
      )
    }

    // Compare OTP
    if (otp.trim() !== user.emailVerificationOTP) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } },
      })

      const remaining = OTP_MAX_ATTEMPTS - (user.otpAttempts + 1)
      return NextResponse.json(
        {
          message:
            remaining > 0
              ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
              : 'Too many incorrect attempts. Please request a new verification code.',
        },
        { status: 400 },
      )
    }

    // OTP is correct — activate account and clear OTP fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        isEmailVerified: true,
        emailVerificationOTP: null,
        otpExpiresAt: null,
        otpCreatedAt: null,
        otpAttempts: 0,
      },
    })

    await createSession(user.id, user.username)

    return NextResponse.json({ message: 'Email verified successfully' }, { status: 200 })
  } catch (error) {
    console.error('[verify-email]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { OTP_MAX_ATTEMPTS } from '@/lib/otp'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { otp } = body as { otp?: string }

  if (!otp) return NextResponse.json({ error: 'Verification code is required' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: {
      password:                  true,
      passwordResetOTP:          true,
      passwordResetOTPExpiresAt: true,
      passwordResetOTPAttempts:  true,
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (user.password) {
    return NextResponse.json({ error: 'Account already has a password' }, { status: 400 })
  }

  if (user.passwordResetOTPAttempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Too many incorrect attempts. Please request a new code.' },
      { status: 429 },
    )
  }

  if (!user.passwordResetOTP || !user.passwordResetOTPExpiresAt) {
    return NextResponse.json(
      { error: 'No code found. Please request a new one.' },
      { status: 400 },
    )
  }

  if (new Date() > user.passwordResetOTPExpiresAt) {
    return NextResponse.json(
      { error: 'Your code has expired. Please request a new one.' },
      { status: 400 },
    )
  }

  if (otp.trim() !== user.passwordResetOTP) {
    await prisma.user.update({
      where: { id: session.userId },
      data:  { passwordResetOTPAttempts: { increment: 1 } },
    })
    const remaining = OTP_MAX_ATTEMPTS - (user.passwordResetOTPAttempts + 1)
    return NextResponse.json({
      error: remaining > 0
        ? `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Too many incorrect attempts. Please request a new code.',
    }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.userId },
    data:  { passwordResetVerified: true, passwordResetOTPAttempts: 0 },
  })

  return NextResponse.json({ message: 'Code verified.' })
}

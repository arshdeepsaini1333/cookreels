import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OTP_MAX_ATTEMPTS } from '@/lib/otp'
import { createAdminSession } from '@/lib/admin/session'

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return NextResponse.json({ message: 'Email and OTP are required' }, { status: 400 })
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

    // Brute-force guard: too many failed attempts
    if (admin.loginOtpAttempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json(
        { message: 'Too many incorrect attempts. Please sign in again to request a new code.' },
        { status: 429 },
      )
    }

    if (!admin.loginOtp || !admin.loginOtpExpiresAt) {
      return NextResponse.json(
        { message: 'No verification code found. Please sign in again.' },
        { status: 400 },
      )
    }

    // Check expiry first so the error message is accurate
    if (new Date() > admin.loginOtpExpiresAt) {
      return NextResponse.json(
        { message: 'This code has expired. Please request a new one.' },
        { status: 400 },
      )
    }

    if (otp.trim() !== admin.loginOtp) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { loginOtpAttempts: { increment: 1 } },
      })

      const remaining = OTP_MAX_ATTEMPTS - (admin.loginOtpAttempts + 1)
      return NextResponse.json(
        {
          message:
            remaining > 0
              ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
              : 'Too many incorrect attempts. Please sign in again to request a new code.',
        },
        { status: 400 },
      )
    }

    // OTP correct — clear it, create the session, and record the login
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        lastLogin: new Date(),
        loginOtp: null,
        loginOtpExpiresAt: null,
        loginOtpCreatedAt: null,
        loginOtpAttempts: 0,
      },
    })

    await createAdminSession(admin.id, admin.name, admin.email, admin.role)

    return NextResponse.json({ message: 'Login successful' }, { status: 200 })
  } catch (error) {
    console.error('[admin verify-otp]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

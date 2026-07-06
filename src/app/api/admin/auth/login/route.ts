import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { generateOTP, getOtpExpiry } from '@/lib/otp'
import { sendAdminLoginOtpEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const admin = await prisma.admin.findUnique({ where: { email } })

    if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
      return NextResponse.json(
        { message: 'Invalid credentials. Please try again.' },
        { status: 401 },
      )
    }

    if (!admin.isActive) {
      return NextResponse.json(
        { message: 'This admin account has been deactivated.' },
        { status: 403 },
      )
    }

    // Password is correct, but the session isn't created yet — a valid OTP is
    // required first. See /api/admin/auth/verify-otp for the second factor.
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

    return NextResponse.json(
      { requiresOtp: true, email: admin.email, message: 'We sent a verification code to your email.' },
      { status: 200 },
    )
  } catch (error) {
    console.error('[admin login]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { generateOTP, getOtpExpiry } from '@/lib/otp'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { firstName, lastName, username, email, phone, password } = await req.json()

    if (!email || !password || !username || !firstName || !lastName) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const existingByUsername = await prisma.user.findUnique({ where: { username } })
    if (existingByUsername) {
      return NextResponse.json(
        { message: 'An account with this username already exists' },
        { status: 400 },
      )
    }

    // Check phone uniqueness before hitting the DB constraint
    if (phone) {
      const existingByPhone = await prisma.user.findUnique({ where: { phone } })
      if (existingByPhone) {
        return NextResponse.json(
          { message: 'An account with this phone number already exists' },
          { status: 400 },
        )
      }
    }

    const existingByEmail = await prisma.user.findUnique({ where: { email } })

    if (existingByEmail) {
      // CASE 2: Active account with this email already exists
      if (existingByEmail.isActive) {
        // Distinguish Google-only accounts from password accounts
        if (existingByEmail.googleId && !existingByEmail.password) {
          return NextResponse.json(
            { message: 'This email is already registered with Google Sign-In. Please continue with Google.' },
            { status: 400 },
          )
        }
        if (existingByEmail.facebookId && !existingByEmail.password) {
          return NextResponse.json(
            { message: 'This email is already registered with Facebook. Please continue with Facebook.' },
            { status: 400 },
          )
        }
        return NextResponse.json(
          { message: 'This email is already registered. Please log in instead.' },
          { status: 400 },
        )
      }

      // CASE 3: Email exists but account is not yet verified — resend OTP
      const otp = generateOTP()
      const now = new Date()

      await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          emailVerificationOTP: otp,
          otpExpiresAt: getOtpExpiry(),
          otpCreatedAt: now,
          otpAttempts: 0,
        },
      })

      await sendVerificationEmail(email, existingByEmail.firstName, otp)

      return NextResponse.json(
        {
          requiresVerification: true,
          email,
          message: 'This email is already registered but not verified. We\'ve sent you a new verification code.',
        },
        { status: 200 },
      )
    }

    // CASE 1: Brand-new signup
    const hashedPassword = await bcrypt.hash(password, 10)
    const otp = generateOTP()
    const now = new Date()

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        username,
        email,
        phone,
        password: hashedPassword,
        isActive: false,
        emailVerificationOTP: otp,
        otpExpiresAt: getOtpExpiry(),
        otpCreatedAt: now,
        otpAttempts: 0,
      },
    })

    await sendVerificationEmail(user.email, user.firstName, otp)

    return NextResponse.json(
      {
        requiresVerification: true,
        email,
        message: 'Account created! Please check your email for the verification code.',
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    // Prisma unique constraint violation (P2002) — surface a readable message
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      const fields = (error as { meta?: { target?: string[] } }).meta?.target ?? []
      const field = fields[0] ?? 'field'
      return NextResponse.json(
        { message: `An account with this ${field} already exists` },
        { status: 400 },
      )
    }
    console.error('[signup]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { createSession } from '@/lib/session'
import { generateOTP, getOtpExpiry } from '@/lib/otp'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json()

    if (!identifier || !password) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials. Please try again.' },
        { status: 401 },
      )
    }

    // Account was created via Google/Facebook and has no password
    if (!user.password) {
      if (user.googleId) {
        return NextResponse.json(
          { message: 'This account uses Google Sign-In. Please continue with Google.' },
          { status: 401 },
        )
      }
      if (user.facebookId) {
        return NextResponse.json(
          { message: 'This account uses Facebook Sign-In. Please continue with Facebook.' },
          { status: 401 },
        )
      }
      return NextResponse.json(
        { message: 'Invalid credentials. Please try again.' },
        { status: 401 },
      )
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return NextResponse.json(
        { message: 'Invalid credentials. Please try again.' },
        { status: 401 },
      )
    }

    // CASE 4: Password correct but email not yet verified — generate fresh OTP and gate login
    if (!user.isActive) {
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

      return NextResponse.json(
        {
          requiresVerification: true,
          email: user.email,
          message: "Your email address hasn't been verified yet. We've sent a new verification code to your email.",
        },
        { status: 403 },
      )
    }

    await createSession(user.id, user.username)

    return NextResponse.json({ message: 'Login successful' }, { status: 200 })
  } catch (error) {
    console.error('[login]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

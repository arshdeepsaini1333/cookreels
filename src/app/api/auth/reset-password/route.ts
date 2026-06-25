import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character.'
  return null
}

export async function POST(req: Request) {
  try {
    const { email, newPassword, confirmPassword } = await req.json()

    if (!email || !newPassword || !confirmPassword) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ message: 'Passwords do not match.' }, { status: 400 })
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 })
    }

    if (!user.passwordResetVerified) {
      return NextResponse.json(
        { message: 'OTP verification required before resetting password.' },
        { status: 403 },
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetOTP: null,
        passwordResetOTPExpiresAt: null,
        passwordResetOTPCreatedAt: null,
        passwordResetOTPAttempts: 0,
        passwordResetVerified: false,
      },
    })

    return NextResponse.json({ message: 'Password reset successfully.' }, { status: 200 })
  } catch (error) {
    console.error('[reset-password]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

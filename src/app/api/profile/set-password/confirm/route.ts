import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

function validatePassword(password: string): string | null {
  if (password.length < 8)            return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password))        return 'Password must contain at least one uppercase letter.'
  if (!/[a-z]/.test(password))        return 'Password must contain at least one lowercase letter.'
  if (!/[0-9]/.test(password))        return 'Password must contain at least one number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character.'
  return null
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { newPassword, confirmPassword } = body as { newPassword?: string; confirmPassword?: string }

  if (!newPassword || !confirmPassword) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
  }

  const passwordError = validatePassword(newPassword)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { password: true, passwordResetVerified: true },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (user.password) {
    return NextResponse.json(
      { error: 'Account already has a password. Use Change Password instead.' },
      { status: 400 },
    )
  }

  if (!user.passwordResetVerified) {
    return NextResponse.json(
      { error: 'Email verification required before setting a password.' },
      { status: 403 },
    )
  }

  const hashed = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      password:                  hashed,
      passwordResetOTP:          null,
      passwordResetOTPExpiresAt: null,
      passwordResetOTPCreatedAt: null,
      passwordResetOTPAttempts:  0,
      passwordResetVerified:     false,
    },
  })

  return NextResponse.json({ message: 'Password set successfully.' })
}

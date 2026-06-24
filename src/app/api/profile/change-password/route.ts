import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string }

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { password: true },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Google-only accounts have no password
  if (!user.password) {
    return NextResponse.json({ error: 'This account uses Google Sign-In and has no password to change' }, { status: 400 })
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password)
  if (!isMatch) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: 'New password must differ from your current password' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: session.userId },
    data:  { password: hashed },
  })

  return NextResponse.json({ message: 'Password updated successfully' })
}

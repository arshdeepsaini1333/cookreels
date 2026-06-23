import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { createSession } from '@/lib/session'

export async function POST(req: Request) {
  try {
    const { firstName, lastName, username, email, phone, password } = await req.json()

    if (!email || !password || !username) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })

    if (existingUser) {
      // CASE 2: email is registered via Google only — no password on that account
      if (existingUser.email === email && existingUser.googleId && !existingUser.password) {
        return NextResponse.json(
          { message: 'This email is already registered with Google Sign-In. Please continue with Google.' },
          { status: 400 },
        )
      }
      const field = existingUser.email === email ? 'email' : 'username'
      return NextResponse.json(
        { message: `An account with this ${field} already exists` },
        { status: 400 },
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { firstName, lastName, username, email, phone, password: hashedPassword },
    })

    await createSession(user.id, user.username)

    return NextResponse.json({ message: 'Account created successfully' }, { status: 201 })
  } catch (error) {
    console.error('[signup]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
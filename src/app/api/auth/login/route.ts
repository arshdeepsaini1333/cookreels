import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { createSession } from '@/lib/session'

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

    // CASE 4: account was created via Google and has no password
    if (!user.password) {
      return NextResponse.json(
        { message: 'This account uses Google Sign-In. Please continue with Google.' },
        { status: 401 },
      )
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return NextResponse.json(
        { message: 'Invalid credentials. Please try again.' },
        { status: 401 },
      )
    }

    await createSession(user.id, user.username)

    return NextResponse.json({ message: 'Login successful' }, { status: 200 })
  } catch (error) {
    console.error('[login]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
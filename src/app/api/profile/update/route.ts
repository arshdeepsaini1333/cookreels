import { NextResponse } from 'next/server'
import { getSession, createSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')?.trim().toLowerCase()

  if (!username) return NextResponse.json({ available: false }, { status: 400 })

  const existing = await prisma.user.findFirst({
    where: { username, NOT: { id: session.userId } },
    select: { id: true },
  })

  return NextResponse.json({ available: !existing })
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { name, username, bio, level } = body as { name?: string; username?: string; bio?: string; level?: string }

  const data: {
    firstName?: string
    lastName?: string
    username?: string
    bio?: string | null
    level?: string
  } = {}

  if (typeof name === 'string') {
    const parts = name.trim().split(/\s+/)
    data.firstName = parts[0] ?? ''
    data.lastName  = parts.slice(1).join(' ') || ''
  }

  if (typeof username === 'string') {
    const cleaned = username.trim().toLowerCase()
    if (!cleaned) return NextResponse.json({ error: 'Username cannot be empty' }, { status: 400 })

    const existing = await prisma.user.findFirst({
      where: { username: cleaned, NOT: { id: session.userId } },
      select: { id: true },
    })
    if (existing) return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })

    data.username = cleaned
  }

  if (typeof bio === 'string') {
    data.bio = bio.trim() || null
  }

  if (typeof level === 'string' && level.trim()) {
    data.level = level.trim()
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where:  { id: session.userId },
    data,
    select: { firstName: true, lastName: true, username: true, bio: true, level: true },
  })

  // The session cookie carries a signed `username` claim (used by DashboardLayout,
  // notification sender fields, etc.) — re-sign it so it doesn't go stale after a rename.
  if (data.username) {
    await createSession(session.userId, updated.username)
  }

  return NextResponse.json({
    name:     `${updated.firstName} ${updated.lastName}`.trim(),
    username: updated.username,
    bio:      updated.bio,
    level:    updated.level,
  })
}

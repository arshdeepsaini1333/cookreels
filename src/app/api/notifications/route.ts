import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

const LIMIT = 10

const notifSelect = {
  id: true,
  type: true,
  isRead: true,
  createdAt: true,
  text: true,
  body: true,
  sender: { select: { id: true, username: true, profileImage: true } },
  recipe: { select: { id: true, title: true, coverImage: true } },
  reel: { select: { id: true, title: true, thumbnailUrl: true } },
} as const

function serialize(n: {
  id: string
  type: string
  isRead: boolean
  createdAt: Date
  text: string | null
  body: string | null
  sender: { id: string; username: string; profileImage: string | null }
  recipe: { id: string; title: string; coverImage: string | null } | null
  reel: { id: string; title: string; thumbnailUrl: string | null } | null
}) {
  return { ...n, createdAt: n.createdAt.toISOString() }
}

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor') ?? undefined

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: LIMIT + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: notifSelect,
    }),
    prisma.notification.count({
      where: { recipientId: session.userId, isRead: false },
    }),
  ])

  const hasMore = notifications.length > LIMIT
  const items = hasMore ? notifications.slice(0, LIMIT) : notifications

  return NextResponse.json({
    notifications: items.map(serialize),
    unreadCount,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  })
}
